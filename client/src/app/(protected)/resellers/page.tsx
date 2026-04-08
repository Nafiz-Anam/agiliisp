"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, RefreshCw, MoreHorizontal, Eye, Pencil, Trash2,
  Users, DollarSign, TrendingUp,
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
import { Reseller, PaginationMeta } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

const EMPTY_FORM = {
  // User fields
  email: "",
  name: "",
  password: "",
  phone: "",
  // Reseller fields
  businessName: "",
  businessRegistration: "",
  taxId: "",
  commissionRate: 10,
  creditLimit: "",
  markupPercentage: 0,
  supportPhone: "",
  supportEmail: "",
  notes: "",
  canCreateCustomers: true,
  canCreatePackages: false,
};

export default function ResellersPage() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [showForm, setShowForm] = useState(false);
  const [editReseller, setEditReseller] = useState<Reseller | null>(null);
  const [deleteReseller, setDeleteReseller] = useState<Reseller | null>(null);
  const [viewReseller, setViewReseller] = useState<Reseller | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchResellers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(activeFilter !== "" && { isActive: activeFilter }),
      });
      const res = await api.get(`/isp/resellers?${params}`);
      setResellers(res.data.data.resellers);
      setPagination(res.data.meta.pagination);
    } catch {
      toast.error("Failed to load resellers");
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilter, sortBy, sortOrder]);

  useEffect(() => { fetchResellers(); }, [fetchResellers]);

  const openCreate = () => {
    setEditReseller(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (r: Reseller) => {
    setEditReseller(r);
    setForm({
      email: r.user.email,
      name: r.user.name || "",
      password: "",
      phone: "",
      businessName: r.businessName,
      businessRegistration: r.businessRegistration || "",
      taxId: r.taxId || "",
      commissionRate: r.commissionRate,
      creditLimit: r.creditLimit != null ? String(r.creditLimit) : "",
      markupPercentage: r.markupPercentage,
      supportPhone: r.supportPhone || "",
      supportEmail: r.supportEmail || "",
      notes: r.notes || "",
      canCreateCustomers: r.canCreateCustomers,
      canCreatePackages: r.canCreatePackages,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editReseller) {
        const payload: Record<string, any> = {
          businessName: form.businessName,
          commissionRate: Number(form.commissionRate),
          markupPercentage: Number(form.markupPercentage),
          canCreateCustomers: form.canCreateCustomers,
          canCreatePackages: form.canCreatePackages,
          ...(form.businessRegistration && { businessRegistration: form.businessRegistration }),
          ...(form.taxId && { taxId: form.taxId }),
          ...(form.creditLimit !== "" && { creditLimit: Number(form.creditLimit) }),
          ...(form.supportPhone && { supportPhone: form.supportPhone }),
          ...(form.supportEmail && { supportEmail: form.supportEmail }),
          ...(form.notes && { notes: form.notes }),
        };
        await api.patch(`/isp/resellers/${editReseller.id}`, payload);
        toast.success("Reseller updated");
      } else {
        const payload = {
          user: { email: form.email, name: form.name, password: form.password, ...(form.phone && { phone: form.phone }) },
          businessName: form.businessName,
          commissionRate: Number(form.commissionRate),
          markupPercentage: Number(form.markupPercentage),
          canCreateCustomers: form.canCreateCustomers,
          canCreatePackages: form.canCreatePackages,
          ...(form.businessRegistration && { businessRegistration: form.businessRegistration }),
          ...(form.taxId && { taxId: form.taxId }),
          ...(form.creditLimit !== "" && { creditLimit: Number(form.creditLimit) }),
          ...(form.supportPhone && { supportPhone: form.supportPhone }),
          ...(form.supportEmail && { supportEmail: form.supportEmail }),
          ...(form.notes && { notes: form.notes }),
        };
        await api.post("/isp/resellers", payload);
        toast.success("Reseller created");
      }
      setShowForm(false);
      fetchResellers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save reseller");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReseller) return;
    try {
      await api.delete(`/isp/resellers/${deleteReseller.id}`);
      toast.success("Reseller deleted");
      setDeleteReseller(null);
      fetchResellers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete reseller");
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
          <h1 className="text-2xl font-bold text-slate-800">Resellers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage reseller partners</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> New Reseller
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search resellers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 text-sm" />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <Button variant="outline" size="sm" onClick={fetchResellers} className="h-9 gap-1.5 text-sm">
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
                    <SortableHeader label="Business" sortKey="businessName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customers</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Balance</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Commission</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3">
                    <SortableHeader label="Joined" sortKey="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : resellers.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No resellers found</td></tr>
                ) : resellers.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700">{r.businessName}</p>
                      <p className="text-[11px] text-slate-400">{r.user.name}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-600 text-[13px]">{r.user.email}</p>
                      <p className="text-[11px] text-slate-400">{r.supportPhone || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 text-slate-600 text-[13px]">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {r._count?.customers ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 font-medium text-slate-700 text-[13px]">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                        {Number(r.currentBalance).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 text-slate-600 text-[13px]">
                        <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                        {Number(r.commissionRate).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {r.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-[12px]">
                      {format(new Date(r.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-3.5 relative">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {openMenu === r.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36" onMouseLeave={() => setOpenMenu(null)}>
                          <button onClick={() => { setViewReseller(r); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button onClick={() => { openEdit(r); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => { setDeleteReseller(r); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
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
            <DialogTitle>{editReseller ? "Edit Reseller" : "New Reseller"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {!editReseller && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Account Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rName">Name *</Label>
                    <Input id="rName" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rEmail">Email *</Label>
                    <Input id="rEmail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rPwd">Password *</Label>
                    <Input id="rPwd" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editReseller} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rPhone">Phone</Label>
                    <Input id="rPhone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="bizName">Business Name *</Label>
                <Input id="bizName" value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bizReg">Business Registration</Label>
                <Input id="bizReg" value={form.businessRegistration} onChange={(e) => setForm((f) => ({ ...f, businessRegistration: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxId">Tax ID</Label>
                <Input id="taxId" value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="commission">Commission Rate (%) *</Label>
                <Input id="commission" type="number" value={form.commissionRate} onChange={(e) => setForm((f) => ({ ...f, commissionRate: Number(e.target.value) }))} min={0} max={100} step="0.1" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="markup">Markup Percentage (%)</Label>
                <Input id="markup" type="number" value={form.markupPercentage} onChange={(e) => setForm((f) => ({ ...f, markupPercentage: Number(e.target.value) }))} min={0} max={100} step="0.1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="creditLimit">Credit Limit ($)</Label>
                <Input id="creditLimit" type="number" value={form.creditLimit} onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} min={0} step="0.01" placeholder="No limit" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supPhone">Support Phone</Label>
                <Input id="supPhone" value={form.supportPhone} onChange={(e) => setForm((f) => ({ ...f, supportPhone: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="supEmail">Support Email</Label>
                <Input id="supEmail" type="email" value={form.supportEmail} onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="canCust" checked={form.canCreateCustomers} onChange={(e) => setForm((f) => ({ ...f, canCreateCustomers: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 accent-blue-500" />
                <Label htmlFor="canCust" className="cursor-pointer">Can Create Customers</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="canPkg" checked={form.canCreatePackages} onChange={(e) => setForm((f) => ({ ...f, canCreatePackages: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 accent-blue-500" />
                <Label htmlFor="canPkg" className="cursor-pointer">Can Create Packages</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
                {saving ? "Saving..." : editReseller ? "Update" : "Create Reseller"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewReseller && (
        <Dialog open={!!viewReseller} onOpenChange={() => setViewReseller(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Reseller Details</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <DetailRow label="Business" value={viewReseller.businessName} />
              <DetailRow label="Owner" value={viewReseller.user.name || "—"} />
              <DetailRow label="Email" value={viewReseller.user.email} />
              <DetailRow label="Commission" value={`${Number(viewReseller.commissionRate).toFixed(1)}%`} />
              <DetailRow label="Markup" value={`${Number(viewReseller.markupPercentage).toFixed(1)}%`} />
              <DetailRow label="Balance" value={`$${Number(viewReseller.currentBalance).toFixed(2)}`} />
              <DetailRow label="Credit Limit" value={viewReseller.creditLimit != null ? `$${Number(viewReseller.creditLimit).toFixed(2)}` : "No limit"} />
              <DetailRow label="Customers" value={String(viewReseller._count?.customers ?? "—")} />
              <DetailRow label="Support Phone" value={viewReseller.supportPhone || "—"} />
              <DetailRow label="Support Email" value={viewReseller.supportEmail || "—"} />
              <DetailRow label="Status" value={<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${viewReseller.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{viewReseller.isActive ? "Active" : "Inactive"}</span>} />
              <DetailRow label="Joined" value={format(new Date(viewReseller.createdAt), "MMM d, yyyy")} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteReseller}
        onOpenChange={(o) => !o && setDeleteReseller(null)}
        title="Delete Reseller"
        description={`Delete "${deleteReseller?.businessName}"? Their customers will be unassigned.`}
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
