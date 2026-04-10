"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Send, RefreshCw, Search, MessageSquare, Mail, Phone,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Router {
  id: string;
  name: string;
}

interface Zone {
  id: string;
  name: string;
}

interface BulkMessage {
  id: string;
  subject: string | null;
  message: string;
  channel: "SMS" | "EMAIL" | "BOTH";
  status: "DRAFT" | "QUEUED" | "SENDING" | "SENT" | "FAILED";
  sentCount: number;
  failedCount: number;
  totalRecipients: number;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  totalPages: number;
  totalResults: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const CHANNEL_STYLES: Record<string, string> = {
  SMS: "bg-violet-100 text-violet-700",
  EMAIL: "bg-sky-100 text-sky-700",
  BOTH: "bg-indigo-100 text-indigo-700",
};

const MSG_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  QUEUED: "bg-amber-100 text-amber-700",
  SENDING: "bg-blue-100 text-blue-700",
  SENT: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
};

const SMS_MAX_CHARS = 160;

export default function MessagingPage() {
  // Compose state
  const [customerStatus, setCustomerStatus] = useState("all");
  const [routerFilter, setRouterFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [channel, setChannel] = useState<"SMS" | "EMAIL" | "BOTH">("SMS");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // Dropdowns
  const [routers, setRouters] = useState<Router[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);

  // History
  const [messages, setMessages] = useState<BulkMessage[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/isp/routers?limit=100").then((r) => setRouters(r.data.data.routers || [])).catch(() => {});
    api.get("/isp/zones?limit=100").then((r) => setZones(r.data.data.zones || [])).catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      const res = await api.get(`/isp/bulk-messages?${params}`);
      setMessages(res.data.data.messages || res.data.data.bulkMessages || []);
      setPagination(res.data.meta?.pagination || null);
    } catch {
      toast.error("Failed to load message history");
    } finally {
      setHistoryLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const buildFilters = () => {
    const filters: Record<string, string> = {};
    if (customerStatus !== "all") filters.customerStatus = customerStatus;
    if (routerFilter !== "all") filters.routerId = routerFilter;
    if (zoneFilter !== "all") filters.zoneId = zoneFilter;
    return filters;
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await api.post("/isp/bulk-messages/preview", {
        filters: buildFilters(),
        channel,
      });
      setPreviewCount(res.data.data.recipientCount ?? res.data.data.count ?? 0);
      setShowPreview(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to preview recipients");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }
    setSending(true);
    try {
      // Step 1: Create the bulk message
      const createRes = await api.post("/isp/bulk-messages", {
        subject: subject || undefined,
        message,
        channel,
        filters: buildFilters(),
      });
      const bulkMessageId = createRes.data.data.id || createRes.data.data.bulkMessage?.id;

      // Step 2: Trigger send
      await api.post(`/isp/bulk-messages/${bulkMessageId}/send`);

      toast.success("Message sent successfully");
      setSubject("");
      setMessage("");
      setShowPreview(false);
      setPreviewCount(null);
      fetchHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const resetCompose = () => {
    setCustomerStatus("all");
    setRouterFilter("all");
    setZoneFilter("all");
    setChannel("SMS");
    setSubject("");
    setMessage("");
    setPreviewCount(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bulk Messaging</h1>
          <p className="text-sm text-slate-500 mt-0.5">Send SMS and email to customers</p>
        </div>
      </div>

      {/* Compose Section */}
      <Card className="border-slate-200/80">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-700">Compose Message</h2>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Customer Status</Label>
              <Select value={customerStatus} onValueChange={setCustomerStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="PENDING_ACTIVATION">Pending</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Router</Label>
              <Select value={routerFilter} onValueChange={setRouterFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All routers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routers</SelectItem>
                  {routers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Zone</Label>
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Channel */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Channel</Label>
            <div className="flex items-center gap-4">
              {(["SMS", "EMAIL", "BOTH"] as const).map((ch) => (
                <label key={ch} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="channel"
                    value={ch}
                    checked={channel === ch}
                    onChange={() => setChannel(ch)}
                    className="h-3.5 w-3.5 accent-blue-500"
                  />
                  <span className="flex items-center gap-1 text-sm text-slate-700">
                    {ch === "SMS" && <Phone className="h-3.5 w-3.5 text-violet-500" />}
                    {ch === "EMAIL" && <Mail className="h-3.5 w-3.5 text-sky-500" />}
                    {ch === "BOTH" && <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />}
                    {ch === "BOTH" ? "Both" : ch}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Subject (for email) */}
          {(channel === "EMAIL" || channel === "BOTH") && (
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line..."
                className="h-9 text-sm"
              />
            </div>
          )}

          {/* Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="msgBody">Message *</Label>
              <span className={cn(
                "text-[11px]",
                channel === "SMS" && message.length > SMS_MAX_CHARS ? "text-red-500 font-medium" : "text-slate-400"
              )}>
                {message.length}{channel === "SMS" ? ` / ${SMS_MAX_CHARS}` : ""} characters
              </span>
            </div>
            <textarea
              id="msgBody"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
              placeholder="Type your message here..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <Button type="button" variant="outline" size="sm" onClick={resetCompose} className="h-9 text-sm">
              Clear
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={previewing || !message.trim()}
                className="h-9 text-sm gap-1.5"
              >
                {previewing ? "Loading..." : "Preview Recipients"}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (previewCount === null) {
                    handlePreview();
                  } else {
                    handleSend();
                  }
                }}
                disabled={sending || !message.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm h-9"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-slate-800">{previewCount ?? 0}</p>
              <p className="text-sm text-slate-500 mt-1">recipient{(previewCount ?? 0) !== 1 ? "s" : ""} will receive this message</p>
            </div>
            <div className="bg-slate-50 rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium">Channel:</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", CHANNEL_STYLES[channel])}>{channel}</span>
              </div>
              {subject && (
                <div className="text-xs text-slate-500">
                  <span className="font-medium">Subject:</span> {subject}
                </div>
              )}
              <div className="text-xs text-slate-500">
                <span className="font-medium">Message:</span>
                <p className="mt-1 text-slate-700 whitespace-pre-wrap text-[13px]">{message.length > 200 ? message.slice(0, 200) + "..." : message}</p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={sending || (previewCount ?? 0) === 0}
              className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending..." : `Send to ${previewCount ?? 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Message History</h2>
        <Button variant="outline" size="sm" onClick={fetchHistory} className="h-8 gap-1.5 text-xs">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <Card className="border-slate-200/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Subject / Message</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Channel</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Sent / Failed</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : messages.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No messages sent yet</td></tr>
                ) : messages.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700">{m.subject || "(No subject)"}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{m.message}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", CHANNEL_STYLES[m.channel])}>
                        {m.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", MSG_STATUS_STYLES[m.status] || "bg-slate-100 text-slate-600")}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px]">
                      <span className="text-emerald-600 font-medium">{m.sentCount ?? 0}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-red-500 font-medium">{m.failedCount ?? 0}</span>
                      <span className="text-slate-400 text-[11px] ml-1">of {m.totalRecipients ?? 0}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[12px]">
                      {format(new Date(m.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && (
            <div className="px-5 py-3 border-t border-slate-100">
              <DataTablePagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalResults={pagination.totalResults}
                hasNext={pagination.hasNext}
                hasPrev={pagination.hasPrev}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
