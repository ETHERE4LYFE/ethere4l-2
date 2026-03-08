import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/query-provider";
import Navbar from "@/components/layout/navbar";
import CartDrawer from "@/components/cart/cart-drawer";

export const runtime = 'nodejs';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ETHERE4L",
  description: "ETHERE4L — Enterprise Ecommerce Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-white`}
      >
        <QueryProvider>
          <Navbar />
          <main className="pt-16">
            {children}
          </main>
          <CartDrawer />
        </QueryProvider>
      </body>
    </html>
  );
}
