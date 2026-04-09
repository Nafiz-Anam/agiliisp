"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, CreditCard, HeadphonesIcon,
  UserCircle, LogOut, X, Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";

const portalNavItems = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/invoices", label: "My Invoices", icon: FileText },
  { href: "/portal/payments", label: "Payment History", icon: CreditCard },
  { href: "/portal/tickets", label: "Support", icon: HeadphonesIcon },
  { href: "/portal/profile", label: "My Profile", icon: UserCircle },
];

interface CustomerSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function CustomerSidebar({ open, onClose }: CustomerSidebarProps) {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <aside
      className={cn(
        "flex flex-col h-full w-[260px] bg-white border-r border-slate-200/80",
        "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
        <Link href="/portal" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Wifi className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-[17px] text-slate-800 tracking-tight">My Account</span>
        </Link>
        <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {portalNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-200",
                isActive
                  ? "bg-linear-to-r from-blue-500 to-blue-600 text-white"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", isActive ? "text-white/90" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100">
        <div className="p-3">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-9 w-9 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-700 truncate">{user?.name || "User"}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 bg-red-50 hover:text-red-600 hover:bg-red-100 shrink-0"
                    onClick={() => { logout(); window.location.href = "/login"; }}
                  />
                }
              >
                <LogOut className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>Sign Out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  );
}
