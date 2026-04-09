"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const METHOD_STYLES: Record<string, string> = {
  CASH: "bg-emerald-100 text-emerald-700", BANK_TRANSFER: "bg-blue-100 text-blue-700",
  MOBILE_MONEY: "bg-purple-100 text-purple-700", CREDIT_CARD: "bg-amber-100 text-amber-700",
  DEBIT_CARD: "bg-amber-100 text-amber-700", CHECK: "bg-slate-100 text-slate-700",
  ONLINE_PAYMENT: "bg-cyan-100 text-cyan-700", AGENT_COLLECTED: "bg-indigo-100 text-indigo-700",
};

export default function MyPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/customer-portal/payments", { params: { page, limit: 10 } });
      setPayments(res.data.data.payments || []);
      setMeta(res.data.meta?.pagination || null);
    } catch { toast.error("Failed to load payments"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Payment History</h1>
        <p className="text-sm text-slate-500 mt-0.5">View all your past payments</p>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length > 0 ? payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{format(new Date(p.paymentDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-medium">{p.invoice?.invoiceNumber || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${METHOD_STYLES[p.paymentMethod] || "bg-slate-100 text-slate-600"}`}>
                          {p.paymentMethod.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">{p.referenceNumber || "—"}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{fmt(Number(p.amount))}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-12">No payments found</TableCell></TableRow>
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
    </div>
  );
}
