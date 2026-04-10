"use client";

import { Menu, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface HeaderProps {
    onMenuClick: () => void;
}

const roleBadge: Record<string, { bg: string; text: string }> = {
    SUPER_ADMIN: { bg: "bg-purple-100", text: "text-purple-700" },
    ADMIN: { bg: "bg-amber-100", text: "text-amber-700" },
    MANAGER: { bg: "bg-blue-100", text: "text-blue-700" },
    SUPPORT: { bg: "bg-teal-100", text: "text-teal-700" },
    ENGINEER: { bg: "bg-indigo-100", text: "text-indigo-700" },
    FIELD_TECHNICIAN: { bg: "bg-orange-100", text: "text-orange-700" },
    RESELLER: { bg: "bg-emerald-100", text: "text-emerald-700" },
};

export function Header({ onMenuClick }: HeaderProps) {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const router = useRouter();

    const badge = roleBadge[user?.role || ""] || { bg: "bg-slate-100", text: "text-slate-600" };
    const initials = user?.name
        ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "U";

    const handleLogout = () => {
        logout();
        window.location.href = "/login";
    };

    return (
        <header className="h-14 border-b border-slate-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
            {/* Left — mobile menu */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-9 w-9"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5 text-slate-600" />
                </Button>
            </div>

            {/* Right — notifications + user profile dropdown */}
            <div className="flex items-center gap-3">
                <NotificationDropdown />
                <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-colors outline-none">
                        <div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                            {initials}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-[13px] font-medium text-slate-700 leading-tight">
                                {user?.name || "User"}
                            </p>
                            <p className="text-[11px] text-slate-400 leading-tight">
                                {user?.email}
                            </p>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-60">
                        {/* User info */}
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex items-center gap-3 py-1">
                                    <div className="h-10 w-10 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                                        {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">
                                            {user?.name || "User"}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">
                                            {user?.email}
                                        </p>
                                        <Badge
                                            className={cn(
                                                "text-[9px] px-1.5 py-0 h-4 font-bold tracking-wide rounded-[4px] mt-1",
                                                badge.bg,
                                                badge.text,
                                            )}
                                        >
                                            {user?.role?.replace(/_/g, " ") || "USER"}
                                        </Badge>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => router.push("/settings?tab=profile")}>
                                <User className="h-4 w-4 mr-2 text-slate-400" />
                                My Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/settings")}>
                                <Settings className="h-4 w-4 mr-2 text-slate-400" />
                                Settings
                            </DropdownMenuItem>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
