import { unstable_noStore } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { updateSellerOrderStatus } from "@/actions/seller";

const STATUS_STEPS = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusDescription(status: string) {
  switch (status) {
    case "PENDING":
      return "Waiting for confirmation.";

    case "CONFIRMED":
      return "Order has been confirmed.";

    case "PROCESSING":
      return "Products are being prepared.";

    case "SHIPPED":
      return "Order has been shipped.";

    case "DELIVERED":
      return "Order has been delivered.";

    case "CANCELLED":
      return "This order has been cancelled.";

    case "REFUNDED":
      return "This order has been refunded.";

    default:
      return "Order status updated.";
  }
}

function getPaymentLabel(status: string) {
  switch (status) {
    case "PAID":
      return "Paid";

    case "PENDING":
      return "Pending";

    case "FAILED":
      return "Failed";

    case "REFUNDED":
      return "Refunded";

    default:
      return formatStatus(status);
  }
}

export default async function SellerOrderDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  unstable_noStore();

  const { id } = await params;  

  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (
    user.role !== "SELLER" ||
    !user.seller ||
    user.seller.status !== "APPROVED"
  ) {
    redirect("/seller/dashboard");
  }

  const order = await prisma.sellerOrder.findFirst({
    where: {
      id,
      sellerId: user.seller.id,
    },

    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,

          subtotal: true,
          shippingAmount: true,
          discountAmount: true,
          taxAmount: true,
          totalAmount: true,
          currency: true,

          user: {
            select: {
              name: true,
              email: true,
            },
          },

          payment: {
            select: {
              provider: true,
              transactionId: true,
              amount: true,
              currency: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          orderTimeline: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },

      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const currentStatus = order.status;

  const currentStepIndex = STATUS_STEPS.indexOf(
    currentStatus as (typeof STATUS_STEPS)[number]
  );

  const isCancelled =
    currentStatus === "CANCELLED";

  const isRefunded =
    currentStatus === "REFUNDED";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
      {/* -------------------------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------------------------- */}

      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Seller Order
          </p>

          <h1 className="mt-2 text-4xl font-black">
            #{order.order.orderNumber}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Placed on{" "}
            {new Date(
              order.order.createdAt
            ).toLocaleDateString()}
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white">
          {formatStatus(currentStatus)}
        </span>
      </div>

      {/* -------------------------------------------------- */}
      {/* STATUS TIMELINE */}
      {/* -------------------------------------------------- */}

      <section className="mt-8 rounded-3xl border bg-white p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black">
            Order progress
          </h2>

          <p className="text-sm text-slate-500">
            {getStatusDescription(currentStatus)}
          </p>
        </div>

        {isCancelled || isRefunded ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                !
              </div>

              <div>
                <p className="font-black">
                  {formatStatus(currentStatus)}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {getStatusDescription(currentStatus)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="flex min-w-[650px] items-start">
              {STATUS_STEPS.map(
                (step, index) => {
                  const completed =
                    currentStepIndex >= index;

                  const isCurrent =
                    currentStatus === step;

                  return (
                    <div
                      key={step}
                      className="flex flex-1 items-start"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${completed
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-400"
                            }`}
                        >
                          {completed
                            ? "✓"
                            : index + 1}
                        </div>

                        <p
                          className={`mt-3 text-center text-xs font-bold ${isCurrent
                            ? "text-slate-950"
                            : "text-slate-500"
                            }`}
                        >
                          {formatStatus(step)}
                        </p>
                      </div>

                      {index <
                        STATUS_STEPS.length - 1 && (
                          <div
                            className={`mt-5 h-1 flex-1 ${currentStepIndex >
                              index
                              ? "bg-slate-950"
                              : "bg-slate-100"
                              }`}
                          />
                        )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </section>

      {/* -------------------------------------------------- */}
      {/* MAIN CONTENT */}
      {/* -------------------------------------------------- */}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-6">
          {/* PRODUCTS */}

          <section className="rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-black">
              Products
            </h2>

            <div className="mt-5 divide-y">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-5 py-5"
                >
                  <div className="min-w-0">
                    <p className="font-bold">
                      {item.productName}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      SKU: {item.sku}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Quantity: {item.quantity}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Unit price:{" "}
                      {money(item.unitPrice)}
                    </p>
                  </div>

                  <p className="shrink-0 font-black">
                    {money(item.totalPrice)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* TIMELINE */}

          <section className="rounded-3xl border bg-white p-6">
            <h2 className="text-xl font-black">
              Order timeline
            </h2>

            <div className="mt-6 space-y-6">
              {order.order.orderTimeline.length ===
                0 ? (
                <p className="text-sm text-slate-500">
                  No timeline events yet.
                </p>
              ) : (
                order.order.orderTimeline.map(
                  (event, index) => (
                    <div
                      key={event.id}
                      className="relative flex gap-4"
                    >
                      {index <
                        order.order.orderTimeline
                          .length -
                        1 && (
                          <div className="absolute left-[15px] top-9 h-full w-px bg-slate-200" />
                        )}

                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                        ✓
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-black">
                            {event.title}
                          </p>

                          <p className="text-xs text-slate-400">
                            {new Date(
                              event.createdAt
                            ).toLocaleString()}
                          </p>
                        </div>

                        {event.message && (
                          <p className="mt-1 text-sm text-slate-500">
                            {event.message}
                          </p>
                        )}

                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                          {formatStatus(
                            event.status
                          )}
                        </p>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </section>
        </div>

        {/* RIGHT */}
        <aside className="space-y-6">
          {/* CUSTOMER */}

          <section className="rounded-3xl border bg-white p-6">
            <h2 className="font-black">
              Customer
            </h2>

            <p className="mt-3 font-bold">
              {order.order.user.name}
            </p>

            <p className="mt-1 break-all text-sm text-slate-500">
              {order.order.user.email}
            </p>
          </section>

          {/* PAYMENT */}

          <section className="rounded-3xl border bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black">
                Payment
              </h2>

              {order.order.payment && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                  {getPaymentLabel(
                    order.order.payment.status
                  )}
                </span>
              )}
            </div>

            {order.order.payment ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Provider
                  </span>

                  <span className="font-bold">
                    {order.order.payment.provider}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">
                    Amount
                  </span>

                  <span className="font-bold">
                    {money(
                      order.order.payment.amount
                    )}
                  </span>
                </div>

                {order.order.payment
                  .transactionId && (
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">
                        Transaction
                      </span>

                      <span className="max-w-[180px] break-all text-right font-bold">
                        {
                          order.order.payment
                            .transactionId
                        }
                      </span>
                    </div>
                  )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No payment record found.
              </p>
            )}
          </section>

          {/* STATUS UPDATE */}

          <section className="rounded-3xl border bg-white p-6">
            <h2 className="font-black">
              Update Status
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Update the status of your part of this
              order.
            </p>

            <form
              action={updateSellerOrderStatus}
              className="mt-4"
            >
              <input
                type="hidden"
                name="sellerOrderId"
                value={order.id}
              />

              <select
                name="status"
                defaultValue={order.status}
                className="w-full rounded-xl border px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="PENDING">
                  Pending
                </option>

                <option value="CONFIRMED">
                  Confirmed
                </option>

                <option value="PROCESSING">
                  Processing
                </option>

                <option value="SHIPPED">
                  Shipped
                </option>

                <option value="DELIVERED">
                  Delivered
                </option>

                <option value="CANCELLED">
                  Cancelled
                </option>

                <option value="REFUNDED">
                  Refunded
                </option>
              </select>

              <button
                type="submit"
                className="mt-3 w-full rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:bg-slate-800"
              >
                Update Status
              </button>
            </form>
          </section>

          {/* SELLER FINANCIALS */}

          <section className="rounded-3xl bg-slate-950 p-6 text-white">
            <h2 className="font-black">
              Seller earnings
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">
                  Subtotal
                </span>

                <span>
                  {money(order.subtotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">
                  Commission
                </span>

                <span>
                  -{money(order.commission)}
                </span>
              </div>
            </div>

            <div className="my-5 border-t border-slate-700" />

            <div className="flex justify-between gap-4">
              <span className="text-slate-300">
                Your earnings
              </span>

              <span className="text-2xl font-black">
                {money(order.sellerTotal)}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}