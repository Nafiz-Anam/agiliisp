"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet, DollarSign, Clock, RefreshCw, Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import api from "@/lib/api";
import { PaginationMeta } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

const PAYOUT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const PAYOUT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "CASH", label: "Cash" },
];

const EMPTY_FORM = {
  amount: "",
  payoutMethod: "",
  accountDetails: "",
  notes: "",
};

export default function PayoutsPage() {
  const [reseller, setReseller] = useState<any>(null);
  const [payoutSummary, setPayoutSummary] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

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

  const fetchPayouts = useCallback(async () => {
    if (!reseller) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      const [payoutsRes, summaryRes] = await Promise.all([
        api.get(`/isp/resellers/${reseller.id}/payouts?${params}`),
        api.get(`/isp/resellers/${reseller.id}/payouts/summary`),
      ]);
      setPayouts(payoutsRes.data.data.payouts || []);
      setPagination(payoutsRes.data.meta?.pagination || null);
      setPayoutSummary(summaryRes.data.data);
    } catch {
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [reseller, page]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reseller) return;
    setSaving(true);
    try {
      await api.post(`/isp/resellers/${reseller.id}/payouts`, {
        amount: Number(form.amount),
        payoutMethod: form.payoutMethod,
        ...(form.accountDetails && { accountDetails: form.accountDetails }),
        ...(form.notes && { notes: form.notes }),
      });
      toast.success("Payout request submitted");
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      fetchPayouts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit payout request");
    } finally {
      setSaving(false);
    }
  };

  if (!reseller && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">No reseller profile found for your account.</p>
      </div>
    );
  }

  const balance = Number(reseller?.currentBalance ?? 0);
  const pendingPayout = Number(payoutSummary?.pendingAmount ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payouts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Request and track your payouts</p>
        </div>
        <Button
          onClick={() => { setForm({ ...EMPTY_FORM }); setShowForm(true); }}
          className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm"
        >
          <Plus className="h-4 w-4" /> Request Payout
        </Button>
      </div>

      {/* Balance & Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Current Balance</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">${balance.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-lg">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Pending Payout</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">${pendingPayout.toFixed(2)}</p>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Paid Out</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  ${Number(payoutSummary?.totalPaidOut ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Requests</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {payoutSummary?.totalRequests ?? 0}
                </p>
              </div>
              <div className="bg-violet-50 p-2.5 rounded-lg">
                <RefreshCw className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout History Table */}
      <Card className="border-slate-200/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Method</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Reference</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Processed</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      No payout requests yet
                    </td>
                  </tr>
                ) : (
                  payouts.map((p: any) => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 text-[13px]">
                        {format(new Date(p.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-700 text-[13px]">
                        ${Number(p.amount ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-[13px]">
                        {PAYOUT_METHODS.find((m) => m.value === p.payoutMethod)?.label || p.payoutMethod}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            PAYOUT_STATUS_STYLES[p.status] || "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[13px]">
                        {p.reference || "--"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-[12px]">
                        {p.processedAt
                          ? format(new Date(p.processedAt), "MMM d, yyyy")
                          : "--"}
                      </td>
                    </tr>
                  ))
                )}
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

      {/* Request Payout Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                Available balance: <span className="font-semibold text-slate-800">${balance.toFixed(2)}</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payoutAmount">Amount ($) *</Label>
                <Input
                  id="payoutAmount"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  min={0}
                  max={balance}
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payoutMethod">Payout Method *</Label>
                <Select
                  value={form.payoutMethod}
                  onValueChange={(v) => setForm((f) => ({ ...f, payoutMethod: v }))}
                >
                  <SelectTrigger id="payoutMethod">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYOUT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accountDetails">Account Details</Label>
                <textarea
                  id="accountDetails"
                  value={form.accountDetails}
                  onChange={(e) => setForm((f) => ({ ...f, accountDetails: e.target.value }))}
                  className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder="Bank name, account number, routing number, etc."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payoutNotes">Notes</Label>
                <textarea
                  id="payoutNotes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full h-16 px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  placeholder="Optional notes..."
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !form.payoutMethod || !form.amount}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {saving ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
