"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600", SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700", PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-red-700", CANCELLED: "bg-slate-100 text-slate-500",
};

export default function MyInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (status) params.status = status;
      const res = await api.get("/customer-portal/invoices", { params });
      setInvoices(res.data.data.invoices || []);
      setMeta(res.data.meta?.pagination || null);
    } catch { toast.error("Failed to load invoices"); }
    finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const viewDetails = async (id: string) => {
    setViewLoading(true);
    try {
      const res = await api.get(`/customer-portal/invoices/${id}`);
      setViewInvoice(res.data.data.invoice);
    } catch { toast.error("Failed to load invoice"); }
    finally { setViewLoading(false); }
  };

  const downloadPDF = async (id: string) => {
    try {
      const res = await api.get(`/customer-portal/invoices/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = `invoice-${id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { toast.error("Failed to download PDF"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">View your billing history and download invoices</p>
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700">
          <option value="">All Statuses</option>
          <option value="SENT">Sent</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
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
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length > 0 ? invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell>{format(new Date(inv.invoiceDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(inv.dueDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">{fmt(Number(inv.totalAmount))}</TableCell>
                      <TableCell className={`text-right font-medium ${Number(inv.balanceDue) > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(Number(inv.balanceDue))}</TableCell>
                      <TableCell><Badge className={`text-[10px] ${STATUS_STYLES[inv.status] || ""}`}>{inv.status.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewDetails(inv.id)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadPDF(inv.id)}><Download className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-12">No invoices found</TableCell></TableRow>
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

      {viewInvoice && (
        <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Invoice {viewInvoice.invoiceNumber}</DialogTitle>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => downloadPDF(viewInvoice.id)}>
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-400">Status</p><Badge className={`text-[10px] ${STATUS_STYLES[viewInvoice.status] || ""}`}>{viewInvoice.status.replace(/_/g, " ")}</Badge></div>
                <div><p className="text-xs text-slate-400">Invoice Date</p><p className="font-medium">{format(new Date(viewInvoice.invoiceDate), "MMM d, yyyy")}</p></div>
                <div><p className="text-xs text-slate-400">Due Date</p><p className="font-medium">{format(new Date(viewInvoice.dueDate), "MMM d, yyyy")}</p></div>
                <div><p className="text-xs text-slate-400">Paid Date</p><p className="font-medium">{viewInvoice.paidDate ? format(new Date(viewInvoice.paidDate), "MMM d, yyyy") : "—"}</p></div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Line Items</p>
                {(viewInvoice.items || []).map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                    <span className="text-slate-600">{item.description} × {item.quantity}</span>
                    <span className="font-medium">{fmt(Number(item.totalPrice))}</span>
                  </div>
                ))}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-semibold">{fmt(Number(viewInvoice.totalAmount))}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Paid</span><span className="font-semibold text-emerald-600">{fmt(Number(viewInvoice.paidAmount))}</span></div>
                  <div className="flex justify-between text-sm border-t border-slate-100 pt-1.5">
                    <span className="font-medium">Balance Due</span>
                    <span className={`font-bold text-lg ${Number(viewInvoice.balanceDue) > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(Number(viewInvoice.balanceDue))}</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
