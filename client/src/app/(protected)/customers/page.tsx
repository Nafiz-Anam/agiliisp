"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Search, Wifi, WifiOff, RefreshCw, MoreHorizontal,
  UserPlus, Eye, Pencil, Trash2, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SortableHeader } from "@/components/ui/sortable-header";
import api from "@/lib/api";
import { IspCustomer, CustomerStatus, PaginationMeta, Router, InternetPackage, Reseller } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<CustomerStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SUSPENDED: "bg-amber-100 text-amber-700",
  TERMINATED: "bg-red-100 text-red-700",
  PENDING_ACTIVATION: "bg-blue-100 text-blue-700",
};

const EMPTY_FORM = {
  username: "",
  password: "",
  fullName: "",
  email: "",
  phone: "",
  connectionType: "PPPOE",
  routerId: "",
  packageId: "",
  resellerId: "",
  address: "",
  city: "",
  ipAddress: "",
  macAddress: "",
  billingCycle: 1,
  status: "PENDING_ACTIVATION",
  // BD-specific
  nidNumber: "",
  zoneId: "",
  collectorId: "",
  billingType: "POSTPAID",
  building: "",
  floor: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<IspCustomer[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Options for dropdowns
  const [routers, setRouters] = useState<Router[]>([]);
  const [packages, setPackages] = useState<InternetPackage[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<IspCustomer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<IspCustomer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<IspCustomer | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Bulk operations
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkPackageId, setBulkPackageId] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (selected.size === customers.length) setSelected(new Set());
    else setSelected(new Set(customers.map(c => c.id)));
  };

  const executeBulkAction = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selected);
      let res;
      if (bulkAction === "suspend") {
        res = await api.post("/isp/customers/bulk-suspend", { ids, reason: bulkReason || "Bulk suspended" });
      } else if (bulkAction === "activate") {
        res = await api.post("/isp/customers/bulk-activate", { ids });
      } else if (bulkAction === "change-package") {
        if (!bulkPackageId) { toast.error("Select a package"); setBulkLoading(false); return; }
        res = await api.post("/isp/customers/bulk-change-package", { ids, packageId: bulkPackageId });
      }
      const r = res?.data?.data;
      toast.success(`${r?.success || 0} succeeded, ${r?.failed || 0} failed`);
      setSelected(new Set());
      setBulkAction(null);
      setBulkReason("");
      setBulkPackageId("");
      fetchCustomers();
    } catch { toast.error("Bulk action failed"); }
    finally { setBulkLoading(false); }
  };

  const fetchCustomers = useCallback(async () => {
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
      const res = await api.get(`/isp/customers?${params}`);
      setCustomers(res.data.data.customers);
      setPagination(res.data.meta.pagination);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    api.get("/isp/routers?limit=100").then((r) => setRouters(r.data.data.routers || [])).catch(() => {});
    api.get("/isp/resellers?limit=100").then((r) => setResellers(r.data.data.resellers || [])).catch(() => {});
  }, []);

  const handleRouterChange = (routerId: string) => {
    setForm((f) => ({ ...f, routerId, packageId: "" }));
    if (routerId) {
      api.get(`/isp/packages?routerId=${routerId}&limit=100`).then((r) => setPackages(r.data.data.packages || [])).catch(() => {});
    } else {
      setPackages([]);
    }
  };

  const openCreate = () => {
    setEditCustomer(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (c: IspCustomer) => {
    setEditCustomer(c);
    setForm({
      username: c.username,
      password: "",
      fullName: c.fullName,
      email: c.email || "",
      phone: c.phone || "",
      connectionType: c.connectionType,
      routerId: c.router.id,
      packageId: c.package.id,
      resellerId: c.reseller?.id || "",
      address: c.address || "",
      city: c.city || "",
      ipAddress: c.ipAddress || "",
      macAddress: c.macAddress || "",
      billingCycle: c.billingCycle,
      status: c.status,
      nidNumber: (c as any).nidNumber || "",
      zoneId: (c as any).zoneId || "",
      collectorId: (c as any).collectorId || "",
      billingType: (c as any).billingType || "POSTPAID",
      building: (c as any).building || "",
      floor: (c as any).floor || "",
    });
    handleRouterChange(c.router.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        username: form.username,
        fullName: form.fullName,
        connectionType: form.connectionType,
        routerId: form.routerId,
        packageId: form.packageId,
        billingCycle: Number(form.billingCycle),
        status: form.status,
        ...(form.email && { email: form.email }),
        ...(form.phone && { phone: form.phone }),
        ...(form.address && { address: form.address }),
        ...(form.city && { city: form.city }),
        ...(form.ipAddress && { ipAddress: form.ipAddress }),
        ...(form.macAddress && { macAddress: form.macAddress }),
        ...(form.resellerId && { resellerId: form.resellerId }),
      };
      if (!editCustomer && form.password) payload.password = form.password;

      if (editCustomer) {
        await api.patch(`/isp/customers/${editCustomer.id}`, payload);
        toast.success("Customer updated");
      } else {
        await api.post("/isp/customers", payload);
        toast.success("Customer created");
      }
      setShowForm(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCustomer) return;
    try {
      await api.delete(`/isp/customers/${deleteCustomer.id}`);
      toast.success("Customer deleted");
      setDeleteCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete customer");
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
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage ISP customers</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm">
          <Plus className="h-4 w-4" /> New Customer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, username, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_ACTIVATION">Pending</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <Button variant="outline" size="sm" onClick={fetchCustomers} className="h-9 gap-1.5 text-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">{selected.size} customer{selected.size > 1 ? "s" : ""} selected</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => setBulkAction("suspend")}>
                Suspend
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setBulkAction("activate")}>
                Activate
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => setBulkAction("change-package")}>
                Change Package
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Action Dialogs */}
      {bulkAction && (
        <Dialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {bulkAction === "suspend" ? "Bulk Suspend" : bulkAction === "activate" ? "Bulk Activate" : "Bulk Change Package"} ({selected.size} customers)
              </DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              {bulkAction === "suspend" && (
                <div><Label>Reason</Label><Input value={bulkReason} onChange={e => setBulkReason(e.target.value)} placeholder="Non-payment, etc." /></div>
              )}
              {bulkAction === "change-package" && (
                <div>
                  <Label>New Package</Label>
                  <select value={bulkPackageId} onChange={e => setBulkPackageId(e.target.value)} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                    <option value="">Select package...</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.downloadSpeed}/{p.uploadSpeed} Mbps)</option>)}
                  </select>
                </div>
              )}
              {bulkAction === "activate" && (
                <p className="text-sm text-slate-600">This will reactivate {selected.size} customer{selected.size > 1 ? "s" : ""} and restore their service.</p>
              )}
              <Button onClick={executeBulkAction} disabled={bulkLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                {bulkLoading ? "Processing..." : "Confirm"}
              </Button>
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}

      {/* Table */}
      <Card className="border-slate-200/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" checked={customers.length > 0 && selected.size === customers.length} onChange={toggleSelectAll} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="text-left px-5 py-3">
                    <SortableHeader label="Customer" sortKey="fullName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Connection</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Package</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Router</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Online</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3">
                    <SortableHeader label="Next Billing" sortKey="nextBillingDate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">No customers found</td></tr>
                ) : customers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-3.5">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700">{c.fullName}</p>
                      <p className="text-[11px] text-slate-400">{c.username}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {c.connectionType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-700 text-[13px]">{c.package.name}</p>
                      <p className="text-[11px] text-slate-400">{c.package.downloadSpeed}/{c.package.uploadSpeed} Mbps</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-[13px]">{c.router.name}</td>
                    <td className="px-4 py-3.5">
                      {c.isOnline ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-[12px]">
                          <Wifi className="h-3.5 w-3.5" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400 text-[12px]">
                          <WifiOff className="h-3.5 w-3.5" /> Offline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status]}`}>
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[12px]">
                      {c.nextBillingDate ? format(new Date(c.nextBillingDate), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-3 py-3.5 relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {openMenu === c.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36" onMouseLeave={() => setOpenMenu(null)}>
                          <Link href={`/customers/${c.id}`} onClick={() => setOpenMenu(null)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Eye className="h-3.5 w-3.5" /> View
                          </Link>
                          <button onClick={() => { openEdit(c); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => { setDeleteCustomer(c); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit Customer" : "New Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username *</Label>
                <Input id="username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required disabled={!!editCustomer} />
              </div>
              {!editCustomer && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editCustomer} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Connection Type *</Label>
                <select
                  value={form.connectionType}
                  onChange={(e) => setForm((f) => ({ ...f, connectionType: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  required
                >
                  <option value="PPPOE">PPPoE</option>
                  <option value="HOTSPOT">Hotspot</option>
                  <option value="STATIC">Static</option>
                  <option value="DHCP">DHCP</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Router *</Label>
                <select
                  value={form.routerId}
                  onChange={(e) => handleRouterChange(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  required
                >
                  <option value="">Select router...</option>
                  {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Package *</Label>
                <select
                  value={form.packageId}
                  onChange={(e) => setForm((f) => ({ ...f, packageId: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  required
                  disabled={!form.routerId}
                >
                  <option value="">Select package...</option>
                  {packages.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.downloadSpeed}/{p.uploadSpeed} Mbps (${p.price})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Reseller</Label>
                <select
                  value={form.resellerId}
                  onChange={(e) => setForm((f) => ({ ...f, resellerId: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Direct (no reseller)</option>
                  {resellers.map((r) => <option key={r.id} value={r.id}>{r.businessName}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  required
                >
                  <option value="PENDING_ACTIVATION">Pending Activation</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input id="ipAddress" value={form.ipAddress} onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))} placeholder="192.168.1.x" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="macAddress">MAC Address</Label>
                <Input id="macAddress" value={form.macAddress} onChange={(e) => setForm((f) => ({ ...f, macAddress: e.target.value }))} placeholder="AA:BB:CC:DD:EE:FF" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
            </div>

            {/* Bangladesh-specific fields */}
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Additional Info</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>NID Number</Label>
                  <Input value={form.nidNumber} onChange={(e) => setForm((f) => ({ ...f, nidNumber: e.target.value }))} placeholder="National ID" />
                </div>
                <div className="space-y-1.5">
                  <Label>Billing Type</Label>
                  <select value={form.billingType} onChange={(e) => setForm((f) => ({ ...f, billingType: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                    <option value="POSTPAID">Postpaid</option>
                    <option value="PREPAID">Prepaid</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Building</Label>
                  <Input value={form.building} onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))} placeholder="Building name/number" />
                </div>
                <div className="space-y-1.5">
                  <Label>Floor</Label>
                  <Input value={form.floor} onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))} placeholder="e.g. 3rd" />
                </div>
              </div>
            </div>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
                {saving ? "Saving..." : editCustomer ? "Update Customer" : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewCustomer && (
        <Dialog open={!!viewCustomer} onOpenChange={() => setViewCustomer(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <DetailRow label="Full Name" value={viewCustomer.fullName} />
              <DetailRow label="Username" value={viewCustomer.username} />
              <DetailRow label="Email" value={viewCustomer.email || "—"} />
              <DetailRow label="Phone" value={viewCustomer.phone || "—"} />
              <DetailRow label="Status" value={
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[viewCustomer.status]}`}>
                  {viewCustomer.status.replace("_", " ")}
                </span>
              } />
              <DetailRow label="Connection" value={viewCustomer.connectionType} />
              <DetailRow label="Package" value={`${viewCustomer.package.name} (${viewCustomer.package.downloadSpeed}/${viewCustomer.package.uploadSpeed} Mbps)`} />
              <DetailRow label="Router" value={viewCustomer.router.name} />
              <DetailRow label="IP Address" value={viewCustomer.ipAddress || "—"} />
              <DetailRow label="MAC Address" value={viewCustomer.macAddress || "—"} />
              <DetailRow label="Online" value={viewCustomer.isOnline ? "Yes" : "No"} />
              <DetailRow label="Next Billing" value={viewCustomer.nextBillingDate ? format(new Date(viewCustomer.nextBillingDate), "MMM d, yyyy") : "—"} />
              <DetailRow label="Data Used" value={viewCustomer.dataUsed} />
              <DetailRow label="Reseller" value={viewCustomer.reseller?.businessName || "Direct"} />
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteCustomer}
        onOpenChange={(o) => !o && setDeleteCustomer(null)}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deleteCustomer?.fullName}"? This cannot be undone.`}
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
