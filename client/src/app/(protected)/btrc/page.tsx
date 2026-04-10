"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Activity, Download, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import api from "@/lib/api";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const fmtBytes = (b: number) => {
  if (b >= 1099511627776) return `${(b / 1099511627776).toFixed(2)} TB`;
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
};
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function BTRCPage() {
  const [tab, setTab] = useState("subscribers");
  const now = new Date();
  const defaultStart = format(subMonths(now, 3), "yyyy-MM-dd");
  const defaultEnd = format(now, "yyyy-MM-dd");

  // Subscribers
  const [subReport, setSubReport] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(true);

  // Bandwidth
  const [bwStart, setBwStart] = useState(defaultStart);
  const [bwEnd, setBwEnd] = useState(defaultEnd);
  const [bwReport, setBwReport] = useState<any>(null);
  const [bwLoading, setBwLoading] = useState(false);

  // Connection logs
  const [logs, setLogs] = useState<any[]>([]);
  const [logMeta, setLogMeta] = useState<any>(null);
  const [logPage, setLogPage] = useState(1);
  const [logLoading, setLogLoading] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setSubLoading(true);
    try { const res = await api.get("/isp/btrc/subscribers"); setSubReport(res.data.data.report); }
    catch { toast.error("Failed to load subscriber report"); }
    finally { setSubLoading(false); }
  }, []);

  const fetchBandwidth = useCallback(async () => {
    setBwLoading(true);
    try { const res = await api.get("/isp/btrc/bandwidth", { params: { startDate: bwStart, endDate: bwEnd } }); setBwReport(res.data.data.report); }
    catch { toast.error("Failed to load bandwidth report"); }
    finally { setBwLoading(false); }
  }, [bwStart, bwEnd]);

  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const res = await api.get("/isp/btrc/connection-logs", { params: { page: logPage, limit: 25 } });
      setLogs(res.data.data.report || []);
      setLogMeta(res.data.meta?.pagination || null);
    } catch { toast.error("Failed to load logs"); }
    finally { setLogLoading(false); }
  }, [logPage]);

  useEffect(() => { if (tab === "subscribers") fetchSubscribers(); }, [tab, fetchSubscribers]);
  useEffect(() => { if (tab === "bandwidth") fetchBandwidth(); }, [tab, fetchBandwidth]);
  useEffect(() => { if (tab === "logs") fetchLogs(); }, [tab, fetchLogs]);

  const Loader = () => <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">BTRC Compliance Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Regulatory reports for Bangladesh Telecommunication Regulatory Commission</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="bandwidth">Bandwidth Usage</TabsTrigger>
          <TabsTrigger value="logs">Connection Logs</TabsTrigger>
        </TabsList>

        {/* Subscribers */}
        <TabsContent value="subscribers" className="space-y-4">
          {subLoading ? <Loader /> : subReport && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total</p><p className="text-2xl font-bold text-slate-800">{subReport.total}</p></CardContent></Card>
                <Card className="border-emerald-200"><CardContent className="p-4"><p className="text-xs text-slate-500">Active</p><p className="text-2xl font-bold text-emerald-600">{subReport.active}</p></CardContent></Card>
                <Card className="border-amber-200"><CardContent className="p-4"><p className="text-xs text-slate-500">Suspended</p><p className="text-2xl font-bold text-amber-600">{subReport.suspended}</p></CardContent></Card>
                <Card className="border-red-200"><CardContent className="p-4"><p className="text-xs text-slate-500">Terminated</p><p className="text-2xl font-bold text-red-600">{subReport.terminated}</p></CardContent></Card>
                <Card className="border-blue-200"><CardContent className="p-4"><p className="text-xs text-slate-500">Pending</p><p className="text-2xl font-bold text-blue-600">{subReport.pending}</p></CardContent></Card>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {subReport.byConnectionType?.length > 0 && (
                  <Card><CardContent className="p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">By Connection Type</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={subReport.byConnectionType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={({ type, percent }: any) => `${type} ${(percent * 100).toFixed(0)}%`}>
                          {subReport.byConnectionType.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent></Card>
                )}
                {subReport.byPackage?.length > 0 && (
                  <Card><CardContent className="p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">Active Subscribers by Package</h3>
                    <Table>
                      <TableHeader><TableRow><TableHead>Package</TableHead><TableHead>Speed</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {subReport.byPackage.map((p: any) => (
                          <TableRow key={p.packageId}><TableCell className="font-medium text-sm">{p.name}</TableCell><TableCell className="text-xs text-slate-500">{p.speed} Mbps</TableCell><TableCell className="text-right">{p.count}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent></Card>
                )}
              </div>

              {subReport.monthlyNewSubscribers?.length > 0 && (
                <Card><CardContent className="p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">Monthly New Subscribers (Last 12 Months)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={subReport.monthlyNewSubscribers.map((r: any) => ({ ...r, month: format(new Date(r.month), "MMM yy") }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="New Subscribers" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent></Card>
              )}

              <p className="text-xs text-slate-400 text-right">Report generated: {format(new Date(subReport.reportDate), "MMM d, yyyy HH:mm")}</p>
            </>
          )}
        </TabsContent>

        {/* Bandwidth */}
        <TabsContent value="bandwidth" className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="date" value={bwStart} onChange={e => setBwStart(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white" />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" value={bwEnd} onChange={e => setBwEnd(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white" />
          </div>

          {bwLoading ? <Loader /> : bwReport && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Download</p><p className="text-xl font-bold text-blue-600">{fmtBytes(bwReport.totalBytesIn)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Upload</p><p className="text-xl font-bold text-emerald-600">{fmtBytes(bwReport.totalBytesOut)}</p></CardContent></Card>
              </div>

              {bwReport.byPackage?.length > 0 && (
                <Card><CardContent className="p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">Bandwidth by Package</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Package</TableHead>
                        <TableHead>Speed</TableHead>
                        <TableHead className="text-right">Subscribers</TableHead>
                        <TableHead className="text-right">Download</TableHead>
                        <TableHead className="text-right">Upload</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bwReport.byPackage.map((p: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{p.packageName}</TableCell>
                          <TableCell className="text-xs text-slate-500">{p.speed}</TableCell>
                          <TableCell className="text-right">{p.subscribers}</TableCell>
                          <TableCell className="text-right text-blue-600">{fmtBytes(p.totalIn)}</TableCell>
                          <TableCell className="text-right text-emerald-600">{fmtBytes(p.totalOut)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Connection Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {logLoading ? <Loader /> : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Download</TableHead>
                        <TableHead className="text-right">Upload</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length > 0 ? logs.map((l: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{l.customerName || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500">{l.username || "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{l.ipAddress || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500">{format(new Date(l.date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right text-xs">{fmtBytes(l.bytesIn)}</TableCell>
                          <TableCell className="text-right text-xs">{fmtBytes(l.bytesOut)}</TableCell>
                          <TableCell className="text-right">{l.sessionsCount || 0}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-12">No connection logs found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {logMeta && logMeta.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-slate-100">
                      <DataTablePagination page={logPage} totalPages={logMeta.totalPages} totalResults={logMeta.totalResults} limit={25} onPageChange={setLogPage} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
