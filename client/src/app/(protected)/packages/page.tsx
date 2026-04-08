"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, RefreshCw, MoreHorizontal, Eye, Pencil, Trash2,
  ArrowDown, ArrowUp, Users,
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
import { InternetPackage, Router, PaginationMeta } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

const EMPTY_FORM = {
  name: "",
  routerId: "",
  downloadSpeed: 10,
  uploadSpeed: 5,
  price: 0,
  costPrice: "",
  dataLimit: "",
  burstDownload: "",
  burstUpload: "",
  priority: 8,
  description: "",
  isActive: true,
  isPublic: true,
  syncEnabled: true,
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<InternetPackage[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [routerFilter, setRouterFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [routers, setRouters] = useState<Router[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg] = useState<InternetPackage | null>(null);
  const [deletePkg, setDeletePkg] = useState<InternetPackage | null>(null);
  const [viewPkg, setViewPkg] = useState<InternetPackage | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    api.get("/isp/routers?limit=100").then((r) => setRouters(r.data.data.routers || [])).catch(() => {});
  }, []);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(routerFilter && { routerId: routerFilter }),
      });
      const res = await api.get(`/isp/packages?${params}`);
      setPackages(res.data.data.packages);
      setPagination(res.data.meta.pagination);
    } catch {
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  }, [page, search, routerFilter, sortBy, sortOrder]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const openCreate = () => {
    setEditPkg(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (p: InternetPackage) => {
    setEditPkg(p);
    setForm({
      name: p.name,
      routerId: p.routerId,
      downloadSpeed: p.downloadSpeed,
      uploadSpeed: p.uploadSpeed,
      price: p.price,
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      dataLimit: p.dataLimit != null ? String(p.dataLimit) : "",
      burstDownload: p.burstDownload != null ? String(p.burstDownload) : "",
      burstUpload: p.burstUpload != null ? String(p.burstUpload) : "",
      priority: p.priority,
      description: p.description || "",
      isActive: p.isActive,
      isPublic: p.isPublic,
      syncEnabled: p.syncEnabled,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: form.name,
        routerId: form.routerId,
        downloadSpeed: Number(form.downloadSpeed),
        uploadSpeed: Number(form.uploadSpeed),
        price: Number(form.price),
        priority: Number(form.priority),
        isActive: form.isActive,
        isPublic: form.isPublic,
        syncEnabled: form.syncEnabled,
        ...(form.costPrice !== "" && { costPrice: Number(form.costPrice) }),
        ...(form.dataLimit !== "" && { dataLimit: Number(form.dataLimit) }),
        ...(form.burstDownload !== "" && { burstDownload: Number(form.burstDownload) }),
        ...(form.burstUpload !== "" && { burstUpload: Number(form.burstUpload) }),
        ...(form.description && { description: form.description }),
      };

      if (editPkg) {
        await api.patch(`/isp/packages/${editPkg.id}`, payload);
        toast.success("Package updated");
      } else {
        await api.post("/isp/packages", payload);
        toast.success("Package created");
      }
      setShowForm(false);
      fetchPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePkg) return;
    try {
      await api.delete(`/isp/packages/${deletePkg.id}`);
      toast.success("Package deleted");
      setDeletePkg(null);
      fetchPackages();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete package");
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
          <h1 className="text-2xl font-bold text-slate-800">Packages</h1>
          <p className="text-sm text-slate-500 mt-0.5">Internet bandwidth plans</p>
        </div>
        <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> New Package
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search packages..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 text-sm" />
        </div>
        <select
          value={routerFilter}
          onChange={(e) => { setRouterFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">All Routers</option>
          {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={fetchPackages} className="h-9 gap-1.5 text-sm">
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
                    <SortableHeader label="Package" sortKey="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Router</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Speed</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Data Limit</th>
                  <th className="text-left px-4 py-3">
                    <SortableHeader label="Price" sortKey="price" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customers</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : packages.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No packages found</td></tr>
                ) : packages.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700">{p.name}</p>
                      <p className="text-[11px] text-slate-400">Priority: {p.priority}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-[13px]">{p.router.name}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="flex items-center gap-0.5 text-emerald-600"><ArrowDown className="h-3 w-3" />{p.downloadSpeed} Mbps</span>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-0.5 text-blue-600"><ArrowUp className="h-3 w-3" />{p.uploadSpeed} Mbps</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-[13px]">
                      {p.dataLimit ? `${p.dataLimit} GB` : "Unlimited"}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">${Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 text-slate-600 text-[13px]">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {p._count?.customers ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 relative">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {openMenu === p.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36" onMouseLeave={() => setOpenMenu(null)}>
                          <button onClick={() => { setViewPkg(p); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button onClick={() => { openEdit(p); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => { setDeletePkg(p); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPkg ? "Edit Package" : "New Package"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Router *</Label>
                <select
                  value={form.routerId}
                  onChange={(e) => setForm((f) => ({ ...f, routerId: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                  required
                  disabled={!!editPkg}
                >
                  <option value="">Select router...</option>
                  {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="pkgName">Package Name *</Label>
                <Input id="pkgName" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="10Mbps Home" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dl">Download Speed (Mbps) *</Label>
                <Input id="dl" type="number" value={form.downloadSpeed} onChange={(e) => setForm((f) => ({ ...f, downloadSpeed: Number(e.target.value) }))} required min={1} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ul">Upload Speed (Mbps) *</Label>
                <Input id="ul" type="number" value={form.uploadSpeed} onChange={(e) => setForm((f) => ({ ...f, uploadSpeed: Number(e.target.value) }))} required min={1} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Price ($) *</Label>
                <Input id="price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} required min={0} step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="costPrice">Cost Price ($)</Label>
                <Input id="costPrice" type="number" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} min={0} step="0.01" placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dataLimit">Data Limit (GB)</Label>
                <Input id="dataLimit" type="number" value={form.dataLimit} onChange={(e) => setForm((f) => ({ ...f, dataLimit: e.target.value }))} min={1} placeholder="Blank = Unlimited" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority (1-8)</Label>
                <Input id="priority" type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))} min={1} max={8} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="burstDl">Burst Download (Mbps)</Label>
                <Input id="burstDl" type="number" value={form.burstDownload} onChange={(e) => setForm((f) => ({ ...f, burstDownload: e.target.value }))} min={1} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="burstUl">Burst Upload (Mbps)</Label>
                <Input id="burstUl" type="number" value={form.burstUpload} onChange={(e) => setForm((f) => ({ ...f, burstUpload: e.target.value }))} min={1} placeholder="Optional" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="pkgDesc">Description</Label>
                <Input id="pkgDesc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 accent-orange-500" />
                <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPublic" checked={form.isPublic} onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 accent-orange-500" />
                <Label htmlFor="isPublic" className="cursor-pointer">Public (visible to resellers)</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? "Saving..." : editPkg ? "Update" : "Create Package"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewPkg && (
        <Dialog open={!!viewPkg} onOpenChange={() => setViewPkg(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Package Details</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <DetailRow label="Name" value={viewPkg.name} />
              <DetailRow label="Router" value={viewPkg.router.name} />
              <DetailRow label="Download" value={`${viewPkg.downloadSpeed} Mbps`} />
              <DetailRow label="Upload" value={`${viewPkg.uploadSpeed} Mbps`} />
              <DetailRow label="Price" value={`$${Number(viewPkg.price).toFixed(2)}/mo`} />
              <DetailRow label="Cost Price" value={viewPkg.costPrice != null ? `$${Number(viewPkg.costPrice).toFixed(2)}` : "—"} />
              <DetailRow label="Data Limit" value={viewPkg.dataLimit ? `${viewPkg.dataLimit} GB` : "Unlimited"} />
              <DetailRow label="Burst Down" value={viewPkg.burstDownload ? `${viewPkg.burstDownload} Mbps` : "—"} />
              <DetailRow label="Burst Up" value={viewPkg.burstUpload ? `${viewPkg.burstUpload} Mbps` : "—"} />
              <DetailRow label="Priority" value={String(viewPkg.priority)} />
              <DetailRow label="Customers" value={String(viewPkg._count?.customers ?? "—")} />
              <DetailRow label="Active" value={viewPkg.isActive ? "Yes" : "No"} />
              <DetailRow label="Public" value={viewPkg.isPublic ? "Yes" : "No"} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deletePkg}
        onOpenChange={(o) => !o && setDeletePkg(null)}
        title="Delete Package"
        description={`Delete "${deletePkg?.name}"? Customers using this package must be reassigned first.`}
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
