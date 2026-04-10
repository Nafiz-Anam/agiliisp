"use client";

import { useEffect, useState, useCallback } from "react";
import { Smartphone, CheckCircle, AlertCircle, Clock, Link2 } from "lucide-react";
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

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PROVIDER_STYLES: Record<string, string> = {
  BKASH: "bg-pink-100 text-pink-700", NAGAD: "bg-orange-100 text-orange-700", ROCKET: "bg-purple-100 text-purple-700",
};
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700", PROCESSED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700", NO_INVOICE: "bg-blue-100 text-blue-700",
};

export default function MobilePaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Manual match
  const [matchPayment, setMatchPayment] = useState<any>(null);
  const [matchForm, setMatchForm] = useState({ customerId: "", invoiceId: "" });
  const [matching, setMatching] = useState(false);

  // Manual entry
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ provider: "BKASH", transactionId: "", senderNumber: "", receiverNumber: "", amount: "" });
  const [manualSaving, setManualSaving] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (providerFilter) params.provider = providerFilter;
      const res = await api.get("/isp/mobile-payments", { params });
      setPayments(res.data.data.payments || []);
      setMeta(res.data.meta?.pagination || null);
    } catch { toast.error("Failed to load payments"); }
    finally { setLoading(false); }
  }, [page, statusFilter, providerFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleMatch = async () => {
    if (!matchForm.customerId || !matchForm.invoiceId) { toast.error("Customer ID and Invoice ID required"); return; }
    setMatching(true);
    try {
      await api.post(`/isp/mobile-payments/${matchPayment.id}/match`, matchForm);
      toast.success("Payment matched and credited!");
      setMatchPayment(null); fetchPayments();
    } catch { toast.error("Failed to match"); }
    finally { setMatching(false); }
  };

  const handleManualEntry = async () => {
    if (!manualForm.transactionId || !manualForm.senderNumber || !manualForm.amount) { toast.error("Fill required fields"); return; }
    setManualSaving(true);
    try {
      await api.post("/isp/mobile-payments/webhook", { ...manualForm, amount: Number(manualForm.amount) });
      toast.success("Payment processed!");
      setShowManual(false);
      setManualForm({ provider: "BKASH", transactionId: "", senderNumber: "", receiverNumber: "", amount: "" });
      fetchPayments();
    } catch { toast.error("Failed to process"); }
    finally { setManualSaving(false); }
  };

  const pendingCount = payments.filter(p => p.status === "PENDING").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mobile Payments</h1>
          <p className="text-sm text-slate-500 mt-0.5">bKash, Nagad, Rocket payments — auto-matched to customer invoices</p>
        </div>
        <Button onClick={() => setShowManual(true)} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm h-9">
          <Smartphone className="h-4 w-4" /> Manual Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div><p className="text-xs text-slate-500">Pending</p><p className="text-lg font-bold text-amber-600">{pendingCount}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSED">Processed</option>
          <option value="FAILED">Failed</option>
          <option value="NO_INVOICE">No Invoice</option>
        </select>
        <select value={providerFilter} onChange={e => { setProviderFilter(e.target.value); setPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
          <option value="">All Providers</option>
          <option value="BKASH">bKash</option>
          <option value="NAGAD">Nagad</option>
          <option value="ROCKET">Rocket</option>
        </select>
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
                    <TableHead>Provider</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length > 0 ? payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell><Badge className={`text-[10px] ${PROVIDER_STYLES[p.provider] || "bg-slate-100"}`}>{p.provider}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{p.transactionId}</TableCell>
                      <TableCell className="text-sm">{p.senderNumber}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{fmt(Number(p.amount))}</TableCell>
                      <TableCell><Badge className={`text-[10px] ${STATUS_STYLES[p.status] || ""}`}>{p.status}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{format(new Date(p.createdAt), "MMM d HH:mm")}</TableCell>
                      <TableCell className="text-right">
                        {(p.status === "PENDING" || p.status === "NO_INVOICE") && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setMatchPayment(p); setMatchForm({ customerId: p.customerId || "", invoiceId: p.invoiceId || "" }); }}>
                            <Link2 className="h-3 w-3" /> Match
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-12">No mobile payments found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {meta && meta.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-100">
                  <DataTablePagination page={page} totalPages={meta.totalPages} totalResults={meta.totalResults} limit={20} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Manual Match Dialog */}
      {matchPayment && (
        <Dialog open={!!matchPayment} onOpenChange={() => setMatchPayment(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Match Payment to Invoice</DialogTitle></DialogHeader>
            <DialogBody className="space-y-3">
              <p className="text-sm text-slate-600">
                <strong>{matchPayment.provider}</strong> payment of <strong>{fmt(Number(matchPayment.amount))}</strong> from {matchPayment.senderNumber}
              </p>
              <div><Label>Customer ID</Label><Input value={matchForm.customerId} onChange={e => setMatchForm(f => ({ ...f, customerId: e.target.value }))} placeholder="Paste customer ID" /></div>
              <div><Label>Invoice ID</Label><Input value={matchForm.invoiceId} onChange={e => setMatchForm(f => ({ ...f, invoiceId: e.target.value }))} placeholder="Paste invoice ID" /></div>
              <Button onClick={handleMatch} disabled={matching} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                {matching ? "Matching..." : "Match & Credit"}
              </Button>
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}

      {/* Manual Entry Dialog */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Manual Mobile Payment Entry</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label>Provider</Label>
              <select value={manualForm.provider} onChange={e => setManualForm(f => ({ ...f, provider: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
              </select>
            </div>
            <div><Label>Transaction ID</Label><Input value={manualForm.transactionId} onChange={e => setManualForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="e.g. ABC123XYZ" /></div>
            <div><Label>Sender Number</Label><Input value={manualForm.senderNumber} onChange={e => setManualForm(f => ({ ...f, senderNumber: e.target.value }))} placeholder="01XXXXXXXXX" /></div>
            <div><Label>Amount</Label><Input type="number" value={manualForm.amount} onChange={e => setManualForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
            <Button onClick={handleManualEntry} disabled={manualSaving} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              {manualSaving ? "Processing..." : "Process Payment"}
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
