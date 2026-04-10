"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, RefreshCw, MoreHorizontal, Eye, DollarSign,
  CheckCircle, Clock, AlertCircle, XCircle, FileText,
  Plus, Trash2, Zap, TrendingUp, Users, BarChart3,
  CreditCard, Ban, Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import api from "@/lib/api";
import { Invoice, InvoiceStatus, PaginationMeta, IspCustomer, Payment } from "@/types";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  REFUNDED: "bg-purple-100 text-purple-700",
};

const STATUS_ICON: Record<InvoiceStatus, React.ReactNode> = {
  DRAFT: <FileText className="h-3.5 w-3.5" />,
  SENT: <Clock className="h-3.5 w-3.5" />,
  PARTIALLY_PAID: <DollarSign className="h-3.5 w-3.5" />,
  PAID: <CheckCircle className="h-3.5 w-3.5" />,
  OVERDUE: <AlertCircle className="h-3.5 w-3.5" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5" />,
  REFUNDED: <RefreshCw className="h-3.5 w-3.5" />,
};

const PAYMENT_METHODS: Record<string, string> = {
  CASH: "bg-emerald-100 text-emerald-700",
  BANK_TRANSFER: "bg-blue-100 text-blue-700",
  MOBILE_MONEY: "bg-purple-100 text-purple-700",
  CREDIT_CARD: "bg-amber-100 text-amber-700",
  DEBIT_CARD: "bg-amber-100 text-amber-700",
  CHECK: "bg-slate-100 text-slate-700",
  ONLINE_PAYMENT: "bg-cyan-100 text-cyan-700",
  AGENT_COLLECTED: "bg-indigo-100 text-indigo-700",
};

function fmt(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtLabel(s: string) { return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Dashboard
  const [dashboard, setDashboard] = useState<any>(null);
  const [dashLoading, setDashLoading] = useState(true);

  // Dashboard — Recent Payments table
  const [dashPayments, setDashPayments] = useState<any[]>([]);
  const [dashPaymentsMeta, setDashPaymentsMeta] = useState<PaginationMeta | null>(null);
  const [dashPaymentsPage, setDashPaymentsPage] = useState(1);
  const [dashPaymentsSearch, setDashPaymentsSearch] = useState("");
  const [dashPaymentsLoading, setDashPaymentsLoading] = useState(false);

  // Dashboard — Due List table
  const [dueList, setDueList] = useState<any[]>([]);
  const [dueListMeta, setDueListMeta] = useState<PaginationMeta | null>(null);
  const [dueListPage, setDueListPage] = useState(1);
  const [dueListSearch, setDueListSearch] = useState("");
  const [dueListLoading, setDueListLoading] = useState(false);

  // Payments tab
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsMeta, setPaymentsMeta] = useState<PaginationMeta | null>(null);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [paymentsMethodFilter, setPaymentsMethodFilter] = useState("");
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("invoiceDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [recordPayment, setRecordPayment] = useState<Invoice | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", reference: "", notes: "" });
  const [savingPayment, setSavingPayment] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Create invoice
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customers, setCustomers] = useState<IspCustomer[]>([]);
  const [createForm, setCreateForm] = useState({
    customerId: "",
    dueDate: "",
    notes: "",
    items: [{ description: "", quantity: 1, unitPrice: 0 }],
  });
  const [savingCreate, setSavingCreate] = useState(false);

  // Auto-generate
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [autoGenDueDate, setAutoGenDueDate] = useState("");
  const [autoGenerating, setAutoGenerating] = useState(false);

  // Bulk operations
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  const toggleInvSelect = (id: string) => {
    setSelectedInvoices(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleInvSelectAll = () => {
    if (selectedInvoices.size === invoices.length) setSelectedInvoices(new Set());
    else setSelectedInvoices(new Set(invoices.map(i => i.id)));
  };

  const handleBulkSend = async () => {
    if (selectedInvoices.size === 0) return;
    setBulkSending(true);
    try {
      const res = await api.post("/isp/invoices/bulk-send", { ids: Array.from(selectedInvoices) });
      const r = res.data.data;
      toast.success(`${r.success} invoices sent, ${r.failed} failed`);
      setSelectedInvoices(new Set());
      fetchInvoices();
    } catch { toast.error("Bulk send failed"); }
    finally { setBulkSending(false); }
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      const res = await api.get(`/isp/invoices?${params}`);
      setInvoices(res.data.data.invoices);
      setPagination(res.data.meta.pagination);
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await api.get("/isp/invoices/dashboard");
      setDashboard(res.data.data);
    } catch { toast.error("Failed to load billing dashboard"); }
    finally { setDashLoading(false); }
  }, []);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const params: any = { page: paymentsPage, limit: 15, sortBy: "paymentDate", sortOrder: "desc" };
      if (paymentsSearch) params.search = paymentsSearch;
      if (paymentsMethodFilter) params.paymentMethod = paymentsMethodFilter;
      const res = await api.get("/isp/invoices/payments", { params });
      setPayments(res.data.data.payments || []);
      setPaymentsMeta(res.data.meta?.pagination || null);
    } catch { toast.error("Failed to load payments"); }
    finally { setPaymentsLoading(false); }
  }, [paymentsPage, paymentsSearch, paymentsMethodFilter]);

  const fetchDashPayments = useCallback(async () => {
    setDashPaymentsLoading(true);
    try {
      const params: any = { page: dashPaymentsPage, limit: 10, sortBy: "paymentDate", sortOrder: "desc" };
      if (dashPaymentsSearch) params.search = dashPaymentsSearch;
      const res = await api.get("/isp/invoices/payments", { params });
      setDashPayments(res.data.data.payments || []);
      setDashPaymentsMeta(res.data.meta?.pagination || null);
    } catch { /* silent */ }
    finally { setDashPaymentsLoading(false); }
  }, [dashPaymentsPage, dashPaymentsSearch]);

  const fetchDueList = useCallback(async () => {
    setDueListLoading(true);
    try {
      const params: any = { page: dueListPage, limit: 10, status: "OVERDUE", sortBy: "dueDate", sortOrder: "asc" };
      if (dueListSearch) params.search = dueListSearch;
      const res = await api.get("/isp/invoices", { params });
      setDueList(res.data.data.invoices || []);
      setDueListMeta(res.data.meta?.pagination || null);
    } catch { /* silent */ }
    finally { setDueListLoading(false); }
  }, [dueListPage, dueListSearch]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { if (activeTab === "dashboard") { fetchDashPayments(); fetchDueList(); } }, [activeTab, fetchDashPayments, fetchDueList]);
  useEffect(() => { if (activeTab === "invoices") fetchInvoices(); }, [activeTab, fetchInvoices]);
  useEffect(() => { if (activeTab === "payments") fetchPayments(); }, [activeTab, fetchPayments]);

  const openCreate = () => {
    api.get("/isp/customers?limit=200&status=ACTIVE&sortBy=fullName&sortOrder=asc").then((r) => setCustomers(r.data.data.customers || [])).catch(() => {});
    setCreateForm({ customerId: "", dueDate: "", notes: "", items: [{ description: "", quantity: 1, unitPrice: 0 }] });
    setShowCreateForm(true);
  };

  const handleCustomerSelect = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      const dueDate = cust.nextBillingDate ? format(new Date(cust.nextBillingDate), "yyyy-MM-dd") : "";
      setCreateForm((f) => ({
        ...f,
        customerId,
        dueDate,
        items: [{ description: `${cust.package.name} — Monthly Service`, quantity: 1, unitPrice: Number(cust.package.price) }],
      }));
    } else {
      setCreateForm((f) => ({ ...f, customerId }));
    }
  };

  const addItem = () => setCreateForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, unitPrice: 0 }] }));
  const removeItem = (i: number) => setCreateForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, field: string, value: string | number) =>
    setCreateForm((f) => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreate(true);
    try {
      await api.post("/isp/invoices", {
        customerId: createForm.customerId,
        dueDate: createForm.dueDate,
        notes: createForm.notes || undefined,
        items: createForm.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      toast.success("Invoice created");
      setShowCreateForm(false);
      fetchInvoices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create invoice");
    } finally {
      setSavingCreate(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!autoGenDueDate) { toast.error("Please set a due date"); return; }
    setAutoGenerating(true);
    try {
      const res = await api.post("/isp/invoices/auto-generate", { dueDate: autoGenDueDate });
      const count = res.data.data?.created ?? "?";
      toast.success(`Generated ${count} invoices for active customers`);
      setShowAutoGenerate(false);
      fetchInvoices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Auto-generate failed");
    } finally {
      setAutoGenerating(false);
    }
  };

  const createTotal = createForm.items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unitPrice), 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordPayment) return;
    setSavingPayment(true);
    try {
      await api.post(`/isp/invoices/${recordPayment.id}/payments`, {
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.method,
        ...(paymentForm.reference && { reference: paymentForm.reference }),
        ...(paymentForm.notes && { notes: paymentForm.notes }),
      });
      toast.success("Payment recorded");
      setRecordPayment(null);
      fetchInvoices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const openPaymentDialog = (inv: Invoice) => {
    setPaymentForm({ amount: String(inv.balanceDue), method: "CASH", reference: "", notes: "" });
    setRecordPayment(inv);
  };

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortOrder("asc"); }
    setPage(1);
  };

  const downloadInvoicePDF = async (invoiceId: string) => {
    try {
      const res = await api.get(`/isp/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Failed to download invoice PDF"); }
  };

  const totalOutstanding = invoices.filter((i) => !["PAID", "CANCELLED", "REFUNDED"].includes(i.status)).reduce((sum, i) => sum + i.balanceDue, 0);

  const DashboardCard = ({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: string | number; className?: string }) => (
    <Card className={`${className}`}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">{icon}</div>
        <div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold text-slate-800">{value}</p></div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Billing Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage invoices, payments, and billing automation</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* ══════ Dashboard Tab ══════ */}
        <TabsContent value="dashboard" className="space-y-5">
          {dashLoading ? (
            <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-lg animate-spin" /></div>
          ) : dashboard ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DashboardCard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label="Revenue This Month" value={fmt(dashboard.revenueThisMonth)} />
                <DashboardCard icon={<BarChart3 className="h-5 w-5 text-blue-600" />} label="Revenue Last Month" value={fmt(dashboard.revenueLastMonth)} />
                <DashboardCard icon={<DollarSign className="h-5 w-5 text-amber-600" />} label="Outstanding" value={fmt(dashboard.totalOutstanding)} className={dashboard.totalOutstanding > 0 ? "border-amber-200" : ""} />
                <DashboardCard icon={<AlertCircle className="h-5 w-5 text-red-600" />} label="Overdue" value={fmt(dashboard.overdueAmount)} className={dashboard.overdueAmount > 0 ? "border-red-200 bg-red-50" : ""} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DashboardCard icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} label="Collection Rate" value={`${dashboard.collectionRate}%`} />
                <DashboardCard icon={<Ban className="h-5 w-5 text-red-600" />} label="Suspended Customers" value={dashboard.suspendedCustomers} className={dashboard.suspendedCustomers > 0 ? "border-red-200" : ""} />
                <DashboardCard icon={<FileText className="h-5 w-5 text-blue-600" />} label="Invoices Generated" value={dashboard.totalInvoicesGenerated} />
                <DashboardCard icon={<CreditCard className="h-5 w-5 text-emerald-600" />} label="Invoices Paid" value={dashboard.totalInvoicesPaid} />
              </div>

              {dashboard.atRiskCustomers?.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /> At Risk — Approaching Suspension</h3>
                    <Table>
                      <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Username</TableHead><TableHead className="text-right">Suspend After (days)</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {dashboard.atRiskCustomers.map((c: any) => (
                          <TableRow key={c.id}><TableCell className="font-medium">{c.fullName}</TableCell><TableCell className="text-slate-500">{c.username}</TableCell><TableCell className="text-right"><Badge className="bg-red-100 text-red-700">{c.autoSuspendDays}d</Badge></TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {/* Recent Payments Table */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-700">Recent Payments</h3>
                      <div className="relative w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input placeholder="Search..." value={dashPaymentsSearch} onChange={(e) => { setDashPaymentsSearch(e.target.value); setDashPaymentsPage(1); }} className="pl-8 h-8 text-xs" />
                      </div>
                    </div>
                    {dashPaymentsLoading ? (
                      <div className="flex items-center justify-center py-8"><div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Invoice #</TableHead>
                              <TableHead className="text-xs">Customer</TableHead>
                              <TableHead className="text-xs">Method</TableHead>
                              <TableHead className="text-xs text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dashPayments.length > 0 ? dashPayments.map((p: any) => (
                              <TableRow key={p.id}>
                                <TableCell className="text-xs">{p.invoice?.invoiceNumber || "—"}</TableCell>
                                <TableCell className="text-xs text-slate-500">{p.invoice?.customer?.fullName || "—"}</TableCell>
                                <TableCell><Badge className={`text-[10px] ${PAYMENT_METHODS[p.paymentMethod] || "bg-slate-100 text-slate-600"}`}>{fmtLabel(p.paymentMethod)}</Badge></TableCell>
                                <TableCell className="text-xs text-right font-medium text-emerald-600">{fmt(Number(p.amount))}</TableCell>
                              </TableRow>
                            )) : (
                              <TableRow><TableCell colSpan={4} className="text-center text-xs text-slate-400 py-6">No payments found</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                        {dashPaymentsMeta && dashPaymentsMeta.totalPages > 1 && (
                          <DataTablePagination page={dashPaymentsPage} totalPages={dashPaymentsMeta.totalPages} totalResults={dashPaymentsMeta.totalResults} limit={10} onPageChange={setDashPaymentsPage} />
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Due List Table */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /> Due List</h3>
                      <div className="relative w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input placeholder="Search..." value={dueListSearch} onChange={(e) => { setDueListSearch(e.target.value); setDueListPage(1); }} className="pl-8 h-8 text-xs" />
                      </div>
                    </div>
                    {dueListLoading ? (
                      <div className="flex items-center justify-center py-8"><div className="h-5 w-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Invoice #</TableHead>
                              <TableHead className="text-xs">Customer</TableHead>
                              <TableHead className="text-xs text-right">Balance Due</TableHead>
                              <TableHead className="text-xs text-right">Overdue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dueList.length > 0 ? dueList.map((inv: any) => {
                              const daysOverdue = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                              return (
                                <TableRow key={inv.id}>
                                  <TableCell className="text-xs font-medium">{inv.invoiceNumber}</TableCell>
                                  <TableCell className="text-xs text-slate-500">{inv.customer?.fullName || "—"}</TableCell>
                                  <TableCell className="text-xs text-right font-medium text-red-600">{fmt(Number(inv.balanceDue))}</TableCell>
                                  <TableCell className="text-right"><Badge className={`text-[10px] ${daysOverdue > 30 ? "bg-red-100 text-red-700" : daysOverdue > 14 ? "bg-amber-100 text-amber-700" : "bg-yellow-100 text-yellow-700"}`}>{daysOverdue}d</Badge></TableCell>
                                </TableRow>
                              );
                            }) : (
                              <TableRow><TableCell colSpan={4} className="text-center text-xs text-slate-400 py-6">No overdue invoices</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                        {dueListMeta && dueListMeta.totalPages > 1 && (
                          <DataTablePagination page={dueListPage} totalPages={dueListMeta.totalPages} totalResults={dueListMeta.totalResults} limit={10} onPageChange={setDueListPage} />
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* ══════ Invoices Tab ══════ */}
        <TabsContent value="invoices" className="space-y-5">
      <div className="flex items-start justify-between">
        <div></div>
        <div className="flex items-center gap-2">
          {totalOutstanding > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">Outstanding: ${totalOutstanding.toFixed(2)}</span>
            </div>
          )}
          {selectedInvoices.size > 0 && (
            <Button
              onClick={handleBulkSend}
              disabled={bulkSending}
              variant="outline"
              className="gap-1.5 text-sm h-9 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            >
              {bulkSending ? "Sending..." : `Send ${selectedInvoices.size} Invoice${selectedInvoices.size > 1 ? "s" : ""}`}
            </Button>
          )}
          <Button
            onClick={() => { setAutoGenDueDate(""); setShowAutoGenerate(true); }}
            variant="outline"
            className="gap-1.5 text-sm h-9 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Zap className="h-4 w-4" /> Auto-Generate
          </Button>
          <Button onClick={openCreate} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm h-9">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search invoice #, customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 text-sm" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <Button variant="outline" size="sm" onClick={fetchInvoices} className="h-9 gap-1.5 text-sm">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Card className="border-slate-200/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" checked={invoices.length > 0 && selectedInvoices.size === invoices.length} onChange={toggleInvSelectAll} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="text-left px-5 py-3">
                    <SortableHeader label="Invoice #" sortKey="invoiceNumber" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Reseller</th>
                  <th className="text-left px-4 py-3">
                    <SortableHeader label="Amount" sortKey="totalAmount" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Balance Due</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3">
                    <SortableHeader label="Due Date" sortKey="dueDate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No invoices found</td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-3.5">
                      <input type="checkbox" checked={selectedInvoices.has(inv.id)} onChange={() => toggleInvSelect(inv.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-blue-600 font-medium text-[13px]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-700 text-[13px]">{inv.customer.fullName}</p>
                      <p className="text-[11px] text-slate-400">{inv.customer.username}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[13px]">
                      {inv.reseller?.businessName || "Direct"}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      ${Number(inv.totalAmount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`font-semibold text-[13px] ${Number(inv.balanceDue) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        ${Number(inv.balanceDue).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${STATUS_STYLES[inv.status]}`}>
                        {STATUS_ICON[inv.status]}
                        {inv.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[12px]">
                      {format(new Date(inv.dueDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-3.5 relative">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpenMenu(openMenu === inv.id ? null : inv.id)}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {openMenu === inv.id && (
                        <div className="absolute right-4 top-10 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-40" onMouseLeave={() => setOpenMenu(null)}>
                          <button onClick={() => { setViewInvoice(inv); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Eye className="h-3.5 w-3.5" /> View Details
                          </button>
                          <button onClick={() => { downloadInvoicePDF(inv.id); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Download className="h-3.5 w-3.5" /> Download PDF
                          </button>
                          {!["PAID", "CANCELLED", "REFUNDED"].includes(inv.status) && (
                            <button onClick={() => { openPaymentDialog(inv); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                              <DollarSign className="h-3.5 w-3.5" /> Record Payment
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && (
            <div className="px-5 py-3 border-t border-slate-100">
              <DataTablePagination page={pagination.page} totalPages={pagination.totalPages} totalResults={pagination.totalResults} hasNext={pagination.hasNext} hasPrev={pagination.hasPrev} onPageChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      {viewInvoice && (
        <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Invoice {viewInvoice.invoiceNumber}</DialogTitle>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => downloadInvoicePDF(viewInvoice.id)}>
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </Button>
              </div>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Customer" value={viewInvoice.customer.fullName} />
                <DetailRow label="Reseller" value={viewInvoice.reseller?.businessName || "Direct"} />
                <DetailRow label="Status" value={<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[viewInvoice.status]}`}>{viewInvoice.status.replace("_", " ")}</span>} />
                <DetailRow label="Invoice Date" value={format(new Date(viewInvoice.invoiceDate), "MMM d, yyyy")} />
                <DetailRow label="Due Date" value={format(new Date(viewInvoice.dueDate), "MMM d, yyyy")} />
                <DetailRow label="Paid Date" value={viewInvoice.paidDate ? format(new Date(viewInvoice.paidDate), "MMM d, yyyy") : "—"} />
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Line Items</p>
                {viewInvoice.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                    <span className="text-slate-600">{item.description} × {item.quantity}</span>
                    <span className="font-medium text-slate-800">${Number(item.totalPrice).toFixed(2)}</span>
                  </div>
                ))}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold text-slate-800">${Number(viewInvoice.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Paid</span>
                    <span className="font-semibold text-emerald-600">${Number(viewInvoice.paidAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-100 pt-1.5">
                    <span className="font-medium text-slate-700">Balance Due</span>
                    <span className={`font-bold text-lg ${Number(viewInvoice.balanceDue) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      ${Number(viewInvoice.balanceDue).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}

      {/* Record Payment Dialog */}
      {recordPayment && (
        <Dialog open={!!recordPayment} onOpenChange={() => setRecordPayment(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <form onSubmit={handleRecordPayment}>
              <DialogBody className="space-y-4">
              <p className="text-sm text-slate-500">Invoice: <span className="font-mono font-medium text-slate-700">{recordPayment.invoiceNumber}</span></p>
              <div className="space-y-1.5">
                <Label htmlFor="payAmount">Amount ($) *</Label>
                <Input id="payAmount" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} step="0.01" min="0.01" max={String(recordPayment.balanceDue)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method *</Label>
                <select value={paymentForm.method} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="ONLINE_PAYMENT">Online Payment</option>
                  <option value="AGENT_COLLECTED">Agent Collected</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payRef">Reference</Label>
                <Input id="payRef" value={paymentForm.reference} onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Transaction ID..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payNotes">Notes</Label>
                <Input id="payNotes" value={paymentForm.notes} onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRecordPayment(null)}>Cancel</Button>
                <Button type="submit" disabled={savingPayment} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  {savingPayment ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateInvoice}>
            <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <select
                value={createForm.customerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                required
              >
                <option value="">Select active customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName} ({c.username})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <Input type="date" value={createForm.dueDate} onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {createForm.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                    <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} required className="text-sm h-8" />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} min={1} required className="text-sm h-8" />
                    <Input type="number" placeholder="Price" value={item.unitPrice} onChange={(e) => updateItem(i, "unitPrice", e.target.value)} min={0} step="0.01" required className="text-sm h-8" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removeItem(i)} disabled={createForm.items.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-semibold text-slate-700 pt-1 border-t border-slate-100">
                Total: ${createTotal.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              <Button type="submit" disabled={savingCreate} className="bg-blue-500 hover:bg-blue-600 text-white">
                {savingCreate ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Auto-Generate Dialog */}
      <Dialog open={showAutoGenerate} onOpenChange={setShowAutoGenerate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Auto-Generate Monthly Invoices</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
              This will create one invoice for <strong>every active customer</strong> using their current package price, with the specified due date.
            </div>
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <Input type="date" value={autoGenDueDate} onChange={(e) => setAutoGenDueDate(e.target.value)} required />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAutoGenerate(false)}>Cancel</Button>
            <Button
              onClick={handleAutoGenerate}
              disabled={autoGenerating || !autoGenDueDate}
              className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
            >
              <Zap className="h-4 w-4" />
              {autoGenerating ? "Generating..." : "Generate All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* ══════ Payments Tab ══════ */}
        <TabsContent value="payments" className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by reference or invoice..." value={paymentsSearch}
                onChange={(e) => { setPaymentsSearch(e.target.value); setPaymentsPage(1); }}
                className="pl-9 w-64 h-9 bg-white border-slate-200 text-sm" />
            </div>
            <select value={paymentsMethodFilter} onChange={(e) => { setPaymentsMethodFilter(e.target.value); setPaymentsPage(1); }}
              className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
              <option value="">All Methods</option>
              {Object.keys(PAYMENT_METHODS).map(m => <option key={m} value={m}>{fmtLabel(m)}</option>)}
            </select>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Invoice</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Customer</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Method</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-lg animate-spin mx-auto" /></TableCell></TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400">No payments found</TableCell></TableRow>
                  ) : payments.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-sm">{format(new Date(p.paymentDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-sm font-medium">{p.invoice?.invoiceNumber || "—"}</TableCell>
                      <TableCell className="text-sm text-slate-600">{p.invoice?.customer?.fullName || "—"}</TableCell>
                      <TableCell className="text-sm font-semibold text-right text-emerald-600">{fmt(Number(p.amount))}</TableCell>
                      <TableCell><Badge className={`text-xs ${PAYMENT_METHODS[p.paymentMethod] || "bg-slate-100 text-slate-600"}`}>{fmtLabel(p.paymentMethod)}</Badge></TableCell>
                      <TableCell className="text-sm text-slate-500">{p.referenceNumber || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {paymentsMeta && (
            <DataTablePagination page={paymentsPage} totalPages={paymentsMeta.totalPages} totalResults={paymentsMeta.totalResults}
              limit={15} onPageChange={setPaymentsPage} onLimitChange={() => {}} />
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-28 shrink-0 text-slate-400 font-medium">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
