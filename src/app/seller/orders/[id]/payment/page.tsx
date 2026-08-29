import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { processMockPayment } from "@/actions/payment";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      payment: true,
    },
  });

  if (!order) {
    redirect("/orders");
  }

  if (!order.payment) {
    throw new Error("Payment record not found.");
  }

  if (order.payment.status === "PAID") {
    redirect(`/orders/${order.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 lg:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
        Payment
      </p>

      <h1 className="mt-2 text-4xl font-black text-slate-950">
        Complete payment
      </h1>

      <p className="mt-2 text-slate-500">
        Complete your mock payment to confirm the order.
      </p>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b pb-5">
          <div>
            <p className="text-sm text-slate-500">
              Order
            </p>

            <p className="mt-1 font-black text-slate-950">
              {order.orderNumber}
            </p>
          </div>

          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            PAYMENT PENDING
          </span>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex justify-between">
            <span className="text-slate-500">
              Subtotal
            </span>

            <span className="font-bold">
              {money(order.subtotal)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">
              Shipping
            </span>

            <span className="font-bold">
              {money(order.shippingAmount)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">
              Tax
            </span>

            <span className="font-bold">
              {money(order.taxAmount)}
            </span>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between">
              <span className="text-lg font-black">
                Total
              </span>

              <span className="text-2xl font-black">
                {money(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-slate-50 p-5">
          <p className="text-sm font-bold text-slate-950">
            Mock Payment
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            This is a development payment system. No real
            money will be charged.
          </p>

          <form action={processMockPayment}>
            <input
              type="hidden"
              name="orderId"
              value={order.id}
            />

            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:bg-slate-800"
            >
              Pay {money(order.totalAmount)}
            </button>
          </form>
        </div>

        <Link
          href={`/orders/${order.id}`}
          className="mt-4 block text-center text-sm font-bold text-slate-500 hover:text-slate-950"
        >
          Back to order
        </Link>
      </section>
    </main>
  );
}