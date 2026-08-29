import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
	title: {
		default: "MarketHub — Multi-vendor marketplace",
		template: "%s | MarketHub",
	},
	description: "A production-style multi-vendor marketplace.",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={geist.variable}>
			<body className="min-h-screen bg-[#f7f8fa] text-slate-950">
				<Header />
				{children}
			</body>
		</html>
	);
}
