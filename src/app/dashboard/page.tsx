import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
export default async function Dashboard() {
    const user = await getCurrentUser();

    if (!user) redirect('/auth/login');
    if (user.role === 'SELLER') redirect('/seller/dashboard');
    if (user.role === 'ADMIN') redirect('/admin/dashboard');

    return (
        <main className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">
                Customer
            </p>
            <h1 className="mt-2 text-4xl font-black">Welcome, {user.name}</h1>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
                <Card
                    title="Orders"
                    text="View and track your purchases."
                    href="/orders"
                />
                <Card
                    title="Wishlist"
                    text="Products you saved for later."
                    href="/wishlist"
                />
                <Card
                    title="Profile"
                    text="Manage your account details."
                    href="/profile"
                />
            </div>
        </main>
    );
}

function Card({
    title,
    text,
    href,
}: {
    title: string;
    text: string;
    href: string;
}) {
    return (
        <a
            href={href}
            className="rounded-3xl border bg-white p-6 hover:shadow-lg"
        >
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-2 text-sm text-slate-500">{text}</p>
        </a>
    );
}
