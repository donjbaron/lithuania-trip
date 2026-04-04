import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import TabNav from "@/components/layout/TabNav";
import HeaderImage from "@/components/layout/HeaderImage";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lithuania Trip 2026",
  description: "Family trip planner for Lithuania summer 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 font-sans antialiased">
        <header className="text-white">
          {/* Lithuanian flag stripes */}
          <div className="flex h-2">
            <div className="flex-1" style={{ backgroundColor: "#FDB913" }} />
            <div className="flex-1" style={{ backgroundColor: "#006A44" }} />
            <div className="flex-1" style={{ backgroundColor: "#C1272D" }} />
          </div>
          <div className="relative px-4 py-3 overflow-hidden" style={{ backgroundColor: "#006A44" }}>
            <HeaderImage />
            <div className="relative max-w-5xl mx-auto flex items-center gap-3">
              {/* Flag icon */}
              <div className="shrink-0 w-8 h-6 sm:w-10 sm:h-7 rounded-sm overflow-hidden shadow border border-white/20 flex flex-col">
                <div className="flex-1" style={{ backgroundColor: "#FDB913" }} />
                <div className="flex-1" style={{ backgroundColor: "#006A44" }} />
                <div className="flex-1" style={{ backgroundColor: "#C1272D" }} />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold tracking-tight">Lithuania Trip 2026</h1>
                <p className="text-green-200 text-xs sm:text-sm mt-0.5 leading-snug">
                  Don, Tova, Jake &amp; Tali &middot; Misha &amp; Sophie &middot; Judy, Paul &amp; Raquel
                </p>
              </div>
            </div>
          </div>
        </header>
        <TabNav />
        <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 w-full">{children}</main>
      </body>
    </html>
  );
}
