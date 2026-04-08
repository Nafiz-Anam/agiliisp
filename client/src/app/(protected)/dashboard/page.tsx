"use client";

import { useEffect, useState } from "react";
import {
  Users, Wifi, WifiOff, Router, DollarSign, FileText,
  HeadphonesIcon, Package, Store, TrendingUp, AlertCircle,
  UserCheck, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { IspDashboardStats, SystemStats, CustomerStatus } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area,
} from "recharts";
import { format } from "date-fns";

const STATUS_COLORS: Record<CustomerStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SUSPENDED: "bg-amber-100 text-amber-700",
  TERMINATED: "bg-red-100 text-red-700",
  PENDING_ACTIVATION: "bg-blue-100 text-blue-700",
};

const CHART_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];

export default function DashboardPage() {
  const [stats, setStats] = useState<IspDashboardStats | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/isp/dashboard/stats"),
      api.get("/isp/dashboard/system-stats"),
    ])
      .then(([statsRes, systemRes]) => {
        setStats(statsRes.data.data);
        setSystemStats(systemRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-orange-200 border-t-orange-600 rounded-lg animate-spin" />
      </div>
    );
  }

  const s = stats?.stats;

  // Build chart data from systemStats
  const revenueChartData = systemStats
    ? Object.entries(systemStats.revenueByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({
          month: format(new Date(month + "-01"), "MMM yy"),
          revenue,
          customers: systemStats.customersByMonth[month] || 0,
        }))
    : [];

  const packagePieData = systemStats?.packageStats || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">ISP network overview</p>
      </div>

      {/* Stat Cards Row 1 - Customers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={s?.customers.total ?? 0}
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-50"
          sub={`${s?.customers.active ?? 0} active`}
        />
        <StatCard
          label="Online Now"
          value={s?.customers.online ?? 0}
          icon={Wifi}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-50"
          sub={`${s?.customers.offline ?? 0} offline`}
        />
        <StatCard
          label="Suspended"
          value={s?.customers.suspended ?? 0}
          icon={WifiOff}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
          sub="customers"
        />
        <StatCard
          label="Open Tickets"
          value={s?.tickets.open ?? 0}
          icon={HeadphonesIcon}
          iconColor="text-red-500"
          iconBg="bg-red-50"
          sub="need attention"
        />
      </div>

      {/* Stat Cards Row 2 - Network & Finance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Routers Online"
          value={s?.routers.online ?? 0}
          icon={Router}
          iconColor="text-orange-500"
          iconBg="bg-orange-50"
          sub={`${s?.routers.total ?? 0} total`}
        />
        <StatCard
          label="Active Packages"
          value={s?.packages.total ?? 0}
          icon={Package}
          iconColor="text-purple-500"
          iconBg="bg-purple-50"
          sub="bandwidth plans"
        />
        <StatCard
          label="Revenue (30d)"
          value={`$${(s?.finances.totalRevenue30Days ?? 0).toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-50"
          sub={`$${(s?.finances.totalCollected30Days ?? 0).toFixed(2)} collected`}
        />
        <StatCard
          label="Outstanding"
          value={`$${(s?.finances.outstandingAmount ?? 0).toFixed(2)}`}
          icon={AlertCircle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
          sub={`${s?.finances.overdueInvoices ?? 0} overdue invoices`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Revenue & Customer Growth (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v: number, name: string) => [
                    name === "revenue" ? `$${v.toFixed(2)}` : v,
                    name === "revenue" ? "Revenue" : "New Customers",
                  ]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Package Distribution */}
        <Card className="border-slate-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              Package Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {packagePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={packagePieData}
                    dataKey="count"
                    nameKey="package"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {packagePieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
                No package data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Customers */}
        <Card className="border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-500" />
              Recently Added Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentCustomers ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-700 text-[13px]">{c.fullName}</p>
                      <p className="text-slate-400 text-[11px]">{c.username}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[12px]">
                      {format(new Date(c.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
                {(stats?.recentCustomers ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-sm">No customers yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Recent Syncs */}
        <Card className="border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-orange-500" />
              Recent Router Syncs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Router</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentSyncs ?? []).map((sync) => (
                  <tr key={sync.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-700 text-[13px]">{sync.router.name}</p>
                      <p className="text-slate-400 text-[11px]">{sync.user?.name || "System"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <SyncStatusBadge status={sync.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[12px]">
                      {format(new Date(sync.startedAt), "MMM d, HH:mm")}
                    </td>
                  </tr>
                ))}
                {(stats?.recentSyncs ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-sm">No syncs yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sub: string;
}) {
  return (
    <Card className="border-slate-200/80">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-medium text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
          </div>
          <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SyncStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SUCCESS: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-red-100 text-red-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    PENDING: "bg-slate-100 text-slate-600",
    PARTIAL_SUCCESS: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
