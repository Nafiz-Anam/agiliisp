"use client";

import { useEffect, useState, useCallback } from "react";
import { Router, Server, Users, Wifi, WifiOff, RefreshCw, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  ONLINE: "bg-emerald-500",
  ACTIVE: "bg-emerald-500",
  OFFLINE: "bg-red-500",
  WARNING: "bg-amber-500",
  MAINTENANCE: "bg-purple-500",
};

export default function TopologyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/isp/monitoring/topology");
      setData(res.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Network Topology</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visual overview of your network infrastructure</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={fetchData}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Router className="h-4 w-4 text-blue-500" /><span className="text-xs text-slate-500">Routers</span></div>
          <p className="text-2xl font-bold text-slate-800">{data?.routers?.length || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Server className="h-4 w-4 text-indigo-500" /><span className="text-xs text-slate-500">OLTs</span></div>
          <p className="text-2xl font-bold text-slate-800">{data?.olts?.length || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-emerald-500" /><span className="text-xs text-slate-500">Total Customers</span></div>
          <p className="text-2xl font-bold text-slate-800">{data?.totalCustomers || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Wifi className="h-4 w-4 text-emerald-500" /><span className="text-xs text-slate-500">Online Now</span></div>
          <p className="text-2xl font-bold text-slate-800">{data?.totalOnline || 0}</p>
        </CardContent></Card>
      </div>

      {/* Topology Tree */}
      <Card>
        <CardContent className="p-6">
          {/* ISP Root Node */}
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 rounded-lg bg-blue-500 flex items-center justify-center mb-2">
              <Globe className="h-7 w-7 text-white" />
            </div>
            <p className="text-sm font-semibold text-slate-800">AgiliOSP Network</p>
            <p className="text-xs text-slate-400">{data?.totalCustomers || 0} subscribers</p>
          </div>

          {/* Connecting line */}
          <div className="w-px h-6 bg-slate-200 mx-auto" />

          {/* Routers + OLTs grid */}
          <div className="flex justify-center gap-2 flex-wrap">
            {/* Routers */}
            {data?.routers?.map((r: any) => (
              <div key={r.id} className="relative">
                {/* Vertical line from parent */}
                <div className="w-px h-4 bg-slate-200 mx-auto" />

                <div className={cn(
                  "w-52 border rounded-lg p-4 transition-colors",
                  r.status === "ONLINE" || r.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30",
                )}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={cn("h-2.5 w-2.5 rounded-full", STATUS_COLOR[r.status] || "bg-slate-400")} />
                    <Router className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-800 truncate">{r.name}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">IP</span>
                      <span className="font-mono text-slate-600">{r.ip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type</span>
                      <Badge className="text-[9px] bg-slate-100 text-slate-500">{r.routerType || "MikroTik"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Customers</span>
                      <span className="font-semibold text-slate-700">{r.customers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active</span>
                      <span className="font-semibold text-emerald-600">{r.activeConnections}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* OLTs */}
            {data?.olts?.map((o: any) => (
              <div key={o.id} className="relative">
                <div className="w-px h-4 bg-slate-200 mx-auto" />

                <div className={cn(
                  "w-52 border rounded-lg p-4 transition-colors",
                  o.status === "ONLINE" || o.status === "ACTIVE" ? "border-indigo-200 bg-indigo-50/30" : "border-red-200 bg-red-50/30",
                )}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={cn("h-2.5 w-2.5 rounded-full", STATUS_COLOR[o.status] || "bg-slate-400")} />
                    <Server className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium text-slate-800 truncate">{o.name}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">IP</span>
                      <span className="font-mono text-slate-600">{o.ip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Brand</span>
                      <Badge className="text-[9px] bg-indigo-100 text-indigo-600">{o.brand || "—"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ports</span>
                      <span className="font-semibold text-slate-700">{o.ports}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ONUs</span>
                      <span className="font-semibold text-indigo-600">{o.onus}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(!data?.routers?.length && !data?.olts?.length) && (
            <div className="text-center py-12 text-slate-400">
              <WifiOff className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No network devices found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
