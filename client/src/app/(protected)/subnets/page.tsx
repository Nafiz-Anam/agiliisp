"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Edit2, Trash2, Network, Server, ArrowRight,
  ChevronDown, ChevronRight, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";
import { toast } from "sonner";

const EMPTY_POOL = {
  name: "", network: "", cidr: "24", gateway: "", dnsServers: "",
  poolType: "PPPOE", routerId: "", vlanId: "", description: "",
};

const POOL_TYPES = ["PPPOE", "DHCP", "STATIC", "HOTSPOT", "MANAGEMENT"];

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  RESERVED: "bg-amber-50 text-amber-700",
  RELEASED: "bg-slate-100 text-slate-500",
};

export default function SubnetsPage() {
  const [pools, setPools] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_POOL);
  const [saving, setSaving] = useState(false);

  // Detail / assignment view
  const [selectedPool, setSelectedPool] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignMeta, setAssignMeta] = useState<any>({});
  const [assignPage, setAssignPage] = useState(1);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Assign IP dialog
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ ipAddress: "", customerId: "", description: "", status: "ACTIVE" });
  const [nextIp, setNextIp] = useState<string | null>(null);

  // Subnet calculator
  const [calcResult, setCalcResult] = useState<any>(null);

  const fetchPools = useCallback(async () => {
    setLoading(true);
    try {
      const [poolRes, routerRes] = await Promise.all([
        api.get("/isp/subnets"),
        api.get("/isp/routers").catch(() => ({ data: { data: { routers: [] } } })),
      ]);
      setPools(poolRes.data.data.pools || []);
      setRouters(routerRes.data.data.routers || []);
    } catch { toast.error("Failed to load IP pools"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPools(); }, [fetchPools]);

  // Fetch pool detail + assignments
  const openPoolDetail = useCallback(async (poolId: string) => {
    setLoadingDetail(true);
    setSelectedPool(null);
    try {
      const [poolRes, assignRes] = await Promise.all([
        api.get(`/isp/subnets/${poolId}`),
        api.get(`/isp/subnets/${poolId}/assignments?page=${assignPage}&limit=50`),
      ]);
      setSelectedPool(poolRes.data.data.pool);
      setAssignments(assignRes.data.data.assignments || []);
      setAssignMeta(assignRes.data.pagination || {});
    } catch { toast.error("Failed to load pool details"); }
    finally { setLoadingDetail(false); }
  }, [assignPage]);

  // Pool CRUD
  const handleSavePool = async () => {
    if (!form.name.trim() || !form.network.trim()) {
      toast.error("Name and network address are required"); return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        cidr: Number(form.cidr),
        vlanId: form.vlanId ? Number(form.vlanId) : null,
        routerId: form.routerId || null,
      };
      if (editId) {
        await api.patch(`/isp/subnets/${editId}`, body);
        toast.success("Pool updated");
      } else {
        await api.post("/isp/subnets", body);
        toast.success("Pool created");
      }
      setShowPoolForm(false); setEditId(null); setForm(EMPTY_POOL);
      fetchPools();
    } catch (e: any) { toast.error(e.response?.data?.error?.message || "Failed to save pool"); }
    finally { setSaving(false); }
  };

  const handleDeletePool = async (id: string) => {
    try { await api.delete(`/isp/subnets/${id}`); toast.success("Pool deleted"); fetchPools(); setSelectedPool(null); }
    catch (e: any) { toast.error(e.response?.data?.error?.message || "Cannot delete pool"); }
  };

  const openEditPool = (p: any) => {
    setForm({
      name: p.name, network: p.network, cidr: String(p.cidr), gateway: p.gateway || "",
      dnsServers: p.dnsServers || "", poolType: p.poolType || "PPPOE",
      routerId: p.routerId || "", vlanId: p.vlanId ? String(p.vlanId) : "", description: p.description || "",
    });
    setEditId(p.id); setShowPoolForm(true);
  };

  // IP Assignment
  const openAssignDialog = async (poolId: string) => {
    setAssignForm({ ipAddress: "", customerId: "", description: "", status: "ACTIVE" });
    setNextIp(null);
    setShowAssignForm(true);
    try {
      const res = await api.get(`/isp/subnets/${poolId}/next-ip`);
      const ip = res.data.data.ipAddress;
      setNextIp(ip);
      setAssignForm(f => ({ ...f, ipAddress: ip || "" }));
    } catch {}
  };

  const handleAssignIp = async () => {
    if (!selectedPool) return;
    setSaving(true);
    try {
      await api.post(`/isp/subnets/${selectedPool.id}/assign`, assignForm);
      toast.success("IP assigned");
      setShowAssignForm(false);
      openPoolDetail(selectedPool.id);
      fetchPools();
    } catch (e: any) { toast.error(e.response?.data?.error?.message || "Failed to assign IP"); }
    finally { setSaving(false); }
  };

  const handleReleaseIp = async (assignmentId: string) => {
    try {
      await api.post(`/isp/subnets/assignments/${assignmentId}/release`);
      toast.success("IP released");
      if (selectedPool) openPoolDetail(selectedPool.id);
      fetchPools();
    } catch (e: any) { toast.error(e.response?.data?.error?.message || "Failed to release IP"); }
  };

  // Subnet calculator
  const runCalc = async () => {
    if (!form.network || !form.cidr) return;
    try {
      const res = await api.get(`/isp/subnets/calc?network=${form.network}&cidr=${form.cidr}`);
      setCalcResult(res.data.data.info);
    } catch { setCalcResult(null); }
  };

  const usageColor = (pct: number) => pct > 90 ? "text-red-600" : pct > 70 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">IP Pool Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage subnets, IP pools, and address assignments</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm(EMPTY_POOL); setCalcResult(null); setShowPoolForm(true); }} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm h-9">
          <Plus className="h-4 w-4" /> Add Pool
        </Button>
      </div>

      {/* Pool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : pools.length === 0 ? (
          <div className="col-span-full text-center text-slate-400 py-16">No IP pools created yet</div>
        ) : pools.map(pool => {
          const pct = pool.usagePercent || 0;
          return (
            <Card key={pool.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openPoolDetail(pool.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">{pool.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{pool.cidrNotation}</p>
                  </div>
                  <div className="flex gap-1">
                    <Badge className={`text-[10px] ${pool.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {pool.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge className="text-[10px] bg-blue-50 text-blue-600">{pool.poolType}</Badge>
                  </div>
                </div>

                {/* Usage bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">Usage</span>
                    <span className={`font-semibold ${usageColor(pct)}`}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-800">{pool.totalIps}</p>
                    <p className="text-[10px] text-slate-400">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{pool.usedIps}</p>
                    <p className="text-[10px] text-slate-400">Used</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-600">{pool.reservedIps}</p>
                    <p className="text-[10px] text-slate-400">Reserved</p>
                  </div>
                </div>

                {pool.gateway && (
                  <p className="text-[11px] text-slate-400 mt-2">Gateway: <span className="font-mono text-slate-600">{pool.gateway}</span></p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pool Detail Panel */}
      {selectedPool && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{selectedPool.name}</CardTitle>
                <p className="text-sm text-slate-500 font-mono">{selectedPool.cidrNotation}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => openAssignDialog(selectedPool.id)}>
                  <Plus className="h-3.5 w-3.5" /> Assign IP
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => openEditPool(selectedPool)}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-red-500 hover:text-red-600" onClick={() => handleDeletePool(selectedPool.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Pool info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
              <div className="bg-slate-50 rounded-lg p-2.5">
                <p className="text-[11px] text-slate-400">Network</p>
                <p className="font-mono text-slate-700">{selectedPool.networkAddr}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5">
                <p className="text-[11px] text-slate-400">Broadcast</p>
                <p className="font-mono text-slate-700">{selectedPool.broadcast}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5">
                <p className="text-[11px] text-slate-400">Usable Range</p>
                <p className="font-mono text-slate-700 text-xs">{selectedPool.firstUsable} - {selectedPool.lastUsable}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5">
                <p className="text-[11px] text-slate-400">Netmask</p>
                <p className="font-mono text-slate-700">{selectedPool.netmask}</p>
              </div>
            </div>

            {/* Assignments table */}
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : assignments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">IP Address</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Assigned</TableHead>
                    <TableHead className="text-xs w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-sm">{a.ipAddress}</TableCell>
                      <TableCell className="text-sm text-slate-600">{a.customerId || "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${statusColor[a.status] || "bg-slate-100 text-slate-500"}`}>{a.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{a.description || "—"}</TableCell>
                      <TableCell className="text-xs text-slate-400">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        {a.status !== "RELEASED" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleReleaseIp(a.id)}>
                            Release
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-slate-400 py-8 text-sm">No IP assignments in this pool</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Pool Dialog */}
      <Dialog open={showPoolForm} onOpenChange={setShowPoolForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit IP Pool" : "Create IP Pool"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Pool Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PPPoE Pool 1" /></div>
              <div>
                <Label>Pool Type</Label>
                <select value={form.poolType} onChange={e => setForm(f => ({ ...f, poolType: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                  {POOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Network Address</Label><Input value={form.network} onChange={e => setForm(f => ({ ...f, network: e.target.value }))} placeholder="e.g. 192.168.1.0" /></div>
              <div>
                <Label>CIDR</Label>
                <Input type="number" min="8" max="32" value={form.cidr} onChange={e => setForm(f => ({ ...f, cidr: e.target.value }))} placeholder="/24" />
              </div>
            </div>

            {/* Inline calculator result */}
            {!editId && form.network && form.cidr && (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={runCalc}>
                  <RefreshCw className="h-3 w-3" /> Calculate
                </Button>
                {calcResult && (
                  <span className="text-xs text-slate-500">
                    {calcResult.usableIps} usable IPs ({calcResult.firstUsable} — {calcResult.lastUsable})
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Gateway</Label><Input value={form.gateway} onChange={e => setForm(f => ({ ...f, gateway: e.target.value }))} placeholder="e.g. 192.168.1.1" /></div>
              <div><Label>DNS Servers</Label><Input value={form.dnsServers} onChange={e => setForm(f => ({ ...f, dnsServers: e.target.value }))} placeholder="8.8.8.8, 8.8.4.4" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Router (optional)</Label>
                <select value={form.routerId} onChange={e => setForm(f => ({ ...f, routerId: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                  <option value="">— None —</option>
                  {routers.map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.ipAddress})</option>)}
                </select>
              </div>
              <div><Label>VLAN ID (optional)</Label><Input type="number" value={form.vlanId} onChange={e => setForm(f => ({ ...f, vlanId: e.target.value }))} placeholder="e.g. 100" /></div>
            </div>

            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes" /></div>

            <Button onClick={handleSavePool} disabled={saving} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              {saving ? "Saving..." : editId ? "Update Pool" : "Create Pool"}
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Assign IP Dialog */}
      <Dialog open={showAssignForm} onOpenChange={setShowAssignForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign IP Address</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            {nextIp && (
              <p className="text-xs text-slate-500">Next available: <span className="font-mono text-slate-700">{nextIp}</span></p>
            )}
            <div><Label>IP Address</Label><Input value={assignForm.ipAddress} onChange={e => setAssignForm(f => ({ ...f, ipAddress: e.target.value }))} placeholder="Auto-assigned if empty" className="font-mono" /></div>
            <div><Label>Customer ID (optional)</Label><Input value={assignForm.customerId} onChange={e => setAssignForm(f => ({ ...f, customerId: e.target.value }))} placeholder="Link to customer" /></div>
            <div><Label>Description</Label><Input value={assignForm.description} onChange={e => setAssignForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Office router, CCTV" /></div>
            <div>
              <Label>Status</Label>
              <select value={assignForm.status} onChange={e => setAssignForm(f => ({ ...f, status: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                <option value="ACTIVE">Active</option>
                <option value="RESERVED">Reserved</option>
              </select>
            </div>
            <Button onClick={handleAssignIp} disabled={saving} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              {saving ? "Assigning..." : "Assign IP"}
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
