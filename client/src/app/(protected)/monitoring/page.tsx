"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity, Cpu, HardDrive, Clock, AlertTriangle, Wifi,
  WifiOff, RefreshCw, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
};

const STATUS_COLORS: Record<string, string> = {
  ONLINE: "bg-emerald-500", ACTIVE: "bg-emerald-500", APPROVED: "bg-blue-500",
  OFFLINE: "bg-red-500", WARNING: "bg-amber-500", MAINTENANCE: "bg-purple-500",
  ERROR: "bg-red-500", INACTIVE: "bg-slate-400",
};

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600", MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700", CRITICAL: "bg-red-100 text-red-700",
};

export default function MonitoringPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get("/isp/monitoring/overview");
      setOverview(res.data.data);
    } catch { toast.error("Failed to load monitoring data"); }
    finally { setLoading(false); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get("/isp/monitoring/alerts", { params: { status: "ACTIVE", limit: 10 } });
      setAlerts(res.data.data.alerts || []);
    } catch { /* silent */ }
  }, []);

  const fetchDeviceMetrics = async (deviceId: string) => {
    setMetricsLoading(true);
    try {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [cpuRes, memRes] = await Promise.all([
        api.get(`/isp/monitoring/devices/${deviceId}/metrics`, { params: { metricType: "CPU_USAGE", from, limit: 200 } }),
        api.get(`/isp/monitoring/devices/${deviceId}/metrics`, { params: { metricType: "MEMORY_USAGE", from, limit: 200 } }),
      ]);
      const cpuMetrics = (cpuRes.data.data.metrics || []).reverse();
      const memMetrics = (memRes.data.data.metrics || []).reverse();

      // Merge by timestamp
      const merged: any[] = [];
      const allTimes = new Set([...cpuMetrics.map((m: any) => m.collectedAt), ...memMetrics.map((m: any) => m.collectedAt)]);
      const cpuMap = new Map(cpuMetrics.map((m: any) => [m.collectedAt, m.value]));
      const memMap = new Map(memMetrics.map((m: any) => [m.collectedAt, m.value]));
      Array.from(allTimes).sort().forEach(t => {
        merged.push({ time: format(new Date(t as string), "HH:mm"), cpu: cpuMap.get(t) || null, memory: memMap.get(t) || null });
      });
      setMetricsData(merged);
    } catch { toast.error("Failed to load metrics"); }
    finally { setMetricsLoading(false); }
  };

  useEffect(() => { fetchOverview(); fetchAlerts(); }, [fetchOverview, fetchAlerts]);

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => { fetchOverview(); fetchAlerts(); }, 30000);
    return () => clearInterval(timer);
  }, [fetchOverview, fetchAlerts]);

  const handleSelectDevice = (device: any) => {
    setSelectedDevice(device);
    fetchDeviceMetrics(device.id);
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.post(`/isp/monitoring/alerts/${alertId}/acknowledge`);
      toast.success("Alert acknowledged");
      fetchAlerts();
    } catch { toast.error("Failed"); }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await api.post(`/isp/monitoring/alerts/${alertId}/resolve`);
      toast.success("Alert resolved");
      fetchAlerts();
    } catch { toast.error("Failed"); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!overview) return null;

  const allDevices = [...overview.routers, ...overview.olts];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Network Monitoring</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time device status and SNMP metrics</p>
        </div>
        <div className="flex gap-2">
          <Link href="/monitoring/alerts">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <AlertTriangle className="h-3.5 w-3.5" /> Alert History
              {overview.activeAlerts > 0 && <Badge className="bg-red-500 text-white text-[10px] ml-1">{overview.activeAlerts}</Badge>}
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => { fetchOverview(); fetchAlerts(); }}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><Activity className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-slate-500">Total Devices</p><p className="text-xl font-bold text-slate-800">{allDevices.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Wifi className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-xs text-slate-500">Online</p><p className="text-xl font-bold text-emerald-600">{allDevices.filter(d => d.status === "ONLINE" || d.status === "ACTIVE").length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center"><WifiOff className="h-5 w-5 text-red-500" /></div>
            <div><p className="text-xs text-slate-500">Offline</p><p className="text-xl font-bold text-red-500">{allDevices.filter(d => d.status === "OFFLINE" || d.status === "ERROR").length}</p></div>
          </CardContent>
        </Card>
        <Card className={overview.criticalAlerts > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-slate-500">Active Alerts</p><p className="text-xl font-bold text-slate-800">{overview.activeAlerts}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Device Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allDevices.map((device: any) => (
          <Card
            key={`${device.deviceType}-${device.id}`}
            className={`cursor-pointer transition-all hover:shadow-md ${selectedDevice?.id === device.id ? "ring-2 ring-blue-400" : ""}`}
            onClick={() => handleSelectDevice(device)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[device.status] || "bg-slate-400"}`} />
                  <span className="font-semibold text-slate-700 text-sm">{device.name}</span>
                </div>
                <Badge className="text-[9px] bg-slate-100 text-slate-500">{device.deviceType}</Badge>
              </div>
              <div className="text-xs text-slate-400 mb-3">{device.host}</div>
              {device.snmpEnabled && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-1"><Cpu className="h-3 w-3" /> CPU</div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${device.cpuUsage > 80 ? "bg-red-500" : device.cpuUsage > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(device.cpuUsage, 100)}%` }} />
                    </div>
                    <p className="text-xs font-medium text-slate-600 mt-1">{device.cpuUsage}%</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-1"><HardDrive className="h-3 w-3" /> RAM</div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${device.memoryUsage > 90 ? "bg-red-500" : device.memoryUsage > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(device.memoryUsage, 100)}%` }} />
                    </div>
                    <p className="text-xs font-medium text-slate-600 mt-1">{device.memoryUsage}%</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-1"><Clock className="h-3 w-3" /> Up</div>
                    <p className="text-xs font-medium text-slate-600 mt-2.5">{fmtUptime(device.uptime)}</p>
                  </div>
                </div>
              )}
              {!device.snmpEnabled && (
                <p className="text-xs text-slate-400 italic">SNMP not configured</p>
              )}
            </CardContent>
          </Card>
        ))}
        {allDevices.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-12">No devices found. Configure SNMP community on your routers or OLTs.</div>
        )}
      </div>

      {/* Metrics Chart */}
      {selectedDevice && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-slate-700 mb-3">
              {selectedDevice.name} — CPU & Memory (24h)
            </h3>
            {metricsLoading ? (
              <div className="flex items-center justify-center py-12"><div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : metricsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={metricsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} name="CPU" />
                  <Line type="monotone" dataKey="memory" stroke="#f59e0b" strokeWidth={2} dot={false} name="Memory" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 py-8">No metrics data available yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Active Alerts
              </h3>
              <Link href="/monitoring/alerts" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert: any) => (
                  <TableRow key={alert.id}>
                    <TableCell><Badge className={`text-[10px] ${SEVERITY_STYLES[alert.severity] || ""}`}>{alert.severity}</Badge></TableCell>
                    <TableCell className="font-medium text-sm">{alert.title}</TableCell>
                    <TableCell className="text-xs text-slate-500">{alert.deviceType}:{alert.deviceId.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs text-slate-500">{format(new Date(alert.createdAt), "MMM d HH:mm")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAcknowledge(alert.id)}>Ack</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleResolve(alert.id)}>Resolve</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
