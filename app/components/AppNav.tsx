"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/app/components/BrandLogo";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Sets", href: "/sets" },
  { label: "Calendar", href: "/calendar" },
  { label: "Members", href: "/members" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3.5">
        <BrandLogo />

        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/sets" && pathname.startsWith("/sets/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-blue-50 text-[#1D4ED8]"
                    : "text-gray-500 hover:bg-gray-50 hover:text-[#111111]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
