"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Search, Phone, Mail, Globe, Building2, MapPin, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  name: "", contactName: "", email: "", phone: "",
  address: "", city: "", website: "", taxId: "", notes: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/isp/suppliers", { params: { page, limit: 20, search: search || undefined } });
      setSuppliers(res.data.data.suppliers || []);
      setMeta(res.data.pagination || {});
    } catch { toast.error("Failed to load suppliers"); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Supplier name is required"); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/isp/suppliers/${editId}`, form);
        toast.success("Supplier updated");
      } else {
        await api.post("/isp/suppliers", form);
        toast.success("Supplier created");
      }
      setShowForm(false); setEditId(null); setForm(EMPTY_FORM);
      fetchSuppliers();
    } catch (e: any) { toast.error(e.response?.data?.error?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/isp/suppliers/${id}`);
      toast.success("Supplier deleted");
      fetchSuppliers();
    } catch (e: any) { toast.error(e.response?.data?.error?.message || "Cannot delete supplier"); }
  };

  const openEdit = (s: any) => {
    setForm({
      name: s.name || "", contactName: s.contactName || "", email: s.email || "",
      phone: s.phone || "", address: s.address || "", city: s.city || "",
      website: s.website || "", taxId: s.taxId || "", notes: s.notes || "",
    });
    setEditId(s.id); setShowForm(true);
  };

  const openDetail = async (id: string) => {
    try {
      const res = await api.get(`/isp/suppliers/${id}`);
      setSelectedSupplier(res.data.data.supplier);
      setShowDetail(true);
    } catch { toast.error("Failed to load supplier details"); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your equipment and service suppliers</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm h-9">
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search suppliers by name, contact, email or phone..."
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
          ) : suppliers.length === 0 ? (
            <div className="text-center text-slate-400 py-16">No suppliers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Supplier</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">City</TableHead>
                  <TableHead className="text-xs text-center">Orders</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s: any) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(s.id)}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="font-medium text-slate-700 text-sm">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{s.contactName || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-500">{s.email || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-500">{s.phone || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-500">{s.city || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge className="text-[10px] bg-slate-100 text-slate-600">{s._count?.purchaseOrders || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px]", s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-slate-500 py-1.5">Page {page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Create / Edit Supplier Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Supplier Name <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. MikroTik BD" />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Contact name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="supplier@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+880 1XXX-XXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Dhaka" />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tax / BIN Number</Label>
                <Input value={form.taxId} onChange={(e) => setForm(f => ({ ...f, taxId: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes about this supplier" rows={2} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
              {saving ? "Saving..." : editId ? "Update Supplier" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSupplier?.name || "Supplier Details"}</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <DialogBody className="space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {selectedSupplier.contactName && (
                  <div><p className="text-[11px] text-slate-400">Contact Person</p><p className="text-sm text-slate-700">{selectedSupplier.contactName}</p></div>
                )}
                {selectedSupplier.email && (
                  <div><p className="text-[11px] text-slate-400">Email</p><p className="text-sm text-slate-700 flex items-center gap-1.5"><Mail className="h-3 w-3 text-slate-400" />{selectedSupplier.email}</p></div>
                )}
                {selectedSupplier.phone && (
                  <div><p className="text-[11px] text-slate-400">Phone</p><p className="text-sm text-slate-700 flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" />{selectedSupplier.phone}</p></div>
                )}
                {selectedSupplier.city && (
                  <div><p className="text-[11px] text-slate-400">City</p><p className="text-sm text-slate-700 flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-400" />{selectedSupplier.city}</p></div>
                )}
                {selectedSupplier.website && (
                  <div><p className="text-[11px] text-slate-400">Website</p><p className="text-sm text-slate-700 flex items-center gap-1.5"><Globe className="h-3 w-3 text-slate-400" />{selectedSupplier.website}</p></div>
                )}
                {selectedSupplier.taxId && (
                  <div><p className="text-[11px] text-slate-400">Tax / BIN</p><p className="text-sm text-slate-700">{selectedSupplier.taxId}</p></div>
                )}
                {selectedSupplier.address && (
                  <div className="col-span-2"><p className="text-[11px] text-slate-400">Address</p><p className="text-sm text-slate-700">{selectedSupplier.address}</p></div>
                )}
              </div>

              {selectedSupplier.notes && (
                <div><p className="text-[11px] text-slate-400">Notes</p><p className="text-sm text-slate-600">{selectedSupplier.notes}</p></div>
              )}

              {/* Recent purchase orders */}
              {selectedSupplier.purchaseOrders?.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Recent Purchase Orders</p>
                  <div className="space-y-1.5">
                    {selectedSupplier.purchaseOrders.map((po: any) => (
                      <div key={po.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50">
                        <div>
                          <span className="text-sm font-medium text-slate-700">{po.orderNumber}</span>
                          <span className="text-xs text-slate-400 ml-2">{new Date(po.orderDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">{Number(po.totalAmount).toLocaleString()} BDT</span>
                          <Badge className={cn("text-[9px]",
                            po.status === "RECEIVED" ? "bg-emerald-50 text-emerald-700" :
                            po.status === "ORDERED" ? "bg-blue-50 text-blue-600" :
                            po.status === "CANCELLED" ? "bg-red-50 text-red-600" :
                            "bg-amber-50 text-amber-700"
                          )}>{po.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogBody>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
