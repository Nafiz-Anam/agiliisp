"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Router,
    Package,
    Store,
    FileText,
    HeadphonesIcon,
    Activity,
    X,
    Wifi,
    Server,
    Shield,
    BarChart3,
    DollarSign,
    MapPin,
    Smartphone,
    ClipboardList,
    Network,
    Boxes,
    Truck,
    CreditCard,
    Settings,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    adminOnly?: boolean;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        label: "Overview",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ],
    },
    {
        label: "Support",
        items: [
            { href: "/tickets", label: "Support Tickets", icon: HeadphonesIcon },
            { href: "/announcements", label: "Announcements", icon: Activity },
            { href: "/messaging", label: "Messaging", icon: Smartphone },
        ],
    },
    {
        label: "Subscriber Management",
        items: [
            { href: "/customers", label: "Customers", icon: Users },
            { href: "/resellers", label: "Resellers", icon: Store, adminOnly: true },
            { href: "/resellers/hierarchy", label: "Reseller Hierarchy", icon: Store, adminOnly: true },
            { href: "/resellers/payouts", label: "Reseller Payouts", icon: CreditCard, adminOnly: true },
            { href: "/zones", label: "Zones", icon: MapPin },
        ],
    },
    {
        label: "Network",
        items: [
            { href: "/routers", label: "Routers", icon: Router },
            { href: "/olt", label: "OLT", icon: Server },
            { href: "/subnets", label: "IP Pools", icon: Network },
            { href: "/packages", label: "Packages", icon: Package },
            { href: "/monitoring", label: "Monitoring", icon: Activity },
            {
                href: "/monitoring/traffic",
                label: "Live Bandwidth",
                icon: BarChart3,
            },
            {
                href: "/monitoring/connections",
                label: "Active Connections",
                icon: Wifi,
            },
            {
                href: "/monitoring/topology",
                label: "Network Topology",
                icon: Network,
            },
        ],
    },
    {
        label: "Billing & Finance",
        items: [
            { href: "/invoices", label: "Billing", icon: FileText },
            {
                href: "/mobile-payments",
                label: "Mobile Payments",
                icon: Smartphone,
            },
            { href: "/expenses", label: "Expenses", icon: DollarSign },
        ],
    },
    {
        label: "Inventory",
        items: [
            { href: "/inventory", label: "Inventory", icon: Boxes },
            { href: "/suppliers", label: "Suppliers", icon: Truck },
        ],
    },
    {
        label: "Reports",
        items: [
            { href: "/reports", label: "Reports", icon: BarChart3 },
            { href: "/btrc", label: "BTRC Compliance", icon: ClipboardList },
            { href: "/compliance-logs", label: "Compliance Logs", icon: Shield },
        ],
    },
    {
        label: "Administration",
        items: [
            {
                href: "/users",
                label: "Employees",
                icon: Users,
                adminOnly: true,
            },
            {
                href: "/roles",
                label: "Roles & Permissions",
                icon: Shield,
                adminOnly: true,
            },
        ],
    },
    {
        label: "Settings",
        items: [{ href: "/settings", label: "Settings", icon: Settings }],
    },
];

// Reseller-specific navigation (shown instead of admin nav for RESELLER users)
const resellerNavGroups: NavGroup[] = [
    {
        label: "Overview",
        items: [
            { href: "/reseller-portal", label: "Dashboard", icon: LayoutDashboard },
        ],
    },
    {
        label: "My Business",
        items: [
            { href: "/customers", label: "My Customers", icon: Users },
            { href: "/reseller-portal/sub-resellers", label: "Sub-Resellers", icon: Store },
        ],
    },
    {
        label: "Finance",
        items: [
            { href: "/reseller-portal/commissions", label: "Commissions", icon: DollarSign },
            { href: "/reseller-portal/payouts", label: "Payouts", icon: CreditCard },
            { href: "/invoices", label: "Invoices", icon: FileText },
        ],
    },
    {
        label: "Support",
        items: [
            { href: "/tickets", label: "Support Tickets", icon: HeadphonesIcon },
        ],
    },
    {
        label: "Settings",
        items: [{ href: "/settings", label: "Settings", icon: Settings }],
    },
];

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname();
    const user = useAuthStore((s) => s.user);

    const isAdmin =
        user?.role === "ADMIN" ||
        user?.role === "SUPER_ADMIN" ||
        user?.role === "MANAGER";

    const isReseller = user?.role === "RESELLER";
    const activeNavGroups = isReseller ? resellerNavGroups : navGroups;

    return (
        <aside
            className={cn(
                "flex flex-col h-full w-[260px] bg-white border-r border-slate-200/80",
                "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transition-transform duration-300",
                open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            )}
        >
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <Wifi className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[17px] text-slate-800 tracking-tight">
                        AgiloISP
                    </span>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-8 w-8"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-3 overflow-y-auto">
                {activeNavGroups.map((group) => {
                    const visibleItems = group.items.filter(
                        (item) => !item.adminOnly || isAdmin,
                    );
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={group.label} className="mb-3">
                            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {visibleItems.map((item) => {
                                    // Exact match, or starts-with but only if no sibling route is a better match
                                    const isExact = pathname === item.href;
                                    const isChild = pathname.startsWith(
                                        item.href + "/",
                                    );
                                    const hasBetterMatch =
                                        isChild &&
                                        visibleItems.some(
                                            (other) =>
                                                other.href !== item.href &&
                                                pathname.startsWith(other.href),
                                        );
                                    const isActive =
                                        isExact || (isChild && !hasBetterMatch);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onClose}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                                                isActive
                                                    ? "bg-linear-to-r from-blue-500 to-blue-600 text-white"
                                                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
                                            )}
                                        >
                                            <item.icon
                                                className={cn(
                                                    "h-[18px] w-[18px]",
                                                    isActive
                                                        ? "text-white/90"
                                                        : "text-slate-400",
                                                )}
                                            />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                    Built with ❤️ by <span className="font-semibold text-slate-500">Agilo IT</span>
                </p>
            </div>
        </aside>
    );
}
