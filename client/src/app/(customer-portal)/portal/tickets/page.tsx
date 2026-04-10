"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700", IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700", CLOSED: "bg-slate-100 text-slate-500",
};
const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600", MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700", URGENT: "bg-red-100 text-red-700",
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", category: "GENERAL", priority: "MEDIUM" });
  const [saving, setSaving] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/customer-portal/tickets", { params });
      setTickets(res.data.data.tickets || []);
      setMeta(res.data.meta?.pagination || null);
    } catch { toast.error("Failed to load tickets"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.description.trim()) { toast.error("Subject and description are required"); return; }
    setSaving(true);
    try {
      await api.post("/customer-portal/tickets", form);
      toast.success("Ticket created!");
      setShowCreate(false);
      setForm({ subject: "", description: "", category: "GENERAL", priority: "MEDIUM" });
      fetchTickets();
    } catch { toast.error("Failed to create ticket"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and track your support requests</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700">
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <Button onClick={() => setShowCreate(true)} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm h-9">
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length > 0 ? tickets.map(t => (
                    <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell>
                        <Link href={`/portal/tickets/${t.id}`} className="font-medium text-blue-600 hover:underline">{t.subject}</Link>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{t.category}</TableCell>
                      <TableCell><Badge className={`text-[10px] ${PRIORITY_STYLES[t.priority] || ""}`}>{t.priority}</Badge></TableCell>
                      <TableCell><Badge className={`text-[10px] ${STATUS_STYLES[t.status] || ""}`}>{t.status.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-500">{format(new Date(t.createdAt), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-12">No tickets found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {meta && meta.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-100">
                  <DataTablePagination page={page} totalPages={meta.totalPages} totalResults={meta.totalResults} limit={10} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief summary of your issue" /></div>
            <div><Label>Description</Label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your issue in detail..." rows={4} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                  <option value="GENERAL">General</option>
                  <option value="BILLING">Billing</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="NETWORK">Network</option>
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              {saving ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
