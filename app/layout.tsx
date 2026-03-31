import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import TabNav from "@/components/layout/TabNav";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lithuania Trip 2025",
  description: "Family trip planner for Lithuania summer 2025",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 font-sans antialiased">
        <header className="bg-green-800 text-white py-4 px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-xl font-bold tracking-tight">
              Lithuania Trip 2025
            </h1>
            <p className="text-green-200 text-sm mt-0.5">
              Don, Tova, Jake &amp; Tali &middot; Misha &amp; Sophie &middot;
              Judy, Paul &amp; Raquel
            </p>
          </div>
        </header>
        <TabNav />
        <main className="max-w-5xl mx-auto px-4 py-6 w-full">{children}</main>
      </body>
    </html>
  );
}
