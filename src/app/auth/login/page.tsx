import { loginAction } from "@/actions/auth";
import Link from "next/link";
export default function LoginPage() {
	return (
		<main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md items-center px-4 py-12">
			<div className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
				<p className="text-sm font-bold uppercase tracking-widest text-slate-500">Welcome back</p>
				<h1 className="mt-2 text-3xl font-black">Sign in</h1>
				<form action={loginAction} className="mt-7 space-y-4">
					<label className="block text-sm font-semibold">
						Email
						<input name="email" type="email" required className="mt-2 w-full rounded-xl border px-4 py-3" />
					</label>
					<label className="block text-sm font-semibold">
						Password
						<input name="password" type="password" required className="mt-2 w-full rounded-xl border px-4 py-3" />
					</label>
					<button className="w-full rounded-xl bg-slate-950 py-3 font-bold text-white">Sign in</button>
				</form>
				<p className="mt-5 text-center text-sm text-slate-500">
					No account? <Link className="font-bold text-slate-950" href="/auth/register">Create one</Link>
				</p>
			</div>
		</main>
	);
}
