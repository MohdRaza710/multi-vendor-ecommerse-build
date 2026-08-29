import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { updateSellerOrderStatus } from "@/actions/seller";

export default async function SellerOrderDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

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
          orderNumber: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
        Order
      </p>

      <h1 className="mt-2 text-4xl font-black">
        #{order.order.orderNumber}
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border bg-white p-6 lg:col-span-2">
          <h2 className="text-xl font-black">
            Products
          </h2>

          <div className="mt-5 divide-y">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-bold">
                    {item.productName}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    SKU: {item.sku}
                  </p>

                  <p className="text-sm text-slate-500">
                    Quantity: {item.quantity}
                  </p>
                </div>

                <p className="font-black">
                  {money(item.totalPrice)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border bg-white p-6">
            <h2 className="font-black">
              Customer
            </h2>

            <p className="mt-3 font-bold">
              {order.order.user.name}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {order.order.user.email}
            </p>
          </section>

          <section className="rounded-3xl border bg-white p-6">
            <h2 className="font-black">
              Update Status
            </h2>

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
                className="w-full rounded-xl border px-4 py-3"
              >
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                type="submit"
                className="mt-3 w-full rounded-xl bg-slate-950 py-3 font-bold text-white"
              >
                Update Status
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-sm text-slate-400">
              Seller total
            </p>

            <p className="mt-2 text-3xl font-black">
              {money(order.sellerTotal)}
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}