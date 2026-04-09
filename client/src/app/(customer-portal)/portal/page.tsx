"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wifi, WifiOff, Package, FileText, HeadphonesIcon, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBytes = (b: number) => {
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
};

const STATUS_STYLES: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-red-700",
  DRAFT: "bg-slate-100 text-slate-600",
};

export default function CustomerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/customer-portal/dashboard")
      .then(res => setData(res.data.data))
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!data) return null;

  const { customer, package: pkg, recentInvoices, openTickets, trafficStats } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome, {customer.fullName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your service overview and account summary</p>
      </div>

      {/* Status + Package Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              {customer.isOnline ? (
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Wifi className="h-5 w-5 text-emerald-600" /></div>
              ) : (
                <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center"><WifiOff className="h-5 w-5 text-red-500" /></div>
              )}
              <div>
                <p className="text-xs text-slate-500">Connection Status</p>
                <p className={`text-lg font-bold ${customer.isOnline ? "text-emerald-600" : "text-red-500"}`}>
                  {customer.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <Badge className={`mt-3 text-[10px] ${customer.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {customer.status}
            </Badge>
          </CardContent>
        </Card>

        {pkg && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><Package className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-slate-500">Current Package</p>
                  <p className="text-lg font-bold text-slate-800">{pkg.name}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>{pkg.downloadSpeed} Mbps / {pkg.uploadSpeed} Mbps</span>
                <span className="font-semibold text-slate-700">{fmt(pkg.price)}/mo</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center"><HeadphonesIcon className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-slate-500">Open Tickets</p>
                <p className="text-lg font-bold text-slate-800">{openTickets}</p>
              </div>
            </div>
            {customer.nextBillingDate && (
              <p className="mt-3 text-xs text-slate-400">Next billing: {format(new Date(customer.nextBillingDate), "MMM d, yyyy")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Usage Chart */}
      {trafficStats.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Data Usage (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trafficStats.map((s: any) => ({ date: format(new Date(s.date), "MMM d"), download: s.bytesIn / 1048576, upload: s.bytesOut / 1048576 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)} MB`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)} MB`]} />
                <Area type="monotone" dataKey="download" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Download" />
                <Area type="monotone" dataKey="upload" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Upload" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      {recentInvoices.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700">Recent Invoices</h3>
              <Link href="/portal/invoices" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-700">{inv.invoiceNumber}</span>
                    <Badge className={`text-[10px] ${STATUS_STYLES[inv.status] || "bg-slate-100 text-slate-600"}`}>{inv.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <span className={Number(inv.balanceDue) > 0 ? "font-medium text-red-600" : "font-medium text-emerald-600"}>{fmt(inv.totalAmount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
