"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wifi, WifiOff, RefreshCw, Search, UserX, ArrowDown, ArrowUp,
  Clock, Phone, User, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip,
} from "recharts";

const fmtBytes = (b: number) => {
  if (b >= 1e12) return `${(b / 1e12).toFixed(2)} TB`;
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
};

export default function ActiveConnectionsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [total, setTotal] = useState(0);
  const [routersPolled, setRoutersPolled] = useState(0);

  // Customer traffic detail
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerTraffic, setCustomerTraffic] = useState<any[]>([]);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await api.get("/isp/monitoring/active-connections");
      setConnections(res.data.data.connections || []);
      setTotal(res.data.data.total || 0);
      setRoutersPolled(res.data.data.routersPolled || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchConnections, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchConnections]);

  const handleDisconnect = async (conn: any) => {
    try {
      await api.post("/isp/monitoring/disconnect-user", { routerId: conn.routerId, connectionId: conn.connectionId });
      toast.success(`Disconnected ${conn.username}`);
      fetchConnections();
    } catch { toast.error("Failed to disconnect user"); }
  };

  const openCustomerTraffic = async (conn: any) => {
    if (!conn.customerId) { toast.error("Customer not linked"); return; }
    setSelectedCustomer(conn);
    setTrafficLoading(true);
    setShowTraffic(true);
    try {
      const res = await api.get(`/isp/monitoring/customers/${conn.customerId}/traffic?period=DAILY&days=30`);
      setCustomerTraffic(res.data.data.stats || []);
    } catch { setCustomerTraffic([]); }
    finally { setTrafficLoading(false); }
  };

  // Filter connections by search
  const filtered = connections.filter(c =>
    !search || c.username?.toLowerCase().includes(search.toLowerCase()) ||
    c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    c.ipAddress?.includes(search)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Active Connections</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time PPPoE sessions across all routers</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={fetchConnections}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className={autoRefresh ? "bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 text-xs" : "gap-1.5 text-xs"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Wifi className="h-3.5 w-3.5" />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wifi className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500">Online Users</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500">Routers Polled</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{routersPolled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserX className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-500">Unlinked Sessions</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{connections.filter(c => !c.customerId).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username, name, or IP..." className="pl-9" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <WifiOff className="h-8 w-8 mb-2" />
              <p className="text-sm">{connections.length === 0 ? "No active connections" : "No matches found"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Username</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">IP Address</TableHead>
                  <TableHead className="text-xs">Package</TableHead>
                  <TableHead className="text-xs">Router</TableHead>
                  <TableHead className="text-xs">Uptime</TableHead>
                  <TableHead className="text-xs w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c, i) => (
                  <TableRow key={`${c.connectionId}-${i}`}>
                    <TableCell>
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{c.username}</TableCell>
                    <TableCell>
                      {c.customerName ? (
                        <div>
                          <p className="text-sm text-slate-700">{c.customerName}</p>
                          {c.customerPhone && <p className="text-[11px] text-slate-400">{c.customerPhone}</p>}
                        </div>
                      ) : (
                        <Badge className="text-[10px] bg-amber-50 text-amber-600">Unlinked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{c.ipAddress || "—"}</TableCell>
                    <TableCell>
                      {c.packageName ? (
                        <div>
                          <p className="text-sm text-slate-700">{c.packageName}</p>
                          <p className="text-[11px] text-slate-400">
                            <ArrowDown className="h-3 w-3 inline text-emerald-500" /> {c.downloadSpeed} / <ArrowUp className="h-3 w-3 inline text-blue-500" /> {c.uploadSpeed} Mbps
                          </p>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{c.routerName}</TableCell>
                    <TableCell className="text-sm text-slate-500">{c.uptime || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.customerId && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openCustomerTraffic(c)}>
                            <ChevronRight className="h-3.5 w-3.5" /> Traffic
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 gap-1" onClick={() => handleDisconnect(c)}>
                          <UserX className="h-3.5 w-3.5" /> Kick
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Traffic Dialog */}
      <Dialog open={showTraffic} onOpenChange={setShowTraffic}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Traffic — {selectedCustomer?.customerName || selectedCustomer?.username}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selectedCustomer && (
              <div className="space-y-4">
                {/* Customer info bar */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 text-sm">
                  <div><span className="text-slate-400">Username:</span> <span className="font-mono text-slate-700">{selectedCustomer.username}</span></div>
                  <div><span className="text-slate-400">IP:</span> <span className="font-mono text-slate-700">{selectedCustomer.ipAddress}</span></div>
                  <div><span className="text-slate-400">Package:</span> <span className="text-slate-700">{selectedCustomer.packageName || "—"}</span></div>
                  <div><span className="text-slate-400">Uptime:</span> <span className="text-slate-700">{selectedCustomer.uptime || "—"}</span></div>
                </div>

                {/* 30-day traffic chart */}
                {trafficLoading ? (
                  <div className="flex items-center justify-center h-48"><div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
                ) : customerTraffic.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Last 30 Days Traffic</h4>
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={customerTraffic.map(s => ({
                        date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                        inMB: s.bytesIn / 1e6,
                        outMB: s.bytesOut / 1e6,
                      }))}>
                        <defs>
                          <linearGradient id="custIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="custOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={v => `${v.toFixed(0)} MB`} />
                        <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                          formatter={(v: number, name: string) => [fmtBytes(v * 1e6), name === "inMB" ? "Download" : "Upload"]} />
                        <Area type="monotone" dataKey="inMB" stroke="#10b981" strokeWidth={2} fill="url(#custIn)" />
                        <Area type="monotone" dataKey="outMB" stroke="#3b82f6" strokeWidth={2} fill="url(#custOut)" />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 text-xs text-slate-400 mt-2 justify-center">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Download</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> Upload</span>
                    </div>

                    {/* Stats summary */}
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      <div className="text-center p-2 rounded-lg bg-slate-50">
                        <p className="text-lg font-bold text-emerald-600">{fmtBytes(customerTraffic.reduce((s, d) => s + d.bytesIn, 0))}</p>
                        <p className="text-[10px] text-slate-400">Total Download</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-slate-50">
                        <p className="text-lg font-bold text-blue-600">{fmtBytes(customerTraffic.reduce((s, d) => s + d.bytesOut, 0))}</p>
                        <p className="text-[10px] text-slate-400">Total Upload</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-slate-50">
                        <p className="text-lg font-bold text-slate-700">{fmtBytes(Math.max(...customerTraffic.map(d => d.peakDown)))}</p>
                        <p className="text-[10px] text-slate-400">Peak Download</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-slate-50">
                        <p className="text-lg font-bold text-slate-700">{fmtBytes(Math.max(...customerTraffic.map(d => d.peakUp)))}</p>
                        <p className="text-[10px] text-slate-400">Peak Upload</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-8 text-sm">No traffic data available for this customer</p>
                )}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
