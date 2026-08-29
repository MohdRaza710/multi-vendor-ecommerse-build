import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { placeOrder } from "@/actions/order";

export default async function CheckoutPage() {
    const user = await getCurrentUser();

    // --------------------------------------------------
    // Authentication
    // --------------------------------------------------

    if (!user) {
        return (
            <main className="mx-auto max-w-xl px-4 py-24 text-center">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                        Checkout
                    </p>

                    <h1 className="mt-3 text-3xl font-black text-slate-950">
                        Sign in to checkout
                    </h1>

                    <p className="mt-3 text-sm text-slate-500">
                        Please sign in to continue with your order.
                    </p>

                    <Link
                        href="/auth/login"
                        className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
                    >
                        Sign in
                    </Link>
                </div>
            </main>
        );
    }

    // --------------------------------------------------
    // Get cart
    // --------------------------------------------------

    const cart = await prisma.cart.findUnique({
        where: {
            userId: user.id,
        },
        include: {
            items: {
                include: {
                    product: {
                        include: {
                            seller: {
                                select: {
                                    id: true,
                                    businessName: true,
                                    status: true,
                                },
                            },
                            images: {
                                where: {
                                    isPrimary: true,
                                },
                                take: 1,
                                select: {
                                    url: true,
                                },
                            },
                        },
                    },
                    variant: true,
                },
            },
        },
    });

    const items = cart?.items ?? [];

    // --------------------------------------------------
    // Empty cart
    // --------------------------------------------------

    if (items.length === 0) {
        return (
            <main className="mx-auto max-w-xl px-4 py-24 text-center">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                        Checkout
                    </p>

                    <h1 className="mt-3 text-3xl font-black text-slate-950">
                        Your cart is empty
                    </h1>

                    <p className="mt-3 text-slate-500">
                        Add some products before checking out.
                    </p>

                    <Link
                        href="/products"
                        className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
                    >
                        Continue shopping
                    </Link>
                </div>
            </main>
        );
    }

    // --------------------------------------------------
    // Calculate totals
    // --------------------------------------------------

    const subtotal = items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
    );

    const shipping = 0;
    const tax = 0;
    const discount = 0;

    const total = subtotal + shipping + tax - discount;

    // --------------------------------------------------
    // Render checkout
    // --------------------------------------------------

    return (
        <main className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
            {/* Header */}
            <div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                    Checkout
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                    Complete your order
                </h1>

                <p className="mt-2 text-slate-500">
                    Review your order and complete the checkout process.
                </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
                {/* ==================================================
            LEFT COLUMN
        ================================================== */}

                <div className="space-y-5">
                    {/* --------------------------------------------------
              STEP 1 — CUSTOMER / SHIPPING
          -------------------------------------------------- */}

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">
                                    1
                                </div>

                                <h2 className="text-lg font-black text-slate-950">
                                    Shipping information
                                </h2>
                            </div>

                            <Link
                                href="/profile"
                                className="text-sm font-bold text-slate-600 transition hover:text-slate-950"
                            >
                                Manage
                            </Link>
                        </div>

                        <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                            <p className="font-bold text-slate-950">
                                {user.name}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                {user.email}
                            </p>

                            {user.phone && (
                                <p className="mt-1 text-sm text-slate-500">
                                    {user.phone}
                                </p>
                            )}
                        </div>

                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-bold text-amber-900">
                                Shipping address
                            </p>

                            <p className="mt-1 text-xs leading-5 text-amber-800">
                                Address selection is currently handled through the
                                customer profile. The order system is ready to use
                                an Address record when shipping-address selection is
                                added.
                            </p>
                        </div>
                    </section>

                    {/* --------------------------------------------------
              STEP 2 — PAYMENT
          -------------------------------------------------- */}

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">
                                2
                            </div>

                            <h2 className="text-lg font-black text-slate-950">
                                Payment
                            </h2>
                        </div>

                        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                            <div className="flex items-start gap-4">
                                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                                    $
                                </div>

                                <div>
                                    <p className="font-black text-blue-950">
                                        Mock Payment
                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-blue-800">
                                        This marketplace currently uses a mock payment
                                        provider for development.
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-800">
                                            Provider: MOCK
                                        </span>

                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-800">
                                            Status: PENDING
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl bg-slate-50 p-4">
                            <p className="text-sm font-bold text-slate-950">
                                Real payment integration
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                Later, this section can be connected to Stripe,
                                PayPal, Flutterwave, Paystack, or another payment
                                provider without changing the marketplace order
                                structure.
                            </p>
                        </div>
                    </section>

                    {/* --------------------------------------------------
              STEP 3 — ORDER ITEMS
          -------------------------------------------------- */}

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-black text-white">
                                3
                            </div>

                            <div>
                                <h2 className="text-lg font-black text-slate-950">
                                    Order items
                                </h2>

                                <p className="text-sm text-slate-500">
                                    {items.length}{" "}
                                    {items.length === 1 ? "item" : "items"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 divide-y divide-slate-100">
                            {items.map((item) => {
                                const itemTotal =
                                    Number(item.price) * item.quantity;

                                return (
                                    <div
                                        key={item.id}
                                        className="flex gap-4 py-5 first:pt-0 last:pb-0"
                                    >
                                        {/* Product image */}
                                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                            {item.product.images[0]?.url ? (
                                                <img
                                                    src={item.product.images[0].url}
                                                    alt={item.product.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="grid h-full place-items-center text-xs text-slate-400">
                                                    No image
                                                </div>
                                            )}
                                        </div>

                                        {/* Product details */}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-950">
                                                {item.product.name}
                                            </p>

                                            {item.product.seller && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Sold by{" "}
                                                    <span className="font-semibold">
                                                        {item.product.seller.businessName}
                                                    </span>
                                                </p>
                                            )}

                                            {item.variant && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    SKU: {item.variant.sku}
                                                </p>
                                            )}

                                            <p className="mt-1 text-sm text-slate-500">
                                                Quantity: {item.quantity}
                                            </p>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right">
                                            <p className="font-black text-slate-950">
                                                {money(itemTotal)}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {money(Number(item.price))} each
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* ==================================================
            RIGHT COLUMN — SUMMARY
        ================================================== */}

                <aside className="h-fit lg:sticky lg:top-6">
                    <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
                        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
                            Order summary
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                            Your order
                        </h2>

                        {/* Summary */}
                        <div className="mt-7 space-y-4 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-400">
                                    Subtotal
                                </span>

                                <span className="font-semibold">
                                    {money(subtotal)}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4">
                                <span className="text-slate-400">
                                    Shipping
                                </span>

                                <span className="font-semibold">
                                    {shipping === 0
                                        ? "Free"
                                        : money(shipping)}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4">
                                <span className="text-slate-400">
                                    Tax
                                </span>

                                <span className="font-semibold">
                                    {money(tax)}
                                </span>
                            </div>

                            {discount > 0 && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-400">
                                        Discount
                                    </span>

                                    <span className="font-semibold text-emerald-400">
                                        -{money(discount)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="my-6 border-t border-slate-700" />

                        {/* Total */}
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-sm text-slate-400">
                                    Total
                                </p>

                                <p className="mt-1 text-3xl font-black">
                                    {money(total)}
                                </p>
                            </div>

                            <span className="mb-1 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                                USD
                            </span>
                        </div>

                        {/* Place order */}
                        <form action={placeOrder}>
                            <button
                                type="submit"
                                className="mt-7 w-full rounded-xl bg-white py-3.5 font-black text-slate-950 transition hover:bg-slate-200 active:scale-[0.99]"
                            >
                                Place order
                            </button>
                        </form>

                        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                            Your payment will be recorded as a mock payment
                            with a pending status.
                        </p>
                    </section>

                    {/* Security/info */}
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm">
                                ✓
                            </div>

                            <div>
                                <p className="text-sm font-bold text-slate-950">
                                    Secure checkout
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Your order is processed securely through the
                                    marketplace order system.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/cart"
                        className="mt-4 block text-center text-sm font-bold text-slate-500 transition hover:text-slate-950"
                    >
                        ← Back to cart
                    </Link>
                </aside>
            </div>
        </main>
    );
}