"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Download, TrendingUp, DollarSign, AlertCircle,
  Users, BarChart3, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import api from "@/lib/api";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const downloadReport = async (type: string, fileFormat: "pdf" | "csv", params: Record<string, string>) => {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/isp/reports/export/${type}/${fileFormat}?${query}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${type}-report.${fileFormat}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch { toast.error("Failed to export report"); }
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("revenue");
  const now = new Date();
  const defaultStart = format(subMonths(now, 12), "yyyy-MM-dd");
  const defaultEnd = format(now, "yyyy-MM-dd");

  // ── Revenue state ──
  const [revStart, setRevStart] = useState(defaultStart);
  const [revEnd, setRevEnd] = useState(defaultEnd);
  const [revGranularity, setRevGranularity] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [revData, setRevData] = useState<any[]>([]);
  const [revLoading, setRevLoading] = useState(false);

  // ── Collection state ──
  const [colStart, setColStart] = useState(defaultStart);
  const [colEnd, setColEnd] = useState(defaultEnd);
  const [colData, setColData] = useState<any>(null);
  const [colLoading, setColLoading] = useState(false);

  // ── Aging state ──
  const [agingData, setAgingData] = useState<any>(null);
  const [agingLoading, setAgingLoading] = useState(false);

  // ── Customer Revenue state ──
  const [custData, setCustData] = useState<any[]>([]);
  const [custMeta, setCustMeta] = useState<any>(null);
  const [custPage, setCustPage] = useState(1);
  const [custSearch, setCustSearch] = useState("");
  const [custSortBy, setCustSortBy] = useState("totalPaid");
  const [custSortOrder, setCustSortOrder] = useState<"asc" | "desc">("desc");
  const [custStart, setCustStart] = useState(defaultStart);
  const [custEnd, setCustEnd] = useState(defaultEnd);
  const [custLoading, setCustLoading] = useState(false);

  // ── Fetchers ──
  const fetchRevenue = useCallback(async () => {
    setRevLoading(true);
    try {
      const res = await api.get("/isp/reports/revenue", { params: { startDate: revStart, endDate: revEnd, granularity: revGranularity } });
      setRevData(res.data.data.report || []);
    } catch { toast.error("Failed to load revenue report"); }
    finally { setRevLoading(false); }
  }, [revStart, revEnd, revGranularity]);

  const fetchCollection = useCallback(async () => {
    setColLoading(true);
    try {
      const res = await api.get("/isp/reports/collection", { params: { startDate: colStart, endDate: colEnd } });
      setColData(res.data.data.report || null);
    } catch { toast.error("Failed to load collection report"); }
    finally { setColLoading(false); }
  }, [colStart, colEnd]);

  const fetchAging = useCallback(async () => {
    setAgingLoading(true);
    try {
      const res = await api.get("/isp/reports/aging");
      setAgingData(res.data.data.report || null);
    } catch { toast.error("Failed to load aging report"); }
    finally { setAgingLoading(false); }
  }, []);

  const fetchCustomerRevenue = useCallback(async () => {
    setCustLoading(true);
    try {
      const params: any = { page: custPage, limit: 15, sortBy: custSortBy, sortOrder: custSortOrder };
      if (custSearch) params.search = custSearch;
      if (custStart) params.startDate = custStart;
      if (custEnd) params.endDate = custEnd;
      const res = await api.get("/isp/reports/customer-revenue", { params });
      setCustData(res.data.data.report || []);
      setCustMeta(res.data.meta?.pagination || null);
    } catch { toast.error("Failed to load customer revenue"); }
    finally { setCustLoading(false); }
  }, [custPage, custSearch, custSortBy, custSortOrder, custStart, custEnd]);

  useEffect(() => { if (activeTab === "revenue") fetchRevenue(); }, [activeTab, fetchRevenue]);
  useEffect(() => { if (activeTab === "collection") fetchCollection(); }, [activeTab, fetchCollection]);
  useEffect(() => { if (activeTab === "aging") fetchAging(); }, [activeTab, fetchAging]);
  useEffect(() => { if (activeTab === "customer") fetchCustomerRevenue(); }, [activeTab, fetchCustomerRevenue]);

  const handleCustSort = (col: string) => {
    if (custSortBy === col) setCustSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setCustSortBy(col); setCustSortOrder("desc"); }
    setCustPage(1);
  };

  const Loader = () => <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;

  const ExportButtons = ({ type, params }: { type: string; params: Record<string, string> }) => (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => downloadReport(type, "pdf", params)}>
        <Download className="h-3.5 w-3.5" /> PDF
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => downloadReport(type, "csv", params)}>
        <Download className="h-3.5 w-3.5" /> CSV
      </Button>
    </div>
  );

  const DateRangeFilter = ({ start, end, onStartChange, onEndChange, children }: any) => (
    <div className="flex flex-wrap items-center gap-3">
      <input type="date" value={start} onChange={e => onStartChange(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      <span className="text-slate-400 text-sm">to</span>
      <input type="date" value={end} onChange={e => onEndChange(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
      {children}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Financial Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Revenue analytics, collection tracking, and aging reports</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="aging">Outstanding / Aging</TabsTrigger>
          <TabsTrigger value="customer">Customer Revenue</TabsTrigger>
        </TabsList>

        {/* ══════ Revenue Tab ══════ */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <DateRangeFilter start={revStart} end={revEnd} onStartChange={setRevStart} onEndChange={setRevEnd}>
              <select value={revGranularity} onChange={e => setRevGranularity(e.target.value as any)} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </DateRangeFilter>
            <ExportButtons type="revenue" params={{ startDate: revStart, endDate: revEnd, granularity: revGranularity }} />
          </div>

          {revLoading ? <Loader /> : (
            <>
              {revData.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revData.map(r => ({ ...r, period: format(new Date(r.period), "MMM yyyy") }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip formatter={(value: number) => [fmt(value), "Revenue"]} />
                        <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Payments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revData.length > 0 ? revData.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{format(new Date(r.period), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(r.totalRevenue)}</TableCell>
                          <TableCell className="text-right">{r.paymentCount}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={3} className="text-center text-slate-400 py-8">No data for selected period</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ══════ Collection Tab ══════ */}
        <TabsContent value="collection" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <DateRangeFilter start={colStart} end={colEnd} onStartChange={setColStart} onEndChange={setColEnd} />
            <ExportButtons type="collection" params={{ startDate: colStart, endDate: colEnd }} />
          </div>

          {colLoading ? <Loader /> : colData && (
            <>
              {/* Collection Rate Trend */}
              {colData.collectionTrend?.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">Collection Rate Trend</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={colData.collectionTrend.map((r: any) => ({ ...r, period: format(new Date(r.period), "MMM yyyy") }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                        <Tooltip formatter={(v: number, name: string) => [name === "rate" ? `${v}%` : fmt(v), name === "rate" ? "Collection Rate" : name === "totalInvoiced" ? "Invoiced" : "Collected"]} />
                        <Legend />
                        <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="Collection Rate %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {/* Payment Method Breakdown */}
                {colData.methodBreakdown?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-700 mb-3">Payment Methods</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={colData.methodBreakdown} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={90} label={({ method, percent }: any) => `${method.replace(/_/g, " ")} ${(percent * 100).toFixed(0)}%`}>
                            {colData.methodBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Top Paying Customers */}
                {colData.topCustomers?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-700 mb-3">Top Paying Customers</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Total Paid</TableHead>
                            <TableHead className="text-right">Payments</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {colData.topCustomers.map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.fullName}</TableCell>
                              <TableCell className="text-right text-emerald-600 font-medium">{fmt(c.totalPaid)}</TableCell>
                              <TableCell className="text-right">{c.paymentCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ══════ Aging Tab ══════ */}
        <TabsContent value="aging" className="space-y-4">
          <div className="flex justify-end">
            <ExportButtons type="aging" params={{}} />
          </div>

          {agingLoading ? <Loader /> : agingData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(agingData.buckets as Record<string, { count: number; total: number }>).map(([bucket, info]) => (
                  <Card key={bucket} className={bucket === "90+" ? "border-red-200 bg-red-50" : ""}>
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500 font-medium">{bucket} Days</p>
                      <p className="text-xl font-bold text-slate-800">{fmt(info.total)}</p>
                      <p className="text-xs text-slate-400">{info.count} invoices</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Summary bar */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-700">Total Outstanding: {fmt(agingData.totalOutstanding)}</h3>
                    <Badge className="bg-red-100 text-red-700">{agingData.totalCount} invoices</Badge>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={Object.entries(agingData.buckets).map(([bucket, info]: any) => ({ bucket, total: info.total, count: info.count }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis dataKey="bucket" type="category" tick={{ fontSize: 12 }} width={50} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="total" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Invoice List */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">Outstanding Invoices</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Overdue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agingData.invoices?.length > 0 ? agingData.invoices.map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                          <TableCell className="text-slate-500">{inv.customer?.fullName || "—"}</TableCell>
                          <TableCell className="text-right">{fmt(inv.totalAmount)}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">{fmt(inv.balanceDue)}</TableCell>
                          <TableCell>{format(new Date(inv.dueDate), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <Badge className={`text-[10px] ${inv.daysOverdue > 90 ? "bg-red-100 text-red-700" : inv.daysOverdue > 30 ? "bg-amber-100 text-amber-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {inv.daysOverdue}d
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">No outstanding invoices</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ══════ Customer Revenue Tab ══════ */}
        <TabsContent value="customer" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search customer..." value={custSearch} onChange={e => { setCustSearch(e.target.value); setCustPage(1); }} className="pl-9 h-9 text-sm" />
              </div>
              <input type="date" value={custStart} onChange={e => { setCustStart(e.target.value); setCustPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <span className="text-slate-400 text-sm">to</span>
              <input type="date" value={custEnd} onChange={e => { setCustEnd(e.target.value); setCustPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <ExportButtons type="customer-revenue" params={{ startDate: custStart, endDate: custEnd }} />
          </div>

          {custLoading ? <Loader /> : (
            <Card>
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleCustSort("fullName")}>
                        Customer {custSortBy === "fullName" ? (custSortOrder === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => handleCustSort("totalPaid")}>
                        Total Paid {custSortBy === "totalPaid" ? (custSortOrder === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => handleCustSort("invoiceCount")}>
                        Invoices {custSortBy === "invoiceCount" ? (custSortOrder === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none" onClick={() => handleCustSort("outstanding")}>
                        Outstanding {custSortBy === "outstanding" ? (custSortOrder === "asc" ? "↑" : "↓") : ""}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {custData.length > 0 ? custData.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium text-slate-700">{c.fullName}</span>
                            <span className="text-xs text-slate-400 ml-2">@{c.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">{fmt(c.totalPaid)}</TableCell>
                        <TableCell className="text-right">{c.invoiceCount}</TableCell>
                        <TableCell className="text-right">
                          <span className={c.outstanding > 0 ? "text-red-600 font-medium" : "text-slate-400"}>{fmt(c.outstanding)}</span>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">No customer data found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                {custMeta && custMeta.totalPages > 1 && (
                  <DataTablePagination page={custPage} totalPages={custMeta.totalPages} totalResults={custMeta.totalResults} limit={15} onPageChange={setCustPage} />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
