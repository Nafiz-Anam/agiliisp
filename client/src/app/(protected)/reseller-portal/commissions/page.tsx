"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign, TrendingUp, Calendar, Wallet, RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import api from "@/lib/api";
import { PaginationMeta } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CommissionsPage() {
  const [reseller, setReseller] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const fetchCommissions = useCallback(async () => {
    if (!reseller) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        sortBy: "createdAt",
        sortOrder: "desc",
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const [commissionsRes, summaryRes] = await Promise.all([
        api.get(`/isp/resellers/${reseller.id}/commissions?${params}`),
        api.get(`/isp/resellers/${reseller.id}/commissions/summary`),
      ]);
      setCommissions(commissionsRes.data.data.commissions || []);
      setPagination(commissionsRes.data.meta?.pagination || null);
      setSummary(summaryRes.data.data);
    } catch {
      toast.error("Failed to load commissions");
    } finally {
      setLoading(false);
    }
  }, [reseller, page, dateFrom, dateTo]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  if (!reseller && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">No reseller profile found for your account.</p>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Earned",
      value: `$${Number(summary?.totalEarned ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "This Month",
      value: `$${Number(summary?.thisMonth ?? 0).toFixed(2)}`,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Last Month",
      value: `$${Number(summary?.lastMonth ?? 0).toFixed(2)}`,
      icon: Calendar,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Current Balance",
      value: `$${Number(reseller?.currentBalance ?? 0).toFixed(2)}`,
      icon: Wallet,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Commission History</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track your earnings and commissions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <Card key={s.label} className="border-slate-200/80">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                </div>
                <div className={`${s.bg} p-2.5 rounded-lg`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="h-9 text-sm w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="h-9 text-sm w-40"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
            className="h-9 text-sm"
          >
            Clear
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={fetchCommissions} className="h-9 gap-1.5 text-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Commission Table */}
      <Card className="border-slate-200/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Source</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Level</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Base Amount</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Rate</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Commission</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      No commissions found
                    </td>
                  </tr>
                ) : (
                  commissions.map((c: any) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 text-[13px]">
                        {format(new Date(c.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.source === "PAYMENT"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          {c.source}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-[13px]">
                        {c.customer?.fullName || c.customerId || "--"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          L{c.level ?? 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-600 text-[13px]">
                        ${Number(c.baseAmount ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500 text-[13px]">
                        {Number(c.rate ?? 0).toFixed(1)}%
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-emerald-600 text-[13px]">
                        +${Number(c.commissionAmount ?? 0).toFixed(2)}
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
    </div>
  );
}
