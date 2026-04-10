"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, RefreshCw, MoreHorizontal, Pencil, Megaphone,
  Bell, CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type AnnouncementType = "OUTAGE" | "MAINTENANCE" | "INFO" | "GENERAL";
type AnnouncementStatus = "DRAFT" | "ACTIVE" | "RESOLVED" | "ARCHIVED";

interface Router {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  estimatedResolveAt: string | null;
  notifyVia: string | null;
  notes: string | null;
  notifiedCount: number;
  createdAt: string;
  affectedRouters?: Router[];
  _count?: { affectedRouters?: number };
}

interface PaginationMeta {
  page: number;
  totalPages: number;
  totalResults: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const TYPE_STYLES: Record<AnnouncementType, string> = {
  OUTAGE: "bg-red-100 text-red-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  INFO: "bg-blue-100 text-blue-700",
  GENERAL: "bg-slate-100 text-slate-700",
};

const STATUS_STYLES: Record<AnnouncementStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  RESOLVED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

const EMPTY_FORM = {
  title: "",
  message: "",
  type: "INFO" as AnnouncementType,
  status: "DRAFT" as AnnouncementStatus,
  affectedRouterIds: [] as string[],
  estimatedResolveAt: "",
  notifyVia: "SMS",
  notes: "",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [routers, setRouters] = useState<Router[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Resolve / Notify
  const [resolveTarget, setResolveTarget] = useState<Announcement | null>(null);
  const [notifying, setNotifying] = useState<string | null>(null);

  useEffect(() => {
    api.get("/isp/routers?limit=100").then((r) => setRouters(r.data.data.routers || [])).catch(() => {});
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        ...(search && { search }),
      });
      const res = await api.get(`/isp/announcements?${params}`);
      setAnnouncements(res.data.data.announcements || res.data.data || []);
      setPagination(res.data.meta?.pagination || null);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const openCreate = () => {
    setEditAnnouncement(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (a: Announcement) => {
    setEditAnnouncement(a);
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      status: a.status,
      affectedRouterIds: a.affectedRouters?.map((r) => r.id) || [],
      estimatedResolveAt: a.estimatedResolveAt ? a.estimatedResolveAt.slice(0, 16) : "",
      notifyVia: a.notifyVia || "SMS",
      notes: a.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title: form.title,
        message: form.message,
        type: form.type,
        status: form.status,
        notifyVia: form.notifyVia,
        ...(form.affectedRouterIds.length > 0 && { affectedRouterIds: form.affectedRouterIds }),
        ...(form.estimatedResolveAt && { estimatedResolveAt: new Date(form.estimatedResolveAt).toISOString() }),
        ...(form.notes && { notes: form.notes }),
      };

      if (editAnnouncement) {
        await api.patch(`/isp/announcements/${editAnnouncement.id}`, payload);
        toast.success("Announcement updated");
      } else {
        await api.post("/isp/announcements", payload);
        toast.success("Announcement created");
      }
      setShowForm(false);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveTarget) return;
    try {
      await api.post(`/isp/announcements/${resolveTarget.id}/resolve`);
      toast.success("Announcement resolved");
      setResolveTarget(null);
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resolve");
    }
  };

  const handleNotify = async (id: string) => {
    setNotifying(id);
    try {
      await api.post(`/isp/announcements/${id}/notify`);
      toast.success("Notifications sent");
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send notifications");
    } finally {
      setNotifying(null);
    }
  };

  const toggleRouter = (routerId: string) => {
    setForm((f) => {
      const ids = f.affectedRouterIds.includes(routerId)
        ? f.affectedRouterIds.filter((id) => id !== routerId)
        : [...f.affectedRouterIds, routerId];
      return { ...f, affectedRouterIds: ids };
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Outage and maintenance notifications</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnnouncements} className="h-9 gap-1.5 text-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <Card className="border-slate-200/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Affected Routers</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Notified</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Created</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : announcements.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No announcements found</td></tr>
                ) : announcements.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700">{a.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{a.message}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", TYPE_STYLES[a.type])}>
                        {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_STYLES[a.status])}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-[13px]">
                      {a._count?.affectedRouters ?? a.affectedRouters?.length ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-[13px]">
                      {a.notifiedCount ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[12px]">
                      {format(new Date(a.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-3.5 relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {openMenu === a.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-40" onMouseLeave={() => setOpenMenu(null)}>
                          <button onClick={() => { openEdit(a); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          {a.status === "ACTIVE" && (
                            <button onClick={() => { setResolveTarget(a); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                            </button>
                          )}
                          <button
                            onClick={() => { handleNotify(a.id); setOpenMenu(null); }}
                            disabled={notifying === a.id}
                            className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                          >
                            <Bell className="h-3.5 w-3.5" /> {notifying === a.id ? "Sending..." : "Notify"}
                          </button>
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

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAnnouncement ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="Fiber cut on zone 3"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Message *</Label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  required
                  rows={4}
                  placeholder="Describe the outage or maintenance details..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as AnnouncementType }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OUTAGE">Outage</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="INFO">Info</SelectItem>
                      <SelectItem value="GENERAL">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Status *</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as AnnouncementStatus }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Affected Routers</Label>
                <div className="border border-slate-200 rounded-md p-2 max-h-36 overflow-y-auto space-y-1">
                  {routers.length === 0 ? (
                    <p className="text-xs text-slate-400 py-1">No routers available</p>
                  ) : routers.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.affectedRouterIds.includes(r.id)}
                        onChange={() => toggleRouter(r.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-500"
                      />
                      <span className="text-sm text-slate-700">{r.name}</span>
                    </label>
                  ))}
                </div>
                {form.affectedRouterIds.length > 0 && (
                  <p className="text-[11px] text-slate-400">{form.affectedRouterIds.length} router(s) selected</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="estimatedResolve">Estimated Resolve</Label>
                  <Input
                    id="estimatedResolve"
                    type="datetime-local"
                    value={form.estimatedResolveAt}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedResolveAt: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Notify Via</Label>
                  <Select value={form.notifyVia} onValueChange={(v) => setForm((f) => ({ ...f, notifyVia: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Internal notes..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
                {saving ? "Saving..." : editAnnouncement ? "Update" : "Create Announcement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resolve Confirm */}
      <ConfirmDialog
        open={!!resolveTarget}
        onOpenChange={(o) => !o && setResolveTarget(null)}
        title="Resolve Announcement"
        description={`Mark "${resolveTarget?.title}" as resolved? Affected customers may be notified.`}
        confirmLabel="Resolve"
        onConfirm={handleResolve}
      />
    </div>
  );
}
