"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Download, Shield, Wifi, Globe, Key, Database,
  ArrowDown, ArrowUp, Clock, AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmtBytes = (b: number) => {
  if (!b) return "—";
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
};

const fmtDuration = (s: number | null) => {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtDate = (d: string) => new Date(d).toLocaleString("en-US", {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

const EVENT_COLORS: Record<string, string> = {
  CONNECT: "bg-emerald-50 text-emerald-700",
  DISCONNECT: "bg-red-50 text-red-600",
  AUTH_FAIL: "bg-red-50 text-red-700",
  TIMEOUT: "bg-amber-50 text-amber-700",
  ADMIN_KICK: "bg-purple-50 text-purple-700",
  LOGIN_SUCCESS: "bg-emerald-50 text-emerald-700",
  LOGIN_FAIL: "bg-red-50 text-red-700",
  LOGOUT: "bg-slate-100 text-slate-600",
  SESSION_TIMEOUT: "bg-amber-50 text-amber-700",
  ASSIGN: "bg-blue-50 text-blue-700",
  RELEASE: "bg-slate-100 text-slate-600",
  NAT_MAP: "bg-blue-50 text-blue-600",
  NAT_UNMAP: "bg-slate-100 text-slate-500",
};

export default function ComplianceLogsPage() {
  const [tab, setTab] = useState("sessions");
  const [stats, setStats] = useState<any>(null);
  const [showIpLookup, setShowIpLookup] = useState(false);

  // Session logs state
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionMeta, setSessionMeta] = useState<any>({});
  const [sessionFilters, setSessionFilters] = useState({ username: "", ipAddress: "", eventType: "", startDate: "", endDate: "" });

  // NAT logs state
  const [natLogs, setNatLogs] = useState<any[]>([]);
  const [natLoading, setNatLoading] = useState(false);
  const [natPage, setNatPage] = useState(1);
  const [natMeta, setNatMeta] = useState<any>({});
  const [natFilters, setNatFilters] = useState({ username: "", assignedIp: "", startDate: "", endDate: "" });

  // Auth logs state
  const [authLogs, setAuthLogs] = useState<any[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [authPage, setAuthPage] = useState(1);
  const [authMeta, setAuthMeta] = useState<any>({});
  const [authFilters, setAuthFilters] = useState({ username: "", eventType: "", startDate: "", endDate: "" });

  // IP Lookup
  const [lookupIp, setLookupIp] = useState("");
  const [lookupTime, setLookupTime] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Fetch stats
  useEffect(() => {
    api.get("/isp/compliance-logs/stats").then(r => setStats(r.data.data.stats)).catch(() => {});
  }, []);

  // Fetch session logs
  const fetchSessions = useCallback(async () => {
    setSessionLoading(true);
    try {
      const params: any = { page: sessionPage, limit: 30 };
      if (sessionFilters.username) params.username = sessionFilters.username;
      if (sessionFilters.ipAddress) params.ipAddress = sessionFilters.ipAddress;
      if (sessionFilters.eventType) params.eventType = sessionFilters.eventType;
      if (sessionFilters.startDate) params.startDate = sessionFilters.startDate;
      if (sessionFilters.endDate) params.endDate = sessionFilters.endDate;
      const res = await api.get("/isp/compliance-logs/sessions", { params });
      setSessions(res.data.data.logs || []);
      setSessionMeta(res.data.pagination || {});
    } catch { toast.error("Failed to load session logs"); }
    finally { setSessionLoading(false); }
  }, [sessionPage, sessionFilters]);

  // Fetch NAT logs
  const fetchNat = useCallback(async () => {
    setNatLoading(true);
    try {
      const params: any = { page: natPage, limit: 30 };
      if (natFilters.username) params.username = natFilters.username;
      if (natFilters.assignedIp) params.assignedIp = natFilters.assignedIp;
      if (natFilters.startDate) params.startDate = natFilters.startDate;
      if (natFilters.endDate) params.endDate = natFilters.endDate;
      const res = await api.get("/isp/compliance-logs/nat", { params });
      setNatLogs(res.data.data.logs || []);
      setNatMeta(res.data.pagination || {});
    } catch { toast.error("Failed to load NAT logs"); }
    finally { setNatLoading(false); }
  }, [natPage, natFilters]);

  // Fetch auth logs
  const fetchAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const params: any = { page: authPage, limit: 30 };
      if (authFilters.username) params.username = authFilters.username;
      if (authFilters.eventType) params.eventType = authFilters.eventType;
      if (authFilters.startDate) params.startDate = authFilters.startDate;
      if (authFilters.endDate) params.endDate = authFilters.endDate;
      const res = await api.get("/isp/compliance-logs/auth", { params });
      setAuthLogs(res.data.data.logs || []);
      setAuthMeta(res.data.pagination || {});
    } catch { toast.error("Failed to load auth logs"); }
    finally { setAuthLoading(false); }
  }, [authPage, authFilters]);

  useEffect(() => { if (tab === "sessions") fetchSessions(); }, [tab, fetchSessions]);
  useEffect(() => { if (tab === "nat") fetchNat(); }, [tab, fetchNat]);
  useEffect(() => { if (tab === "auth") fetchAuth(); }, [tab, fetchAuth]);

  const handleExport = async () => {
    const start = sessionFilters.startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const end = sessionFilters.endDate || new Date().toISOString().slice(0, 10);
    try {
      const res = await api.get(`/isp/compliance-logs/export?startDate=${start}&endDate=${end}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `session-logs-${start}-to-${end}.csv`; a.click();
      toast.success("Export downloaded");
    } catch { toast.error("Export failed"); }
  };

  const handleIpLookup = async () => {
    if (!lookupIp || !lookupTime) { toast.error("Enter both IP and timestamp"); return; }
    setLookupLoading(true);
    try {
      const res = await api.get(`/isp/compliance-logs/ip-lookup?ip=${lookupIp}&timestamp=${lookupTime}`);
      setLookupResult(res.data.data);
    } catch { toast.error("Lookup failed"); }
    finally { setLookupLoading(false); }
  };

  const Pagination = ({ meta, page, setPage }: { meta: any; page: number; setPage: (p: number | ((p: number) => number)) => void }) => (
    meta.totalPages > 1 ? (
      <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-3">
        <span className="text-xs text-slate-400">{meta.totalResults?.toLocaleString() || 0} total records</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p: number) => p - 1)} className="text-xs">Previous</Button>
          <span className="text-xs text-slate-500 py-1.5">Page {page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p: number) => p + 1)} className="text-xs">Next</Button>
        </div>
      </div>
    ) : null
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Compliance Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">BTRC mandated session, NAT, and authentication logs — 6 month retention</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setShowIpLookup(true)}>
            <Search className="h-3.5 w-3.5" /> IP Lookup
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Wifi className="h-4 w-4 text-emerald-500" /><span className="text-xs text-slate-500">Session Logs</span></div>
            <p className="text-xl font-bold text-slate-800">{stats.sessionLogs?.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Globe className="h-4 w-4 text-blue-500" /><span className="text-xs text-slate-500">NAT Logs</span></div>
            <p className="text-xl font-bold text-slate-800">{stats.natLogs?.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Key className="h-4 w-4 text-amber-500" /><span className="text-xs text-slate-500">Auth Logs</span></div>
            <p className="text-xl font-bold text-slate-800">{stats.authLogs?.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Database className="h-4 w-4 text-slate-500" /><span className="text-xs text-slate-500">Retention From</span></div>
            <p className="text-sm font-semibold text-slate-800">{stats.retentionFrom ? new Date(stats.retentionFrom).toLocaleDateString() : "No data yet"}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sessions">Session Logs</TabsTrigger>
          <TabsTrigger value="nat">NAT / IP Logs</TabsTrigger>
          <TabsTrigger value="auth">Authentication Logs</TabsTrigger>
        </TabsList>

        {/* ── Session Logs Tab ── */}
        <TabsContent value="sessions">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3 mb-4 flex-wrap">
                <Input className="max-w-[180px]" placeholder="Username" value={sessionFilters.username} onChange={e => setSessionFilters(f => ({ ...f, username: e.target.value }))} />
                <Input className="max-w-[160px]" placeholder="IP Address" value={sessionFilters.ipAddress} onChange={e => setSessionFilters(f => ({ ...f, ipAddress: e.target.value }))} />
                <select className="h-8 px-3 text-sm border border-slate-200 rounded-lg bg-white" value={sessionFilters.eventType} onChange={e => setSessionFilters(f => ({ ...f, eventType: e.target.value }))}>
                  <option value="">All Events</option>
                  <option value="CONNECT">Connect</option>
                  <option value="DISCONNECT">Disconnect</option>
                  <option value="AUTH_FAIL">Auth Fail</option>
                  <option value="TIMEOUT">Timeout</option>
                  <option value="ADMIN_KICK">Admin Kick</option>
                </select>
                <Input type="date" className="max-w-[150px]" value={sessionFilters.startDate} onChange={e => setSessionFilters(f => ({ ...f, startDate: e.target.value }))} />
                <Input type="date" className="max-w-[150px]" value={sessionFilters.endDate} onChange={e => setSessionFilters(f => ({ ...f, endDate: e.target.value }))} />
              </div>

              {sessionLoading ? (
                <div className="flex justify-center py-12"><div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">Event</TableHead>
                      <TableHead className="text-xs">Username</TableHead>
                      <TableHead className="text-xs">Customer</TableHead>
                      <TableHead className="text-xs">IP Address</TableHead>
                      <TableHead className="text-xs">MAC</TableHead>
                      <TableHead className="text-xs">Duration</TableHead>
                      <TableHead className="text-xs">Download</TableHead>
                      <TableHead className="text-xs">Upload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(s.timestamp)}</TableCell>
                        <TableCell><Badge className={cn("text-[10px]", EVENT_COLORS[s.eventType] || "bg-slate-100 text-slate-600")}>{s.eventType}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{s.username}</TableCell>
                        <TableCell className="text-sm text-slate-600">{s.customer?.fullName || "—"}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{s.ipAddress || "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{s.macAddress || "—"}</TableCell>
                        <TableCell className="text-sm text-slate-500">{fmtDuration(s.sessionDuration)}</TableCell>
                        <TableCell className="text-sm text-emerald-600">{fmtBytes(Number(s.downloadBytes))}</TableCell>
                        <TableCell className="text-sm text-blue-600">{fmtBytes(Number(s.uploadBytes))}</TableCell>
                      </TableRow>
                    ))}
                    {sessions.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-slate-400 py-8">No session logs found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
              <Pagination meta={sessionMeta} page={sessionPage} setPage={setSessionPage} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NAT Logs Tab ── */}
        <TabsContent value="nat">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3 mb-4">
                <Input className="max-w-[180px]" placeholder="Username" value={natFilters.username} onChange={e => setNatFilters(f => ({ ...f, username: e.target.value }))} />
                <Input className="max-w-[160px]" placeholder="Assigned IP" value={natFilters.assignedIp} onChange={e => setNatFilters(f => ({ ...f, assignedIp: e.target.value }))} />
                <Input type="date" className="max-w-[150px]" value={natFilters.startDate} onChange={e => setNatFilters(f => ({ ...f, startDate: e.target.value }))} />
                <Input type="date" className="max-w-[150px]" value={natFilters.endDate} onChange={e => setNatFilters(f => ({ ...f, endDate: e.target.value }))} />
              </div>

              {natLoading ? (
                <div className="flex justify-center py-12"><div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                      <TableHead className="text-xs">Username</TableHead>
                      <TableHead className="text-xs">Customer</TableHead>
                      <TableHead className="text-xs">Assigned IP</TableHead>
                      <TableHead className="text-xs">Public IP</TableHead>
                      <TableHead className="text-xs">MAC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {natLogs.map((n: any) => (
                      <TableRow key={n.id}>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(n.timestamp)}</TableCell>
                        <TableCell><Badge className={cn("text-[10px]", EVENT_COLORS[n.action] || "bg-slate-100 text-slate-600")}>{n.action}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{n.username}</TableCell>
                        <TableCell className="text-sm text-slate-600">{n.customer?.fullName || "—"}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-700">{n.assignedIp}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-500">{n.publicIp || "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{n.macAddress || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {natLogs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">No NAT logs found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
              <Pagination meta={natMeta} page={natPage} setPage={setNatPage} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Auth Logs Tab ── */}
        <TabsContent value="auth">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3 mb-4">
                <Input className="max-w-[180px]" placeholder="Username" value={authFilters.username} onChange={e => setAuthFilters(f => ({ ...f, username: e.target.value }))} />
                <select className="h-8 px-3 text-sm border border-slate-200 rounded-lg bg-white" value={authFilters.eventType} onChange={e => setAuthFilters(f => ({ ...f, eventType: e.target.value }))}>
                  <option value="">All Events</option>
                  <option value="LOGIN_SUCCESS">Login Success</option>
                  <option value="LOGIN_FAIL">Login Fail</option>
                  <option value="LOGOUT">Logout</option>
                  <option value="SESSION_TIMEOUT">Session Timeout</option>
                </select>
                <Input type="date" className="max-w-[150px]" value={authFilters.startDate} onChange={e => setAuthFilters(f => ({ ...f, startDate: e.target.value }))} />
                <Input type="date" className="max-w-[150px]" value={authFilters.endDate} onChange={e => setAuthFilters(f => ({ ...f, endDate: e.target.value }))} />
              </div>

              {authLoading ? (
                <div className="flex justify-center py-12"><div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">Event</TableHead>
                      <TableHead className="text-xs">Username</TableHead>
                      <TableHead className="text-xs">Customer</TableHead>
                      <TableHead className="text-xs">IP Address</TableHead>
                      <TableHead className="text-xs">MAC</TableHead>
                      <TableHead className="text-xs">Service</TableHead>
                      <TableHead className="text-xs">Fail Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authLogs.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(a.timestamp)}</TableCell>
                        <TableCell><Badge className={cn("text-[10px]", EVENT_COLORS[a.eventType] || "bg-slate-100 text-slate-600")}>{a.eventType}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{a.username}</TableCell>
                        <TableCell className="text-sm text-slate-600">{a.customer?.fullName || "—"}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{a.ipAddress || "—"}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{a.macAddress || "—"}</TableCell>
                        <TableCell className="text-sm text-slate-500">{a.service || "—"}</TableCell>
                        <TableCell className="text-sm text-red-500">{a.failReason || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {authLogs.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-8">No authentication logs found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
              <Pagination meta={authMeta} page={authPage} setPage={setAuthPage} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── IP Lookup Dialog ── */}
      <Dialog open={showIpLookup} onOpenChange={setShowIpLookup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>IP Address Lookup</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-xs text-slate-400">Find who was using a specific IP address at a given time — for law enforcement or BTRC queries.</p>
            <div className="space-y-1.5">
              <Label>IP Address</Label>
              <Input value={lookupIp} onChange={e => setLookupIp(e.target.value)} placeholder="e.g. 103.45.67.89" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={lookupTime} onChange={e => setLookupTime(e.target.value)} />
            </div>
            <Button onClick={handleIpLookup} disabled={lookupLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white gap-1.5">
              <Search className="h-3.5 w-3.5" /> {lookupLoading ? "Searching..." : "Lookup"}
            </Button>

            {lookupResult && (
              <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                {lookupResult.session ? (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-2">Match Found — Session Log</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-400">Name:</span> <span className="font-medium">{lookupResult.session.customer?.fullName || "—"}</span></div>
                      <div><span className="text-slate-400">Username:</span> <span className="font-mono">{lookupResult.session.username}</span></div>
                      <div><span className="text-slate-400">Phone:</span> <span>{lookupResult.session.customer?.phone || "—"}</span></div>
                      <div><span className="text-slate-400">NID:</span> <span>{lookupResult.session.customer?.nidNumber || "—"}</span></div>
                      <div><span className="text-slate-400">IP:</span> <span className="font-mono">{lookupResult.session.ipAddress}</span></div>
                      <div><span className="text-slate-400">MAC:</span> <span className="font-mono text-xs">{lookupResult.session.macAddress || "—"}</span></div>
                      <div className="col-span-2"><span className="text-slate-400">Connected at:</span> <span>{fmtDate(lookupResult.session.timestamp)}</span></div>
                    </div>
                  </div>
                ) : lookupResult.natEntry ? (
                  <div>
                    <p className="text-xs font-semibold text-blue-600 mb-2">Match Found — NAT Log</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-400">Name:</span> <span className="font-medium">{lookupResult.natEntry.customer?.fullName || "—"}</span></div>
                      <div><span className="text-slate-400">Username:</span> <span className="font-mono">{lookupResult.natEntry.username}</span></div>
                      <div><span className="text-slate-400">Assigned IP:</span> <span className="font-mono">{lookupResult.natEntry.assignedIp}</span></div>
                      <div><span className="text-slate-400">Public IP:</span> <span className="font-mono">{lookupResult.natEntry.publicIp || "—"}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm">No records found for this IP at the specified time</p>
                  </div>
                )}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
