"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Search, RefreshCw, MoreHorizontal, Eye, Pencil, Trash2,
  CheckCircle, XCircle, AlertTriangle, WrenchIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SortableHeader } from "@/components/ui/sortable-header";
import api from "@/lib/api";
import { Router, RouterStatus, PaginationMeta } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_ICON: Record<RouterStatus, React.ReactNode> = {
  ONLINE: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  OFFLINE: <XCircle className="h-4 w-4 text-red-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  MAINTENANCE: <WrenchIcon className="h-4 w-4 text-blue-500" />,
};

const STATUS_BADGE: Record<RouterStatus, string> = {
  ONLINE: "bg-emerald-100 text-emerald-700",
  OFFLINE: "bg-red-100 text-red-700",
  WARNING: "bg-amber-100 text-amber-700",
  MAINTENANCE: "bg-blue-100 text-blue-700",
};

const EMPTY_FORM = {
  name: "",
  host: "",
  port: 8728,
  useSSL: false,
  username: "admin",
  password: "",
  location: "",
  description: "",
  syncEnabled: true,
};

export default function RoutersPage() {
  const [routers, setRouters] = useState<Router[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [showForm, setShowForm] = useState(false);
  const [editRouter, setEditRouter] = useState<Router | null>(null);
  const [deleteRouter, setDeleteRouter] = useState<Router | null>(null);
  const [viewRouter, setViewRouter] = useState<Router | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchRouters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await api.get(`/isp/routers?${params}`);
      setRouters(res.data.data.routers);
      setPagination(res.data.meta.pagination);
    } catch {
      toast.error("Failed to load routers");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchRouters(); }, [fetchRouters]);

  const openCreate = () => {
    setEditRouter(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (r: Router) => {
    setEditRouter(r);
    setForm({
      name: r.name,
      host: r.host,
      port: r.port,
      useSSL: r.useSSL,
      username: r.username,
      password: "",
      location: r.location || "",
      description: r.description || "",
      syncEnabled: r.syncEnabled,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        port: Number(form.port),
        ...(editRouter && !form.password ? {} : { password: form.password }),
      };
      if (editRouter && !form.password) delete (payload as any).password;

      if (editRouter) {
        await api.patch(`/isp/routers/${editRouter.id}`, payload);
        toast.success("Router updated");
      } else {
        await api.post("/isp/routers", payload);
        toast.success("Router created");
      }
      setShowForm(false);
      fetchRouters();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save router");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!editRouter) return;
    setTesting(true);
    try {
      await api.post(`/isp/routers/${editRouter.id}/test`);
      toast.success("Connection successful!");
    } catch {
      toast.error("Connection failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async (routerId: string) => {
    try {
      await api.post(`/isp/routers/${routerId}/sync`);
      toast.success("Sync started");
      fetchRouters();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Sync failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteRouter) return;
    try {
      await api.delete(`/isp/routers/${deleteRouter.id}`);
      toast.success("Router deleted");
      setDeleteRouter(null);
      fetchRouters();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete router");
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortOrder("asc"); }
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Routers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage MikroTik routers</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> Add Router
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search routers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">All Statuses</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
          <option value="WARNING">Warning</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
        <Button variant="outline" size="sm" onClick={fetchRouters} className="h-9 gap-1.5 text-sm">
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
                    <SortableHeader label="Name" sortKey="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Host</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customers</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Last Sync</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : routers.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No routers found</td></tr>
                ) : routers.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {STATUS_ICON[r.status]}
                        <div>
                          <p className="font-medium text-slate-700">{r.name}</p>
                          <p className="text-[11px] text-slate-400">v{r.apiVersion || "?"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-[13px]">
                      {r.host}:{r.port}
                      {r.useSSL && <span className="ml-1 text-[10px] bg-blue-50 text-blue-600 px-1 rounded">SSL</span>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[13px]">{r.location || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium">{r._count?.customers ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-[12px]">
                      {r.lastSyncAt ? format(new Date(r.lastSyncAt), "MMM d, HH:mm") : "Never"}
                    </td>
                    <td className="px-3 py-3.5 relative">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {openMenu === r.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36" onMouseLeave={() => setOpenMenu(null)}>
                          <Link href={`/routers/${r.id}`} onClick={() => setOpenMenu(null)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Eye className="h-3.5 w-3.5" /> View & Logs
                          </Link>
                          <button onClick={() => { openEdit(r); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => { handleSync(r.id); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                            <RefreshCw className="h-3.5 w-3.5" /> Sync
                          </button>
                          <button onClick={() => { setDeleteRouter(r); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
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
              <DataTablePagination page={pagination.page} totalPages={pagination.totalPages} totalResults={pagination.totalResults} hasNext={pagination.hasNext} hasPrev={pagination.hasPrev} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRouter ? "Edit Router" : "Add Router"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Main Office Router" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="host">Host / IP *</Label>
                <Input id="host" value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} required placeholder="192.168.1.1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="port">API Port *</Label>
                <Input id="port" type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username *</Label>
                <Input id="username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{editRouter ? "Password (leave blank to keep)" : "Password *"}</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editRouter} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Building A, 2nd Floor" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <input type="checkbox" id="useSSL" checked={form.useSSL} onChange={(e) => setForm((f) => ({ ...f, useSSL: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 accent-orange-500" />
                <Label htmlFor="useSSL" className="cursor-pointer">Use SSL (port 8729)</Label>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <input type="checkbox" id="syncEnabled" checked={form.syncEnabled} onChange={(e) => setForm((f) => ({ ...f, syncEnabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 accent-orange-500" />
                <Label htmlFor="syncEnabled" className="cursor-pointer">Enable Auto-Sync</Label>
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
              {editRouter && (
                <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                  {saving ? "Saving..." : editRouter ? "Update" : "Add Router"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewRouter && (
        <Dialog open={!!viewRouter} onOpenChange={() => setViewRouter(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Router Details</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <DetailRow label="Name" value={viewRouter.name} />
              <DetailRow label="Host" value={`${viewRouter.host}:${viewRouter.port}`} />
              <DetailRow label="SSL" value={viewRouter.useSSL ? "Yes" : "No"} />
              <DetailRow label="Status" value={<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[viewRouter.status]}`}>{viewRouter.status}</span>} />
              <DetailRow label="Location" value={viewRouter.location || "—"} />
              <DetailRow label="API Version" value={viewRouter.apiVersion || "—"} />
              <DetailRow label="Last Connected" value={viewRouter.lastConnectedAt ? format(new Date(viewRouter.lastConnectedAt), "MMM d, yyyy HH:mm") : "Never"} />
              <DetailRow label="Last Sync" value={viewRouter.lastSyncAt ? format(new Date(viewRouter.lastSyncAt), "MMM d, yyyy HH:mm") : "Never"} />
              <DetailRow label="Sync Enabled" value={viewRouter.syncEnabled ? "Yes" : "No"} />
              <DetailRow label="Customers" value={String(viewRouter._count?.customers ?? "—")} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteRouter}
        onOpenChange={(o) => !o && setDeleteRouter(null)}
        title="Delete Router"
        description={`Delete "${deleteRouter?.name}"? All customers on this router must be reassigned first.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-32 shrink-0 text-slate-400 font-medium">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
