import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-700 text-white font-bold">
            ƒ
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-semibold text-slate-900 group-hover:text-red-700 transition-colors">
              {siteConfig.shortName}
            </span>
            <span className="text-xs text-slate-500">{siteConfig.owner}</span>
          </span>
        </Link>
        <nav className="text-sm">
          <Link
            href="/"
            className="text-slate-600 hover:text-red-700 transition-colors"
          >
            All tasks
          </Link>
        </nav>
      </div>
    </header>
  );
}
