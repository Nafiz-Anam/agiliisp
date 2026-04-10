"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, RefreshCw, MoreHorizontal, Eye,
  AlertCircle, Clock, CheckCircle, XCircle, Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import api from "@/lib/api";
import { SupportTicket, TicketStatus, TicketPriority, PaginationMeta, IspCustomer } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  PENDING_CUSTOMER: "bg-purple-100 text-purple-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

const STATUS_ICON: Record<TicketStatus, React.ReactNode> = {
  OPEN: <AlertCircle className="h-3 w-3" />,
  IN_PROGRESS: <Clock className="h-3 w-3" />,
  PENDING_CUSTOMER: <Clock className="h-3 w-3" />,
  RESOLVED: <CheckCircle className="h-3 w-3" />,
  CLOSED: <XCircle className="h-3 w-3" />,
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  LOW: "bg-slate-100 text-slate-500",
  MEDIUM: "bg-blue-50 text-blue-600",
  HIGH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("openedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [viewTicket, setViewTicket] = useState<SupportTicket | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{ ticket: SupportTicket; status: TicketStatus } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Create ticket
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customers, setCustomers] = useState<IspCustomer[]>([]);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: "",
    subject: "",
    description: "",
    category: "Technical",
    priority: "MEDIUM",
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
      });
      const res = await api.get(`/isp/tickets?${params}`);
      setTickets(res.data.data.tickets);
      setPagination(res.data.meta.pagination);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, sortBy, sortOrder]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    api.get("/isp/customers?limit=200&status=ACTIVE").then((r) => setCustomers(r.data.data.customers || [])).catch(() => {});
  }, []);

  const handleCreateTicket = async () => {
    if (!createForm.customerId || !createForm.subject || !createForm.description) {
      toast.error("Customer, subject and description are required");
      return;
    }
    setSaving(true);
    try {
      await api.post("/isp/tickets", createForm);
      toast.success("Ticket created successfully");
      setShowCreateForm(false);
      setCreateForm({ customerId: "", subject: "", description: "", category: "Technical", priority: "MEDIUM" });
      fetchTickets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create ticket");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!updateStatus) return;
    try {
      await api.patch(`/isp/tickets/${updateStatus.ticket.id}`, { status: updateStatus.status });
      toast.success("Ticket status updated");
      setUpdateStatus(null);
      fetchTickets();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update ticket");
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortOrder("asc"); }
    setPage(1);
  };

  const openTickets = tickets.filter((t) => t.status === "OPEN").length;
  const criticalTickets = tickets.filter((t) => t.priority === "CRITICAL").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Customer support requests</p>
        </div>
        <div className="flex items-center gap-2">
          {criticalTickets > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">{criticalTickets} Critical</span>
            </div>
          )}
          {openTickets > 0 && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">{openTickets} Open</span>
            </div>
          )}
          <Button size="sm" onClick={() => setShowCreateForm(true)} className="h-9 gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm">
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search tickets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 text-sm" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING_CUSTOMER">Pending Customer</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <Button variant="outline" size="sm" onClick={fetchTickets} className="h-9 gap-1.5 text-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Card className="border-slate-200/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3">
                    <SortableHeader label="Ticket #" sortKey="ticketNumber" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Subject</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Assignee</th>
                  <th className="text-left px-4 py-3">
                    <SortableHeader label="Opened" sortKey="openedAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : tickets.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No tickets found</td></tr>
                ) : tickets.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-blue-600 font-medium text-[13px]">
                      {t.ticketNumber}
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-slate-700 text-[13px] truncate">{t.subject}</p>
                      {t._count && t._count.replies > 0 && (
                        <p className="text-[11px] text-slate-400">{t._count.replies} replies</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-700 text-[13px]">{t.customer.fullName}</p>
                      <p className="text-[11px] text-slate-400">{t.customer.username}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${STATUS_STYLES[t.status]}`}>
                        {STATUS_ICON[t.status]}
                        {t.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[13px]">
                      {t.assignee?.name || "Unassigned"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-[12px]">
                      {format(new Date(t.openedAt), "MMM d, HH:mm")}
                    </td>
                    <td className="px-3 py-3.5 relative">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {openMenu === t.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-44" onMouseLeave={() => setOpenMenu(null)}>
                          <Link href={`/tickets/${t.id}`} onClick={() => setOpenMenu(null)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Eye className="h-3.5 w-3.5" /> View Details
                          </Link>
                          {t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                            <>
                              {t.status === "OPEN" && (
                                <button onClick={() => { setUpdateStatus({ ticket: t, status: "IN_PROGRESS" }); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5" /> Mark In Progress
                                </button>
                              )}
                              <button onClick={() => { setUpdateStatus({ ticket: t, status: "RESOLVED" }); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                                <CheckCircle className="h-3.5 w-3.5" /> Mark Resolved
                              </button>
                              <button onClick={() => { setUpdateStatus({ ticket: t, status: "CLOSED" }); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-2">
                                <XCircle className="h-3.5 w-3.5" /> Close Ticket
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && (
            <div className="px-5 py-3 border-t border-slate-100">
              <DataTablePagination page={pagination.page} totalPages={pagination.totalPages} totalResults={pagination.totalResults} hasNext={pagination.hasNext} hasPrev={pagination.hasPrev} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      {viewTicket && (
        <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Ticket {viewTicket.ticketNumber}</DialogTitle></DialogHeader>
            <DialogBody className="space-y-3">
              <DetailRow label="Subject" value={viewTicket.subject} />
              <DetailRow label="Customer" value={`${viewTicket.customer.fullName} (${viewTicket.customer.username})`} />
              <DetailRow label="Status" value={<span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${STATUS_STYLES[viewTicket.status]}`}>{STATUS_ICON[viewTicket.status]}{viewTicket.status.replace("_", " ")}</span>} />
              <DetailRow label="Priority" value={<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[viewTicket.priority]}`}>{viewTicket.priority}</span>} />
              <DetailRow label="Assignee" value={viewTicket.assignee?.name || "Unassigned"} />
              <DetailRow label="Opened" value={format(new Date(viewTicket.openedAt), "MMM d, yyyy HH:mm")} />
              <DetailRow label="Resolved" value={viewTicket.resolvedAt ? format(new Date(viewTicket.resolvedAt), "MMM d, yyyy HH:mm") : "—"} />
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{viewTicket.description}</p>
              </div>
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer *</Label>
              <select
                value={createForm.customerId}
                onChange={(e) => setCreateForm((f) => ({ ...f, customerId: e.target.value }))}
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.fullName} ({c.username})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject *</Label>
              <Input
                value={createForm.subject}
                onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief description of the issue"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description *</Label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detailed description..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</Label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="Technical">Technical</option>
                  <option value="Billing">Billing</option>
                  <option value="Sales">Sales</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</Label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket} disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
              {saving ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Confirm */}
      {updateStatus && (
        <Dialog open={!!updateStatus} onOpenChange={() => setUpdateStatus(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Update Ticket Status</DialogTitle></DialogHeader>
            <DialogBody>
              <p className="text-sm text-slate-600">
                Mark ticket <span className="font-mono font-medium">{updateStatus.ticket.ticketNumber}</span> as{" "}
                <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${STATUS_STYLES[updateStatus.status]}`}>
                  {updateStatus.status.replace("_", " ")}
                </span>?
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateStatus(null)}>Cancel</Button>
              <Button onClick={handleStatusUpdate} className="bg-blue-500 hover:bg-blue-600 text-white">Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-28 shrink-0 text-slate-400 font-medium">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
