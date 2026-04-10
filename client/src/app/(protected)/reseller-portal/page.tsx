"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, UserCheck, DollarSign, TrendingUp, ArrowRight,
  Wallet, UsersRound, ReceiptText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ResellerPortalPage() {
  const [reseller, setReseller] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current user's reseller profile
  useEffect(() => {
    api
      .get("/isp/resellers?isCurrentUser=true")
      .then((r) => {
        const resellers = r.data.data.resellers || [];
        if (resellers.length > 0) setReseller(resellers[0]);
      })
      .catch(() => {});
  }, []);

  // Fetch summary & recent commissions once reseller ID is known
  useEffect(() => {
    if (!reseller) return;
    setLoading(true);
    Promise.all([
      api.get(`/isp/resellers/${reseller.id}/commissions/summary`),
      api.get(`/isp/resellers/${reseller.id}/commissions?limit=10&sortBy=createdAt&sortOrder=desc`),
    ])
      .then(([summaryRes, commissionsRes]) => {
        setSummary(summaryRes.data.data);
        setCommissions(commissionsRes.data.data.commissions || []);
      })
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, [reseller]);

  if (!reseller && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">No reseller profile found for your account.</p>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-blue-200 border-t-blue-600 rounded-lg animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Customers",
      value: summary?.totalCustomers ?? reseller?._count?.customers ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Active Customers",
      value: summary?.activeCustomers ?? 0,
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Commission This Month",
      value: `$${Number(summary?.thisMonth ?? 0).toFixed(2)}`,
      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Current Balance",
      value: `$${Number(reseller?.currentBalance ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const quickLinks = [
    { label: "My Customers", href: "/customers", icon: Users, description: "Manage your customer base" },
    { label: "Sub-Resellers", href: "/reseller-portal/sub-resellers", icon: UsersRound, description: "Manage your sub-resellers" },
    { label: "Commissions", href: "/reseller-portal/commissions", icon: ReceiptText, description: "View commission history" },
    { label: "Payouts", href: "/reseller-portal/payouts", icon: Wallet, description: "Request and track payouts" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reseller Portal</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Welcome back, {reseller?.businessName || "Reseller"}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-slate-200/80">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                </div>
                <div className={`${s.bg} p-2.5 rounded-lg`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Quick Links
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="border-slate-200/80 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="bg-slate-50 group-hover:bg-blue-50 p-2 rounded-lg transition-colors">
                      <link.icon className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <p className="font-medium text-slate-700 mt-3 text-sm">{link.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{link.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Commissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Recent Commissions
          </h2>
          <Link href="/reseller-portal/commissions">
            <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 text-xs gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <Card className="border-slate-200/80">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Source</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customer</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Amount</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                        No commissions yet
                      </td>
                    </tr>
                  ) : (
                    commissions.map((c: any) => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3 text-slate-500 text-[13px]">
                          {format(new Date(c.createdAt), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.source === "PAYMENT"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-violet-100 text-violet-700"
                            }`}
                          >
                            {c.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[13px]">
                          {c.customer?.fullName || c.customerId || "--"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 text-[13px]">
                          ${Number(c.baseAmount ?? 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-emerald-600 text-[13px]">
                          +${Number(c.commissionAmount ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
