"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuthStore } from "@/store/auth-store";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700", IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700", CLOSED: "bg-slate-100 text-slate-500",
};

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const user = useAuthStore(s => s.user);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/customer-portal/tickets/${ticketId}`);
      setTicket(res.data.data.ticket);
    } catch { toast.error("Failed to load ticket"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/customer-portal/tickets/${ticketId}/replies`, { message: reply });
      setReply("");
      toast.success("Reply sent!");
      fetchTicket();
    } catch { toast.error("Failed to send reply"); }
    finally { setSending(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!ticket) return <p className="text-center text-slate-400 py-20">Ticket not found</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/portal/tickets" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Tickets
      </Link>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">{ticket.subject}</h1>
              <p className="text-sm text-slate-400 mt-1">Created {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
            </div>
            <div className="flex gap-2">
              <Badge className={`text-[10px] ${STATUS_STYLES[ticket.status] || ""}`}>{ticket.status.replace(/_/g, " ")}</Badge>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600 whitespace-pre-wrap border-t border-slate-100 pt-4">{ticket.description}</div>
        </CardContent>
      </Card>

      {/* Replies */}
      <div className="space-y-3">
        {ticket.replies?.map((r: any) => (
          <Card key={r.id} className={r.user?.role !== "CUSTOMER" ? "border-blue-100" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${r.user?.role !== "CUSTOMER" ? "bg-blue-500" : "bg-slate-400"}`}>
                    {r.user?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{r.user?.name || "Support"}</span>
                  {r.user?.role !== "CUSTOMER" && <Badge className="text-[9px] bg-blue-100 text-blue-700">Staff</Badge>}
                </div>
                <span className="text-xs text-slate-400">{format(new Date(r.createdAt), "MMM d, yyyy h:mm a")}</span>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{r.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reply Form */}
      {!["CLOSED", "RESOLVED"].includes(ticket.status) && (
        <Card>
          <CardContent className="p-4">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 mb-3"
            />
            <Button onClick={handleReply} disabled={sending || !reply.trim()} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
              <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Reply"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
