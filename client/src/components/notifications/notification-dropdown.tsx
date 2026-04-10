"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  FileText,
  CreditCard,
  MessageSquare,
  Users,
  Wifi,
  WifiOff,
  AlertTriangle,
  Shield,
  CheckCheck,
  Megaphone,
  Server,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useNotificationStore,
  type Notification,
} from "@/store/notification-store";
import { cn } from "@/lib/utils";

const typeIconMap: Record<string, React.ElementType> = {
  INVOICE_CREATED: FileText,
  INVOICE_OVERDUE: FileText,
  PAYMENT_RECEIVED: CreditCard,
  TICKET_CREATED: MessageSquare,
  TICKET_REPLIED: MessageSquare,
  TICKET_ASSIGNED: MessageSquare,
  TICKET_RESOLVED: MessageSquare,
  CUSTOMER_ACTIVATED: Users,
  CUSTOMER_SUSPENDED: Users,
  CUSTOMER_EXPIRED: Users,
  CUSTOMER_ONLINE: Wifi,
  CUSTOMER_OFFLINE: WifiOff,
  DEVICE_ALERT: AlertTriangle,
  DEVICE_RESOLVED: Server,
  BANDWIDTH_WARNING: AlertTriangle,
  BANDWIDTH_CRITICAL: AlertTriangle,
  ANNOUNCEMENT: Megaphone,
  LOGIN_ALERT: Shield,
  PASSWORD_CHANGE: Shield,
  SECURITY_ALERT: Shield,
  SYSTEM_UPDATE: Server,
};

const typeColorMap: Record<string, string> = {
  INVOICE_CREATED: "text-blue-500 bg-blue-50",
  PAYMENT_RECEIVED: "text-emerald-500 bg-emerald-50",
  TICKET_CREATED: "text-orange-500 bg-orange-50",
  TICKET_REPLIED: "text-orange-500 bg-orange-50",
  TICKET_ASSIGNED: "text-orange-500 bg-orange-50",
  TICKET_RESOLVED: "text-emerald-500 bg-emerald-50",
  CUSTOMER_ACTIVATED: "text-emerald-500 bg-emerald-50",
  CUSTOMER_SUSPENDED: "text-red-500 bg-red-50",
  CUSTOMER_EXPIRED: "text-amber-500 bg-amber-50",
  DEVICE_ALERT: "text-red-500 bg-red-50",
  DEVICE_RESOLVED: "text-emerald-500 bg-emerald-50",
  BANDWIDTH_WARNING: "text-amber-500 bg-amber-50",
  BANDWIDTH_CRITICAL: "text-red-500 bg-red-50",
  SECURITY_ALERT: "text-red-500 bg-red-50",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const Icon = typeIconMap[notification.type] || Bell;
  const colorClass = typeColorMap[notification.type] || "text-slate-500 bg-slate-50";

  return (
    <button
      className={cn(
        "w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors",
        !notification.isRead && "bg-blue-50/40"
      )}
      onClick={() => {
        if (!notification.isRead) onRead(notification.id);
      }}
    >
      <div className={cn("mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-[13px] leading-tight truncate", !notification.isRead ? "font-semibold text-slate-800" : "font-medium text-slate-600")}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
          )}
        </div>
        <p className="text-[12px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

export function NotificationDropdown() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (open && !hasFetched.current) {
      fetchNotifications();
      hasFetched.current = true;
    }
  }, [open, fetchNotifications]);

  const recent = notifications.slice(0, 15);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors outline-none">
        <Bell className="h-[18px] w-[18px] text-slate-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] p-0 max-h-[480px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-800">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            recent.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <button
              className="w-full py-2.5 text-center text-[13px] font-medium text-blue-600 hover:bg-slate-50 transition-colors"
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
            >
              View all notifications
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
