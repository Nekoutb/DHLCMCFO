import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <SiteHeader />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span>
              {siteConfig.name} · {siteConfig.owner}
            </span>
            <span>Internal use — handle all files per finance policy.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
