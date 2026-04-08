"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Download, Search, Filter,
  CheckCircle, XCircle, AlertTriangle, WrenchIcon,
  Activity, Wifi, Users, Package, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import api from "@/lib/api";
import { Router, RouterStatus, PaginationMeta } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type LogTab = "logs" | "connections" | "sync";

interface RouterLog {
  id: string;
  logType: string;
  severity: string;
  timestamp: string;
  message: string;
  topic: string | null;
  username: string | null;
  bytesIn: number | null;
  bytesOut: number | null;
}

interface ActiveConnection {
  id: string;
  name: string;
  service: string;
  address: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
}

interface RouterStats {
  activeConnections: number;
  onlineCustomers: number;
  offlineCustomers: number;
  totalPackages: number;
  lastSync: string | null;
}

const STATUS_BADGE: Record<RouterStatus, string> = {
  ONLINE: "bg-emerald-100 text-emerald-700",
  OFFLINE: "bg-red-100 text-red-700",
  WARNING: "bg-amber-100 text-amber-700",
  MAINTENANCE: "bg-blue-100 text-blue-700",
};

const SEVERITY_STYLES: Record<string, string> = {
  DEBUG: "text-slate-400",
  INFO: "text-blue-600",
  WARNING: "text-amber-600",
  ERROR: "text-red-600",
  CRITICAL: "text-red-700 font-bold",
};

const SEVERITY_DOT: Record<string, string> = {
  DEBUG: "bg-slate-300",
  INFO: "bg-blue-400",
  WARNING: "bg-amber-400",
  ERROR: "bg-red-500",
  CRITICAL: "bg-red-700",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function RouterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<LogTab>("logs");

  const [routerData, setRouterData] = useState<Router | null>(null);
  const [stats, setStats] = useState<RouterStats | null>(null);
  const [logs, setLogs] = useState<RouterLog[]>([]);
  const [connections, setConnections] = useState<ActiveConnection[]>([]);
  const [logPagination, setLogPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [fetchingLogs, setFetchingLogs] = useState(false);

  // Log filters
  const [logPage, setLogPage] = useState(1);
  const [logSearch, setLogSearch] = useState("");
  const [logType, setLogType] = useState("");
  const [severity, setSeverity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchRouter = useCallback(async () => {
    try {
      const [routerRes, statsRes] = await Promise.all([
        api.get(`/isp/routers/${id}`),
        api.get(`/isp/routers/${id}/stats`),
      ]);
      setRouterData(routerRes.data.data);
      setStats(statsRes.data.data);
    } catch {
      toast.error("Router not found");
      router.push("/routers");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        routerId: id,
        page: String(logPage),
        limit: "50",
        ...(logSearch && { search: logSearch }),
        ...(logType && { logType }),
        ...(severity && { severity }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const res = await api.get(`/isp/router-logs?${params}`);
      setLogs(res.data.data.logs || []);
      setLogPagination(res.data.meta.pagination);
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }, [id, logPage, logSearch, logType, severity, dateFrom, dateTo]);

  const fetchConnections = useCallback(async () => {
    setConnectionsLoading(true);
    try {
      const res = await api.get(`/isp/routers/${id}/active-connections`);
      setConnections(res.data.data || []);
    } catch {
      toast.error("Failed to fetch active connections");
    } finally {
      setConnectionsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRouter(); }, [fetchRouter]);
  useEffect(() => { if (tab === "logs") fetchLogs(); }, [tab, fetchLogs]);
  useEffect(() => { if (tab === "connections") fetchConnections(); }, [tab, fetchConnections]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post(`/isp/routers/${id}/sync`);
      toast.success("Sync started — check back in a moment");
      fetchRouter();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleFetchLogs = async () => {
    setFetchingLogs(true);
    try {
      const res = await api.post(`/isp/routers/${id}/fetch-logs`);
      const count = res.data.data?.saved ?? "?";
      toast.success(`Fetched and saved ${count} new log entries`);
      fetchLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to fetch logs from router");
    } finally {
      setFetchingLogs(false);
    }
  };

  const handleDisconnect = async (connectionId: string, username: string) => {
    try {
      await api.post(`/isp/routers/${id}/disconnect`, { connectionId });
      toast.success(`Disconnected ${username}`);
      fetchConnections();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to disconnect");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 border-2 border-orange-200 border-t-orange-600 rounded-lg animate-spin" />
    </div>
  );

  if (!routerData) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/routers">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{routerData.name}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[routerData.status]}`}>
                {routerData.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {routerData.host}:{routerData.port}
              {routerData.location && ` · ${routerData.location}`}
              {routerData.useSSL && <span className="ml-1 text-[10px] bg-blue-50 text-blue-600 px-1 rounded">SSL</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            className="gap-1.5 text-sm h-9"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MiniStat icon={Wifi} label="Active Connections" value={stats.activeConnections} color="emerald" />
          <MiniStat icon={Users} label="Online Customers" value={stats.onlineCustomers} color="blue" />
          <MiniStat icon={Users} label="Offline Customers" value={stats.offlineCustomers} color="slate" />
          <MiniStat icon={Package} label="Packages" value={stats.totalPackages} color="purple" />
          <MiniStat icon={Clock} label="Last Sync" value={stats.lastSync ? format(new Date(stats.lastSync), "HH:mm") : "Never"} color="orange" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {([
            { key: "logs", label: "System Logs", icon: Activity },
            { key: "connections", label: "Active Connections", icon: Wifi },
            { key: "sync", label: "Sync History", icon: RefreshCw },
          ] as { key: LogTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                tab === key
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Logs */}
      {tab === "logs" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search messages..." value={logSearch} onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }} className="pl-9 h-8 text-sm" />
            </div>
            <select value={logType} onChange={(e) => { setLogType(e.target.value); setLogPage(1); }} className="h-8 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none">
              <option value="">All Types</option>
              <option value="PPPOE">PPPoE</option>
              <option value="FIREWALL">Firewall</option>
              <option value="DHCP">DHCP</option>
              <option value="DNS">DNS</option>
              <option value="HOTSPOT">Hotspot</option>
              <option value="WIRELESS">Wireless</option>
              <option value="SYSTEM">System</option>
              <option value="TRAFFIC">Traffic</option>
            </select>
            <select value={severity} onChange={(e) => { setSeverity(e.target.value); setLogPage(1); }} className="h-8 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none">
              <option value="">All Severities</option>
              <option value="DEBUG">Debug</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="ERROR">Error</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setLogPage(1); }} className="h-8 px-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none" />
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setLogPage(1); }} className="h-8 px-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none" />
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={fetchLogs} className="h-8 gap-1 text-sm">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchLogs}
                disabled={fetchingLogs}
                className="h-8 gap-1 text-sm border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Download className="h-3.5 w-3.5" />
                {fetchingLogs ? "Fetching..." : "Fetch from Router"}
              </Button>
            </div>
          </div>

          <Card className="border-slate-200/80">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-4 py-2.5 text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wide w-36">Time</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wide w-20">Severity</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wide w-24">Type</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wide w-28">Username</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-sans font-semibold text-slate-400 uppercase tracking-wide">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsLoading ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-sans">Loading logs...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center font-sans">
                          <Activity className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                          <p className="text-slate-400 text-sm">No logs found. Click "Fetch from Router" to pull latest logs.</p>
                        </td>
                      </tr>
                    ) : logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-2 text-[11px] text-slate-400 whitespace-nowrap">
                          {format(new Date(log.timestamp), "MM-dd HH:mm:ss")}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`flex items-center gap-1.5 text-[11px] font-medium ${SEVERITY_STYLES[log.severity] || "text-slate-500"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[log.severity] || "bg-slate-300"}`} />
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[10px] font-sans font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {log.logType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[12px] text-orange-600">{log.username || "—"}</td>
                        <td className="px-3 py-2 text-[12px] text-slate-700 max-w-[400px] truncate">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logPagination && (
                <div className="px-4 py-3 border-t border-slate-100">
                  <DataTablePagination page={logPagination.page} totalPages={logPagination.totalPages} totalResults={logPagination.totalResults} hasNext={logPagination.hasNext} hasPrev={logPagination.hasPrev} onPageChange={setLogPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Active Connections */}
      {tab === "connections" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{connections.length} active connection{connections.length !== 1 ? "s" : ""}</p>
            <Button variant="outline" size="sm" onClick={fetchConnections} className="h-8 gap-1.5 text-sm">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
          <Card className="border-slate-200/80">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Username</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Service</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">IP Address</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Uptime</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Traffic</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody>
                  {connectionsLoading ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading connections...</td></tr>
                  ) : connections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <Wifi className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                        <p className="text-slate-400 text-sm">No active connections</p>
                      </td>
                    </tr>
                  ) : connections.map((conn) => (
                    <tr key={conn.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-medium text-slate-700">{conn.name}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{conn.service}</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 text-[13px]">{conn.address}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-[13px]">{conn.uptime}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-[12px] text-emerald-600">↓ {formatBytes(conn.bytesIn)}</p>
                        <p className="text-[12px] text-blue-600">↑ {formatBytes(conn.bytesOut)}</p>
                      </td>
                      <td className="px-3 py-3.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-500 hover:bg-red-50"
                          onClick={() => handleDisconnect(conn.id, conn.name)}
                        >
                          Kick
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Sync History */}
      {tab === "sync" && <SyncHistoryTab routerId={id} />}
    </div>
  );
}

function SyncHistoryTab({ routerId }: { routerId: string }) {
  const [syncs, setSyncs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/isp/routers/${routerId}/sync-logs?limit=20`).then((r) => {
      setSyncs(r.data.data?.syncs || r.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [routerId]);

  const SYNC_BADGE: Record<string, string> = {
    SUCCESS: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-red-100 text-red-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    PENDING: "bg-slate-100 text-slate-600",
    PARTIAL_SUCCESS: "bg-amber-100 text-amber-700",
  };

  return (
    <Card className="border-slate-200/80">
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Started</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Type</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Direction</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Records</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Triggered By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
            ) : syncs.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No sync history</td></tr>
            ) : syncs.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-5 py-3.5 text-slate-500 text-[12px]">{format(new Date(s.startedAt), "MMM d, HH:mm:ss")}</td>
                <td className="px-4 py-3.5">
                  <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{s.syncType || "—"}</span>
                </td>
                <td className="px-4 py-3.5 text-slate-500 text-[12px]">{s.direction?.replace("_", " → ") || "—"}</td>
                <td className="px-4 py-3.5">
                  <p className="text-[12px] text-emerald-600">+{s.recordsCreated ?? 0} created</p>
                  <p className="text-[12px] text-blue-600">~{s.recordsUpdated ?? 0} updated</p>
                  {s.recordsFailed > 0 && <p className="text-[12px] text-red-500">✗{s.recordsFailed} failed</p>}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SYNC_BADGE[s.status] || "bg-slate-100 text-slate-600"}`}>
                    {s.status?.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-500 text-[12px]">{s.user?.name || "System"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    slate: "bg-slate-50 border-slate-100 text-slate-500",
    purple: "bg-purple-50 border-purple-100 text-purple-600",
    orange: "bg-orange-50 border-orange-100 text-orange-600",
  };
  const c = colors[color] || colors.slate;
  return (
    <div className={`rounded-xl border px-4 py-3 ${c.split(" ").slice(0, 2).join(" ")}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${c.split(" ")[2]}`} />
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
