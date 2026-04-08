"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Wifi, WifiOff, RefreshCw, PauseCircle, PlayCircle,
  Upload, MoreHorizontal, Plus, Edit, Trash2,
  Users, FileText, HeadphonesIcon, BarChart2, Activity,
  CheckCircle, Clock, AlertCircle, XCircle, DollarSign,
  ArrowDown, ArrowUp, Phone, Mail, MapPin, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { IspCustomer, Invoice, InvoiceStatus, SupportTicket, TicketStatus, TicketPriority } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type Tab = "overview" | "invoices" | "tickets" | "traffic" | "logs";

const STATUS_STYLES = {
  customer: {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    SUSPENDED: "bg-amber-100 text-amber-700",
    TERMINATED: "bg-red-100 text-red-700",
    PENDING_ACTIVATION: "bg-blue-100 text-blue-700",
  } as Record<string, string>,
  invoice: {
    DRAFT: "bg-slate-100 text-slate-600",
    SENT: "bg-blue-100 text-blue-700",
    PARTIALLY_PAID: "bg-amber-100 text-amber-700",
    PAID: "bg-emerald-100 text-emerald-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-slate-100 text-slate-500",
    REFUNDED: "bg-purple-100 text-purple-700",
  } as Record<string, string>,
  ticket: {
    OPEN: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    PENDING_CUSTOMER: "bg-purple-100 text-purple-700",
    RESOLVED: "bg-emerald-100 text-emerald-700",
    CLOSED: "bg-slate-100 text-slate-500",
  } as Record<string, string>,
  priority: {
    LOW: "bg-slate-100 text-slate-500",
    MEDIUM: "bg-blue-50 text-blue-600",
    HIGH: "bg-amber-100 text-amber-700",
    CRITICAL: "bg-red-100 text-red-700",
  } as Record<string, string>,
};

interface ConnectionStatus {
  isOnline: boolean;
  ipAddress?: string;
  uptime?: string;
  callerID?: string;
  service?: string;
}

interface CustomerStats {
  invoices: { total: number; paid: number; pending: number; overdue: number; totalAmount: number; paidAmount: number; unpaidAmount: number };
  dataUsed: string;
  ticketCount: number;
}

interface TrafficPoint { period: string; bytesIn: number; bytesOut: number }

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const [customer, setCustomer] = useState<IspCustomer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [traffic, setTraffic] = useState<TrafficPoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invoice create
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    dueDate: "",
    notes: "",
    items: [{ description: "", quantity: 1, unitPrice: 0 }],
  });
  const [savingInvoice, setSavingInvoice] = useState(false);

  // Suspend/reason
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  // Payment
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", reference: "" });
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchCustomer = useCallback(async () => {
    try {
      const [custRes, statsRes] = await Promise.all([
        api.get(`/isp/customers/${id}`),
        api.get(`/isp/customers/${id}/stats`),
      ]);
      setCustomer(custRes.data.data);
      setStats(statsRes.data.data);
    } catch {
      toast.error("Customer not found");
      router.push("/customers");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await api.get(`/isp/invoices?customerId=${id}&limit=50&sortBy=invoiceDate&sortOrder=desc`);
      setInvoices(res.data.data.invoices);
    } catch {}
  }, [id]);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.get(`/isp/tickets?customerId=${id}&limit=50`);
      setTickets(res.data.data.tickets);
    } catch {}
  }, [id]);

  const fetchConnection = useCallback(async () => {
    try {
      const res = await api.get(`/isp/customers/${id}/connection-status`);
      setConnection(res.data.data);
    } catch {}
  }, [id]);

  const fetchTraffic = useCallback(async () => {
    try {
      const res = await api.get(`/isp/customers/${id}/traffic-stats?periodType=DAILY&limit=30`);
      setTraffic(res.data.data || []);
    } catch {}
  }, [id]);

  useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

  useEffect(() => {
    if (tab === "invoices") fetchInvoices();
    if (tab === "tickets") fetchTickets();
    if (tab === "overview") fetchConnection();
    if (tab === "traffic") fetchTraffic();
  }, [tab, fetchInvoices, fetchTickets, fetchConnection, fetchTraffic]);

  const handleSuspend = async () => {
    setActionLoading("suspend");
    try {
      await api.post(`/isp/customers/${id}/suspend`, { reason: suspendReason });
      toast.success("Customer suspended");
      setShowSuspendDialog(false);
      setSuspendReason("");
      fetchCustomer();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to suspend");
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async () => {
    setActionLoading("activate");
    try {
      await api.post(`/isp/customers/${id}/activate`);
      toast.success("Customer activated");
      fetchCustomer();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to activate");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncToRouter = async () => {
    setActionLoading("sync");
    try {
      await api.post(`/isp/customers/${id}/sync-to-router`);
      toast.success("Synced to router");
      fetchCustomer();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Sync failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInvoice(true);
    try {
      await api.post("/isp/invoices", {
        customerId: id,
        dueDate: invoiceForm.dueDate,
        notes: invoiceForm.notes || undefined,
        items: invoiceForm.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      toast.success("Invoice created");
      setShowInvoiceForm(false);
      setInvoiceForm({ dueDate: "", notes: "", items: [{ description: "", quantity: 1, unitPrice: 0 }] });
      fetchInvoices();
      fetchCustomer();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create invoice");
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;
    setSavingPayment(true);
    try {
      await api.post(`/isp/invoices/${payInvoice.id}/payments`, {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.method,
        ...(paymentForm.reference && { reference: paymentForm.reference }),
      });
      toast.success("Payment recorded");
      setPayInvoice(null);
      fetchInvoices();
      fetchCustomer();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const addInvoiceItem = () => setInvoiceForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, unitPrice: 0 }] }));
  const removeInvoiceItem = (i: number) => setInvoiceForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateInvoiceItem = (i: number, field: string, value: string | number) =>
    setInvoiceForm((f) => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  const invoiceTotal = invoiceForm.items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 border-2 border-orange-200 border-t-orange-600 rounded-lg animate-spin" />
    </div>
  );

  if (!customer) return null;

  const isSuspended = customer.status === "SUSPENDED";
  const isActive = customer.status === "ACTIVE";
  const isPending = customer.status === "PENDING_ACTIVATION";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{customer.fullName}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES.customer[customer.status]}`}>
                {customer.status.replace("_", " ")}
              </span>
              {customer.isOnline ? (
                <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                  <Wifi className="h-3.5 w-3.5" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400 text-xs">
                  <WifiOff className="h-3.5 w-3.5" /> Offline
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-mono mt-0.5">{customer.username} · {customer.connectionType}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {(isSuspended || isPending) && (
            <Button
              onClick={handleActivate}
              disabled={actionLoading === "activate"}
              className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 text-sm h-9"
            >
              <PlayCircle className="h-4 w-4" />
              {actionLoading === "activate" ? "Activating..." : "Activate"}
            </Button>
          )}
          {isActive && (
            <Button
              onClick={() => setShowSuspendDialog(true)}
              disabled={actionLoading === "suspend"}
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5 text-sm h-9"
            >
              <PauseCircle className="h-4 w-4" />
              Suspend
            </Button>
          )}
          <Button
            onClick={handleSyncToRouter}
            disabled={actionLoading === "sync"}
            variant="outline"
            className="gap-1.5 text-sm h-9"
          >
            <Upload className="h-4 w-4" />
            {actionLoading === "sync" ? "Syncing..." : "Sync to Router"}
          </Button>
          <Button
            onClick={() => fetchConnection()}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="Refresh connection status"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat label="Total Invoices" value={stats.invoices.total} sub={`$${stats.invoices.totalAmount?.toFixed(2) ?? "0.00"} total`} color="blue" />
          <MiniStat label="Outstanding" value={`$${stats.invoices.unpaidAmount?.toFixed(2) ?? "0.00"}`} sub={`${stats.invoices.overdue} overdue`} color={stats.invoices.overdue > 0 ? "red" : "slate"} />
          <MiniStat label="Data Used" value={formatBytes(customer.dataUsed)} sub={customer.dataLimit ? `of ${formatBytes(customer.dataLimit)}` : "Unlimited"} color="purple" />
          <MiniStat label="Tickets" value={stats.ticketCount} sub="support requests" color="orange" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {([
            { key: "overview", label: "Overview", icon: Activity },
            { key: "invoices", label: "Invoices", icon: FileText },
            { key: "tickets", label: "Tickets", icon: HeadphonesIcon },
            { key: "traffic", label: "Traffic", icon: BarChart2 },
          ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
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

      {/* Tab: Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Customer Info */}
          <Card className="lg:col-span-2 border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <InfoRow icon={Mail} label="Email" value={customer.email || "—"} />
                <InfoRow icon={Phone} label="Phone" value={customer.phone || "—"} />
                <InfoRow icon={MapPin} label="City" value={customer.city || "—"} />
                <InfoRow icon={MapPin} label="Address" value={customer.address || "—"} />
                <InfoRow icon={Calendar} label="Installed" value={customer.installationDate ? format(new Date(customer.installationDate), "MMM d, yyyy") : "—"} />
                <InfoRow icon={Calendar} label="Next Billing" value={customer.nextBillingDate ? format(new Date(customer.nextBillingDate), "MMM d, yyyy") : "—"} />
                <InfoRow icon={Activity} label="IP Address" value={customer.ipAddress || "—"} />
                <InfoRow icon={Activity} label="MAC Address" value={customer.macAddress || "—"} />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-x-8 gap-y-3">
                <InfoRow icon={ArrowDown} label="Package" value={`${customer.package.name} (${customer.package.downloadSpeed}/${customer.package.uploadSpeed} Mbps)`} />
                <InfoRow icon={Activity} label="Router" value={customer.router.name} />
                <InfoRow icon={Users} label="Reseller" value={customer.reseller?.businessName || "Direct"} />
                <InfoRow icon={Calendar} label="Last Online" value={customer.lastOnlineAt ? format(new Date(customer.lastOnlineAt), "MMM d, HH:mm") : "Never"} />
              </div>
            </CardContent>
          </Card>

          {/* Connection Status */}
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Wifi className="h-4 w-4 text-orange-500" />
                Live Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connection ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {connection.isOnline ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-semibold text-sm">Connected</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                        <span className="font-medium text-sm">Disconnected</span>
                      </div>
                    )}
                  </div>
                  {connection.ipAddress && <ConnStat label="IP Address" value={connection.ipAddress} />}
                  {connection.uptime && <ConnStat label="Uptime" value={connection.uptime} />}
                  {connection.callerID && <ConnStat label="Caller ID" value={connection.callerID} />}
                  {connection.service && <ConnStat label="Service" value={connection.service} />}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-400">
                  <Wifi className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                  Connection status unavailable
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Invoices */}
      {tab === "invoices" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
            <Button
              onClick={() => {
                const nextBilling = customer.nextBillingDate ? format(new Date(customer.nextBillingDate), "yyyy-MM-dd") : "";
                setInvoiceForm({
                  dueDate: nextBilling,
                  notes: "",
                  items: [{ description: `${customer.package.name} — Monthly Service`, quantity: 1, unitPrice: Number(customer.package.price) }],
                });
                setShowInvoiceForm(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-sm h-9"
            >
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </div>

          <Card className="border-slate-200/80">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Invoice #</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Balance Due</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Due Date</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No invoices yet</td></tr>
                  ) : invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-mono text-orange-600 font-medium text-[13px]">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">${Number(inv.totalAmount).toFixed(2)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`font-semibold text-[13px] ${Number(inv.balanceDue) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          ${Number(inv.balanceDue).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES.invoice[inv.status]}`}>
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[12px]">{format(new Date(inv.dueDate), "MMM d, yyyy")}</td>
                      <td className="px-3 py-3.5">
                        {!["PAID", "CANCELLED", "REFUNDED"].includes(inv.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-emerald-600 hover:bg-emerald-50"
                            onClick={() => {
                              setPaymentForm({ amount: String(inv.balanceDue), method: "CASH", reference: "" });
                              setPayInvoice(inv);
                            }}
                          >
                            <DollarSign className="h-3 w-3 mr-1" /> Pay
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Tickets */}
      {tab === "tickets" && (
        <Card className="border-slate-200/80">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Ticket #</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Subject</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Priority</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Opened</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">No support tickets</td></tr>
                ) : tickets.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-mono text-orange-600 font-medium text-[13px]">{t.ticketNumber}</td>
                    <td className="px-4 py-3.5 text-slate-700 text-[13px] max-w-[200px] truncate">{t.subject}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES.priority[t.priority]}`}>{t.priority}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES.ticket[t.status]}`}>{t.status.replace("_", " ")}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-[12px]">{format(new Date(t.openedAt), "MMM d, HH:mm")}</td>
                    <td className="px-3 py-3.5">
                      <Link href={`/tickets/${t.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:bg-blue-50">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Traffic */}
      {tab === "traffic" && (
        <div className="space-y-4">
          <Card className="border-slate-200/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Daily Traffic (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {traffic.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={traffic} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ulGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => formatBytes(String(v), true)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                      formatter={(v: number, name: string) => [formatBytes(String(v)), name === "bytesIn" ? "Download" : "Upload"]}
                    />
                    <Area type="monotone" dataKey="bytesIn" stroke="#10b981" strokeWidth={2} fill="url(#dlGrad)" name="Download" />
                    <Area type="monotone" dataKey="bytesOut" stroke="#3b82f6" strokeWidth={2} fill="url(#ulGrad)" name="Upload" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                  <div className="text-center">
                    <BarChart2 className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                    No traffic data available
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Suspend Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-600">This will disable <strong>{customer.username}</strong> on the router immediately.</p>
            <div className="space-y-1.5">
              <Label htmlFor="suspendReason">Reason</Label>
              <Textarea
                id="suspendReason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Non-payment, policy violation..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>Cancel</Button>
              <Button
                onClick={handleSuspend}
                disabled={actionLoading === "suspend"}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {actionLoading === "suspend" ? "Suspending..." : "Suspend"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Invoice — {customer.fullName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input id="dueDate" type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {invoiceForm.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateInvoiceItem(i, "description", e.target.value)}
                      required
                      className="text-sm h-8"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateInvoiceItem(i, "quantity", e.target.value)}
                      min={1}
                      required
                      className="text-sm h-8"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => updateInvoiceItem(i, "unitPrice", e.target.value)}
                      min={0}
                      step="0.01"
                      required
                      className="text-sm h-8"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removeInvoiceItem(i)} disabled={invoiceForm.items.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-semibold text-slate-700 pt-1 border-t border-slate-100">
                Total: ${invoiceTotal.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invNotes">Notes</Label>
              <Textarea id="invNotes" value={invoiceForm.notes} onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes..." />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowInvoiceForm(false)}>Cancel</Button>
              <Button type="submit" disabled={savingInvoice} className="bg-orange-500 hover:bg-orange-600 text-white">
                {savingInvoice ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      {payInvoice && (
        <Dialog open={!!payInvoice} onOpenChange={() => setPayInvoice(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
              <p className="text-sm text-slate-500">Invoice: <span className="font-mono font-medium text-slate-700">{payInvoice.invoiceNumber}</span></p>
              <div className="space-y-1.5">
                <Label>Amount ($) *</Label>
                <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} step="0.01" min="0.01" required />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method *</Label>
                <select value={paymentForm.method} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="ONLINE_PAYMENT">Online Payment</option>
                  <option value="AGENT_COLLECTED">Agent Collected</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input value={paymentForm.reference} onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Transaction ID..." />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setPayInvoice(null)}>Cancel</Button>
                <Button type="submit" disabled={savingPayment} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  {savingPayment ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100",
    red: "bg-red-50 border-red-100",
    purple: "bg-purple-50 border-purple-100",
    orange: "bg-orange-50 border-orange-100",
    slate: "bg-slate-50 border-slate-100",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[color] || colors.slate}`}>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-[13px] text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function ConnStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700 font-mono text-[12px]">{value}</span>
    </div>
  );
}

function formatBytes(bytes: string, short = false): string {
  const n = Number(bytes);
  if (isNaN(n) || n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  const val = (n / Math.pow(1024, i)).toFixed(short ? 0 : 1);
  return `${val} ${units[i]}`;
}
