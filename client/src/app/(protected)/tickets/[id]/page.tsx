"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Send, CheckCircle, Clock, XCircle, AlertCircle,
  User, Shield, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { SupportTicket, TicketStatus, TicketPriority } from "@/types";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TicketReply {
  id: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; role: string };
}

interface TicketDetail extends SupportTicket {
  description: string;
  replies: TicketReply[];
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  PENDING_CUSTOMER: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  LOW: "bg-slate-100 text-slate-500",
  MEDIUM: "bg-blue-50 text-blue-600",
  HIGH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const STATUS_TRANSITIONS: { label: string; status: TicketStatus; className: string }[] = [
  { label: "Mark In Progress", status: "IN_PROGRESS", className: "border-amber-200 text-amber-700 hover:bg-amber-50" },
  { label: "Pending Customer", status: "PENDING_CUSTOMER", className: "border-purple-200 text-purple-700 hover:bg-purple-50" },
  { label: "Mark Resolved", status: "RESOLVED", className: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
  { label: "Close Ticket", status: "CLOSED", className: "border-slate-200 text-slate-600 hover:bg-slate-50" },
];

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await api.get(`/isp/tickets/${id}`);
      setTicket(res.data.data);
    } catch {
      toast.error("Ticket not found");
      router.push("/tickets");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  useEffect(() => {
    if (ticket) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.replies?.length]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/isp/tickets/${id}/replies`, { message: reply.trim() });
      setReply("");
      fetchTicket();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/isp/tickets/${id}`, { status });
      toast.success(`Ticket marked as ${status.replace("_", " ").toLowerCase()}`);
      fetchTicket();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 border-2 border-orange-200 border-t-orange-600 rounded-lg animate-spin" />
    </div>
  );

  if (!ticket) return null;

  const isOpen = !["RESOLVED", "CLOSED"].includes(ticket.status);
  const availableTransitions = STATUS_TRANSITIONS.filter((t) => t.status !== ticket.status);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/tickets">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-orange-600 font-semibold">{ticket.ticketNumber}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[ticket.status]}`}>
                {ticket.status.replace("_", " ")}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[ticket.priority]}`}>
                {ticket.priority}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mt-1">{ticket.subject}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {ticket.customer.fullName} ({ticket.customer.username}) · Opened {format(new Date(ticket.openedAt), "MMM d, yyyy 'at' HH:mm")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchTicket} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isOpen && availableTransitions.slice(0, 2).map((t) => (
            <Button
              key={t.status}
              variant="outline"
              size="sm"
              disabled={updatingStatus}
              onClick={() => handleStatusChange(t.status)}
              className={cn("h-9 text-sm", t.className)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Thread */}
        <div className="lg:col-span-3 space-y-3">
          {/* Original message */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-semibold text-orange-600">
                {ticket.customer.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{ticket.customer.fullName}</p>
                <p className="text-[11px] text-slate-400">Customer · {format(new Date(ticket.openedAt), "MMM d, yyyy HH:mm")}</p>
              </div>
              <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">Original</span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
          </div>

          {/* Replies */}
          {ticket.replies.map((r) => {
            const isStaff = ["ADMIN", "MODERATOR", "SUPER_ADMIN"].includes(r.user.role);
            const isMe = r.user.id === currentUser?.id;
            return (
              <div
                key={r.id}
                className={cn(
                  "border rounded-xl p-4",
                  isStaff
                    ? "bg-orange-50/60 border-orange-100"
                    : "bg-white border-slate-200"
                )}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold",
                    isStaff ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"
                  )}>
                    {isStaff ? <Shield className="h-4 w-4" /> : (r.user.name?.charAt(0).toUpperCase() || "U")}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-700">{r.user.name || r.user.email}</p>
                      {isStaff && (
                        <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          {r.user.role}
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">You</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{format(new Date(r.createdAt), "MMM d, yyyy HH:mm")}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{r.message}</p>
              </div>
            );
          })}

          {ticket.replies.length === 0 && (
            <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No replies yet. Be the first to respond.
            </div>
          )}

          <div ref={bottomRef} />

          {/* Reply box */}
          {isOpen ? (
            <form onSubmit={handleSendReply} className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your Reply</p>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply..."
                rows={4}
                className="resize-none mb-3"
                required
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  {sending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4 text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
              This ticket is {ticket.status.toLowerCase().replace("_", " ")} — no new replies can be added.
              {ticket.status === "RESOLVED" && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-orange-500 ml-1"
                  onClick={() => handleStatusChange("OPEN")}
                >
                  Reopen?
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <Card className="border-slate-200/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SidebarRow label="Status">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[ticket.status]}`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </SidebarRow>
              <SidebarRow label="Priority">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              </SidebarRow>
              <SidebarRow label="Assignee" value={ticket.assignee?.name || "Unassigned"} />
              <SidebarRow label="Replies" value={String(ticket.replies.length)} />
              <SidebarRow label="Opened" value={format(new Date(ticket.openedAt), "MMM d, yyyy")} />
              {ticket.resolvedAt && <SidebarRow label="Resolved" value={format(new Date(ticket.resolvedAt), "MMM d, yyyy")} />}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SidebarRow label="Name" value={ticket.customer.fullName} />
              <SidebarRow label="Username" value={ticket.customer.username} />
              <Link href={`/customers/${ticket.customer.id}`}>
                <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-xs">
                  View Customer Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {isOpen && (
            <Card className="border-slate-200/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {availableTransitions.map((t) => (
                  <Button
                    key={t.status}
                    variant="outline"
                    size="sm"
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(t.status)}
                    className={cn("w-full h-8 text-xs", t.className)}
                  >
                    {t.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400 text-[12px]">{label}</span>
      {children || <span className="text-slate-700 text-[12px] font-medium">{value}</span>}
    </div>
  );
}
