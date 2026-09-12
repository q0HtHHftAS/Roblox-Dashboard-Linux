"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: "fa-gauge-high" },
  { href: "/admin/users", label: "Users", icon: "fa-users" },
  { href: "/admin/audit", label: "Audit Log", icon: "fa-clipboard-list" },
  { href: "/admin/settings", label: "Settings", icon: "fa-gear" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-header">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/admin" className="mr-3 flex items-center gap-2 text-sm font-bold text-white">
          <i className="fa-solid fa-shield-halved text-accent"></i>
          Admin Panel
        </Link>
        {LINKS.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? "bg-accent text-white" : "text-zinc-400 hover:bg-surface hover:text-white"
              }`}
            >
              <i className={`fa-solid ${l.icon} mr-1.5`}></i>
              {l.label}
            </Link>
          );
        })}
        <Link
          href="/"
          className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-surface hover:text-white"
        >
          <i className="fa-solid fa-arrow-left mr-1.5"></i>
          Dashboard
        </Link>
      </div>
    </header>
  );
}
