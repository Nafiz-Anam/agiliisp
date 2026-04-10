"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowDown, ArrowUp, RefreshCw, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

const fmtBytes = (b: number) => {
  if (b >= 1e12) return `${(b / 1e12).toFixed(2)} TB`;
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
};

const fmtSpeed = (bps: number) => {
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbps`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbps`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(0)} Kbps`;
  return `${bps} bps`;
};

export default function TrafficMonitoringPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState("1");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/isp/monitoring/live-bandwidth?hours=${hours}`);
      setData(res.data.data.timeSeries || []);
    } catch { /* silent — may be empty */ }
    finally { setLoading(false); }
  }, [hours]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Calculate totals from latest data
  const totalIn = data.reduce((sum, d) => sum + d.bytesIn, 0);
  const totalOut = data.reduce((sum, d) => sum + d.bytesOut, 0);
  const peakIn = Math.max(...data.map(d => d.bytesIn), 0);
  const peakOut = Math.max(...data.map(d => d.bytesOut), 0);
  const currentIn = data.length > 0 ? data[data.length - 1].bytesIn : 0;
  const currentOut = data.length > 0 ? data[data.length - 1].bytesOut : 0;

  // Format chart data with readable time
  const chartData = data.map(d => ({
    ...d,
    timeLabel: new Date(d.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    inMbps: d.bytesIn / 1e6,
    outMbps: d.bytesOut / 1e6,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Live Bandwidth</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time network traffic across all routers</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1 hour</SelectItem>
              <SelectItem value="3">Last 3 hours</SelectItem>
              <SelectItem value="6">Last 6 hours</SelectItem>
              <SelectItem value="12">Last 12 hours</SelectItem>
              <SelectItem value="24">Last 24 hours</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className={autoRefresh ? "bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 text-xs" : "gap-1.5 text-xs"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDown className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">Current Download</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{fmtSpeed(currentIn)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500 font-medium">Current Upload</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{fmtSpeed(currentOut)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDown className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-500 font-medium">Total Downloaded</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{fmtBytes(totalIn)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUp className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-500 font-medium">Total Uploaded</span>
            </div>
            <p className="text-xl font-bold text-slate-800">{fmtBytes(totalOut)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bandwidth chart */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Bandwidth Usage</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Download</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Upload</span>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="timeLabel" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `${v.toFixed(0)} MB`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(value: number, name: string) => [fmtBytes(value * 1e6), name === "inMbps" ? "Download" : "Upload"]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Area type="monotone" dataKey="inMbps" stroke="#10b981" strokeWidth={2} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="outMbps" stroke="#3b82f6" strokeWidth={2} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Clock className="h-8 w-8 mb-2" />
              <p className="text-sm">No bandwidth data available yet</p>
              <p className="text-xs mt-1">Data will appear as SNMP metrics are collected</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
