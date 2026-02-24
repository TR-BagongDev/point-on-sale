"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  UtensilsCrossed,
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  ChefHat,
  Clock,
} from "lucide-react";

const menuItems = [
  {
    title: "Kasir / POS",
    href: "/kasir",
    icon: ShoppingCart,
  },
  {
    title: "Menu",
    href: "/menu",
    icon: UtensilsCrossed,
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Shift",
    href: "/shift",
    icon: Clock,
  },
  {
    title: "Laporan",
    href: "/laporan",
    icon: FileText,
  },
  {
    title: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
  },
];

interface SidebarProps {
  userName?: string;
  userRole?: string;
}

export function Sidebar({ userName = "Kasir", userRole = "KASIR" }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-primary-600/50 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
          <ChefHat className="h-6 w-6 text-primary-300" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Warung POS</h1>
          <p className="text-xs text-primary-300">Nasi Goreng</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white text-primary-800 shadow-lg"
                  : "text-primary-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary-600" : "")} />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-primary-600/50 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-500 text-white font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-xs text-primary-300">{userRole}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-primary-300 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
