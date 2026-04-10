"use client";

import { useEffect, useState } from "react";
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
  Server,
  Megaphone,
  CheckCheck,
  Trash2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  useNotificationStore,
  type Notification,
} from "@/store/notification-store";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

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

const typeLabels: Record<string, string> = {
  INVOICE_CREATED: "Invoice",
  INVOICE_OVERDUE: "Invoice Overdue",
  PAYMENT_RECEIVED: "Payment",
  TICKET_CREATED: "Ticket",
  TICKET_REPLIED: "Ticket Reply",
  TICKET_ASSIGNED: "Ticket Assigned",
  TICKET_RESOLVED: "Ticket Resolved",
  CUSTOMER_ACTIVATED: "Customer Active",
  CUSTOMER_SUSPENDED: "Customer Suspended",
  CUSTOMER_EXPIRED: "Customer Expired",
  DEVICE_ALERT: "Device Alert",
  DEVICE_RESOLVED: "Device Resolved",
  BANDWIDTH_WARNING: "Bandwidth Warning",
  BANDWIDTH_CRITICAL: "Bandwidth Critical",
  ANNOUNCEMENT: "Announcement",
  LOGIN_ALERT: "Login Alert",
  PASSWORD_CHANGE: "Password Change",
  SECURITY_ALERT: "Security Alert",
  SYSTEM_UPDATE: "System Update",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

type FilterType = "all" | "unread" | "read";

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchNotifications,
    fetchMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const [filter, setFilter] = useState<FilterType>("all");
  const [deletingRead, setDeletingRead] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  const handleDeleteRead = async () => {
    setDeletingRead(true);
    try {
      await api.delete("/me/notifications/read");
      fetchNotifications();
    } catch {}
    setDeletingRead(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark all read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteRead}
            disabled={deletingRead}
            className="text-xs text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear read
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["all", "unread", "read"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
              filter === f
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {f}
            {f === "unread" && unreadCount > 0 && (
              <Badge className="ml-1.5 h-4 px-1 text-[10px] bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <Card className="divide-y divide-slate-100 overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Filter className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs mt-1">
              {filter === "unread"
                ? "You're all caught up!"
                : "Nothing here yet"}
            </p>
          </div>
        ) : (
          filtered.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </Card>

      {/* Load more */}
      {hasMore && filtered.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = typeIconMap[notification.type] || Bell;
  const colorClass =
    typeColorMap[notification.type] || "text-slate-500 bg-slate-50";
  const label = typeLabels[notification.type] || notification.type;

  return (
    <div
      className={cn(
        "flex items-start gap-3.5 px-4 py-3.5 group transition-colors",
        !notification.isRead && "bg-blue-50/30"
      )}
    >
      <div
        className={cn(
          "mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          colorClass
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "text-sm leading-tight",
              !notification.isRead
                ? "font-semibold text-slate-800"
                : "font-medium text-slate-600"
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
          )}
        </div>
        <p className="text-[13px] text-slate-500 leading-snug mt-0.5">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-medium rounded",
              colorClass
            )}
          >
            {label}
          </Badge>
          <span className="text-[11px] text-slate-400">
            {formatDate(notification.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!notification.isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRead(notification.id)}
            title="Mark as read"
          >
            <CheckCheck className="h-3.5 w-3.5 text-slate-400" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onDelete(notification.id)}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5 text-slate-400" />
        </Button>
      </div>
    </div>
  );
}
