"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, RefreshCw, Users, DollarSign, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

const EMPTY_FORM = {
  email: "",
  name: "",
  password: "",
  phone: "",
  businessName: "",
  businessRegistration: "",
  taxId: "",
  commissionRate: 5,
  creditLimit: "",
  markupPercentage: 0,
  supportPhone: "",
  supportEmail: "",
  notes: "",
  canCreateCustomers: true,
  canCreatePackages: false,
};

export default function SubResellersPage() {
  const [reseller, setReseller] = useState<any>(null);
  const [subResellers, setSubResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Get current user's reseller profile
  useEffect(() => {
    api
      .get("/isp/resellers?isCurrentUser=true")
      .then((r) => {
        const resellers = r.data.data.resellers || [];
        if (resellers.length > 0) setReseller(resellers[0]);
      })
      .catch(() => {});
  }, []);

  const fetchSubResellers = useCallback(async () => {
    if (!reseller) return;
    setLoading(true);
    try {
      const res = await api.get(`/isp/resellers/${reseller.id}/children`);
      setSubResellers(res.data.data.resellers || res.data.data.children || []);
    } catch {
      toast.error("Failed to load sub-resellers");
    } finally {
      setLoading(false);
    }
  }, [reseller]);

  useEffect(() => {
    fetchSubResellers();
  }, [fetchSubResellers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reseller) return;
    setSaving(true);
    try {
      const payload = {
        user: {
          email: form.email,
          name: form.name,
          password: form.password,
          ...(form.phone && { phone: form.phone }),
        },
        parentResellerId: reseller.id,
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
      toast.success("Sub-reseller created");
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      fetchSubResellers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create sub-reseller");
    } finally {
      setSaving(false);
    }
  };

  const filtered = search
    ? subResellers.filter(
        (r) =>
          r.businessName?.toLowerCase().includes(search.toLowerCase()) ||
          r.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          r.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : subResellers;

  if (!reseller && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">No reseller profile found for your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sub-Resellers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your reseller network</p>
        </div>
        <Button
          onClick={() => { setForm({ ...EMPTY_FORM }); setShowForm(true); }}
          className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm"
        >
          <Plus className="h-4 w-4" /> New Sub-Reseller
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search sub-resellers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubResellers} className="h-9 gap-1.5 text-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Sub-Resellers Table */}
      <Card className="border-slate-200/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Business Name</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Level</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Zone</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customers</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Balance</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      {search ? "No matching sub-resellers" : "No sub-resellers yet"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r: any) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-700">{r.businessName}</p>
                        <p className="text-[11px] text-slate-400">{r.user?.name || "--"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-600 text-[13px]">{r.user?.email || "--"}</p>
                        <p className="text-[11px] text-slate-400">{r.supportPhone || "--"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                          L{r.level ?? 2}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-[13px]">
                        {r.zone?.name || "--"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1 text-slate-600 text-[13px]">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {r._count?.customers ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="flex items-center justify-end gap-1 font-medium text-slate-700 text-[13px]">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          {Number(r.currentBalance ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-[12px]">
                        {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "--"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Sub-Reseller Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sub-Reseller</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              {/* Account Details */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Account Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="srName">Name *</Label>
                    <Input
                      id="srName"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="srEmail">Email *</Label>
                    <Input
                      id="srEmail"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="srPwd">Password *</Label>
                    <Input
                      id="srPwd"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="srPhone">Phone</Label>
                    <Input
                      id="srPhone"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="srBizName">Business Name *</Label>
                  <Input
                    id="srBizName"
                    value={form.businessName}
                    onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="srBizReg">Business Registration</Label>
                  <Input
                    id="srBizReg"
                    value={form.businessRegistration}
                    onChange={(e) => setForm((f) => ({ ...f, businessRegistration: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="srTaxId">Tax ID</Label>
                  <Input
                    id="srTaxId"
                    value={form.taxId}
                    onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="srCommission">Commission Rate (%) *</Label>
                  <Input
                    id="srCommission"
                    type="number"
                    value={form.commissionRate}
                    onChange={(e) => setForm((f) => ({ ...f, commissionRate: Number(e.target.value) }))}
                    min={0}
                    max={100}
                    step="0.1"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="srMarkup">Markup Percentage (%)</Label>
                  <Input
                    id="srMarkup"
                    type="number"
                    value={form.markupPercentage}
                    onChange={(e) => setForm((f) => ({ ...f, markupPercentage: Number(e.target.value) }))}
                    min={0}
                    max={100}
                    step="0.1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="srCreditLimit">Credit Limit ($)</Label>
                  <Input
                    id="srCreditLimit"
                    type="number"
                    value={form.creditLimit}
                    onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                    min={0}
                    step="0.01"
                    placeholder="No limit"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="srSupPhone">Support Phone</Label>
                  <Input
                    id="srSupPhone"
                    value={form.supportPhone}
                    onChange={(e) => setForm((f) => ({ ...f, supportPhone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="srSupEmail">Support Email</Label>
                  <Input
                    id="srSupEmail"
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="srNotes">Notes</Label>
                  <textarea
                    id="srNotes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full h-16 px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="srCanCust"
                    checked={form.canCreateCustomers}
                    onChange={(e) => setForm((f) => ({ ...f, canCreateCustomers: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-500"
                  />
                  <Label htmlFor="srCanCust" className="cursor-pointer">Can Create Customers</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="srCanPkg"
                    checked={form.canCreatePackages}
                    onChange={(e) => setForm((f) => ({ ...f, canCreatePackages: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-500"
                  />
                  <Label htmlFor="srCanPkg" className="cursor-pointer">Can Create Packages</Label>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
                {saving ? "Creating..." : "Create Sub-Reseller"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
