"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600", MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700", CRITICAL: "bg-red-100 text-red-700",
};
const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-red-100 text-red-700", ACKNOWLEDGED: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700", SUPPRESSED: "bg-slate-100 text-slate-500",
};

export default function AlertHistoryPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (deviceTypeFilter) params.deviceType = deviceTypeFilter;
      const res = await api.get("/isp/monitoring/alerts", { params });
      setAlerts(res.data.data.alerts || []);
      setMeta(res.data.meta?.pagination || null);
    } catch { toast.error("Failed to load alerts"); }
    finally { setLoading(false); }
  }, [page, statusFilter, severityFilter, deviceTypeFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleAcknowledge = async (id: string) => {
    try { await api.post(`/isp/monitoring/alerts/${id}/acknowledge`); toast.success("Acknowledged"); fetchAlerts(); }
    catch { toast.error("Failed"); }
  };

  const handleResolve = async (id: string) => {
    try { await api.post(`/isp/monitoring/alerts/${id}/resolve`); toast.success("Resolved"); fetchAlerts(); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/monitoring" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Monitoring
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Alert History</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and manage all monitoring alerts</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>
        <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700">
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select value={deviceTypeFilter} onChange={e => { setDeviceTypeFilter(e.target.value); setPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700">
          <option value="">All Devices</option>
          <option value="ROUTER">Routers</option>
          <option value="OLT">OLTs</option>
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
                    <TableHead>Severity</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length > 0 ? alerts.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell><Badge className={`text-[10px] ${SEVERITY_STYLES[a.severity] || ""}`}>{a.severity}</Badge></TableCell>
                      <TableCell className="font-medium text-sm">{a.title}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-48 truncate">{a.description}</TableCell>
                      <TableCell><Badge className="text-[9px] bg-slate-100 text-slate-500">{a.deviceType}</Badge></TableCell>
                      <TableCell><Badge className={`text-[10px] ${STATUS_STYLES[a.status] || ""}`}>{a.status}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500">{format(new Date(a.createdAt), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell className="text-right">
                        {a.status === "ACTIVE" && (
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAcknowledge(a.id)}>Ack</Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleResolve(a.id)}>Resolve</Button>
                          </div>
                        )}
                        {a.status === "ACKNOWLEDGED" && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleResolve(a.id)}>Resolve</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-12">No alerts found</TableCell></TableRow>
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
    </div>
  );
}
