"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, Plus, TrendingUp, TrendingDown, DollarSign,
  Trash2, Edit2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CATEGORIES = ["SALARY", "RENT", "UTILITIES", "BANDWIDTH", "EQUIPMENT", "MAINTENANCE", "MARKETING", "TRANSPORT", "TAXES", "LICENSES", "INSURANCE", "OTHER"];
const CAT_COLORS: Record<string, string> = {
  SALARY: "bg-blue-100 text-blue-700", RENT: "bg-purple-100 text-purple-700",
  UTILITIES: "bg-amber-100 text-amber-700", BANDWIDTH: "bg-cyan-100 text-cyan-700",
  EQUIPMENT: "bg-emerald-100 text-emerald-700", MAINTENANCE: "bg-orange-100 text-orange-700",
  MARKETING: "bg-pink-100 text-pink-700", TRANSPORT: "bg-indigo-100 text-indigo-700",
  TAXES: "bg-red-100 text-red-700", LICENSES: "bg-teal-100 text-teal-700",
  INSURANCE: "bg-slate-100 text-slate-700", OTHER: "bg-gray-100 text-gray-700",
};
const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#dc2626", "#14b8a6", "#64748b", "#84cc16"];

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState("expenses");
  const now = new Date();
  const defaultStart = format(subMonths(now, 12), "yyyy-MM-dd");
  const defaultEnd = format(now, "yyyy-MM-dd");

  // Expenses list
  const [expenses, setExpenses] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Create/Edit
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "OTHER", amount: "", description: "", vendor: "", referenceNo: "", expenseDate: format(now, "yyyy-MM-dd"), paymentMethod: "BANK_TRANSFER", notes: "" });
  const [saving, setSaving] = useState(false);

  // P&L
  const [plStart, setPlStart] = useState(defaultStart);
  const [plEnd, setPlEnd] = useState(defaultEnd);
  const [plData, setPlData] = useState<any>(null);
  const [plLoading, setPlLoading] = useState(false);

  // Summary
  const [sumStart, setSumStart] = useState(defaultStart);
  const [sumEnd, setSumEnd] = useState(defaultEnd);
  const [summary, setSummary] = useState<any>(null);
  const [sumLoading, setSumLoading] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15, sortBy: "expenseDate", sortOrder: "desc" };
      if (search) params.search = search;
      if (catFilter) params.category = catFilter;
      const res = await api.get("/isp/expenses", { params });
      setExpenses(res.data.data.expenses || []);
      setMeta(res.data.meta?.pagination || null);
    } catch { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  }, [page, search, catFilter]);

  const fetchPL = useCallback(async () => {
    setPlLoading(true);
    try {
      const res = await api.get("/isp/expenses/profit-loss", { params: { startDate: plStart, endDate: plEnd } });
      setPlData(res.data.data.report);
    } catch { toast.error("Failed to load P&L"); }
    finally { setPlLoading(false); }
  }, [plStart, plEnd]);

  const fetchSummary = useCallback(async () => {
    setSumLoading(true);
    try {
      const res = await api.get("/isp/expenses/summary", { params: { startDate: sumStart, endDate: sumEnd } });
      setSummary(res.data.data.summary);
    } catch { toast.error("Failed to load summary"); }
    finally { setSumLoading(false); }
  }, [sumStart, sumEnd]);

  useEffect(() => { if (activeTab === "expenses") fetchExpenses(); }, [activeTab, fetchExpenses]);
  useEffect(() => { if (activeTab === "profitloss") fetchPL(); }, [activeTab, fetchPL]);
  useEffect(() => { if (activeTab === "summary") fetchSummary(); }, [activeTab, fetchSummary]);

  const handleSave = async () => {
    if (!form.description || !form.amount) { toast.error("Description and amount required"); return; }
    setSaving(true);
    try {
      const body = { ...form, amount: Number(form.amount) };
      if (editId) {
        await api.patch(`/isp/expenses/${editId}`, body);
        toast.success("Expense updated");
      } else {
        await api.post("/isp/expenses", body);
        toast.success("Expense created");
      }
      setShowForm(false);
      setEditId(null);
      setForm({ category: "OTHER", amount: "", description: "", vendor: "", referenceNo: "", expenseDate: format(now, "yyyy-MM-dd"), paymentMethod: "BANK_TRANSFER", notes: "" });
      fetchExpenses();
    } catch { toast.error("Failed to save expense"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/isp/expenses/${id}`); toast.success("Deleted"); fetchExpenses(); }
    catch { toast.error("Failed to delete"); }
  };

  const openEdit = (e: any) => {
    setForm({ category: e.category, amount: String(Number(e.amount)), description: e.description, vendor: e.vendor || "", referenceNo: e.referenceNo || "", expenseDate: format(new Date(e.expenseDate), "yyyy-MM-dd"), paymentMethod: e.paymentMethod || "BANK_TRANSFER", notes: e.notes || "" });
    setEditId(e.id);
    setShowForm(true);
  };

  const Loader = () => <div className="flex items-center justify-center py-16"><div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Expenses & Profit/Loss</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track business expenses and view financial performance</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="profitloss">Profit & Loss</TabsTrigger>
        </TabsList>

        {/* ══════ Expenses Tab ══════ */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search expenses..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 text-sm" />
              </div>
              <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700">
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Button onClick={() => { setEditId(null); setForm({ category: "OTHER", amount: "", description: "", vendor: "", referenceNo: "", expenseDate: format(now, "yyyy-MM-dd"), paymentMethod: "BANK_TRANSFER", notes: "" }); setShowForm(true); }} className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm h-9">
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? <Loader /> : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.length > 0 ? expenses.map(e => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{format(new Date(e.expenseDate), "MMM d, yyyy")}</TableCell>
                          <TableCell><Badge className={`text-[10px] ${CAT_COLORS[e.category] || "bg-slate-100 text-slate-600"}`}>{e.category}</Badge></TableCell>
                          <TableCell className="font-medium text-sm">{e.description}</TableCell>
                          <TableCell className="text-sm text-slate-500">{e.vendor || "—"}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">{fmt(Number(e.amount))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Edit2 className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-12">No expenses found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {meta && meta.totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-slate-100">
                      <DataTablePagination page={page} totalPages={meta.totalPages} totalResults={meta.totalResults} limit={15} onPageChange={setPage} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════ Summary Tab ══════ */}
        <TabsContent value="summary" className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="date" value={sumStart} onChange={e => setSumStart(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white" />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" value={sumEnd} onChange={e => setSumEnd(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white" />
          </div>

          {sumLoading ? <Loader /> : summary && (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center"><TrendingDown className="h-6 w-6 text-red-500" /></div>
                    <div>
                      <p className="text-sm text-slate-500">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">{fmt(summary.totalExpenses)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                {summary.byCategory?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-700 mb-3">By Category</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={summary.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }: any) => `${category} ${(percent * 100).toFixed(0)}%`}>
                            {summary.byCategory.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
                {summary.monthlyTrend?.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-700 mb-3">Monthly Trend</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={summary.monthlyTrend.map((r: any) => ({ ...r, period: format(new Date(r.period), "MMM yy") }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ══════ P&L Tab ══════ */}
        <TabsContent value="profitloss" className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="date" value={plStart} onChange={e => setPlStart(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white" />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" value={plEnd} onChange={e => setPlEnd(e.target.value)} className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white" />
          </div>

          {plLoading ? <Loader /> : plData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">Total Revenue</p>
                    <p className="text-xl font-bold text-emerald-600">{fmt(plData.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">Total Expenses</p>
                    <p className="text-xl font-bold text-red-600">{fmt(plData.totalExpenses)}</p>
                  </CardContent>
                </Card>
                <Card className={plData.netProfit >= 0 ? "border-emerald-200" : "border-red-200"}>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">Net Profit</p>
                    <p className={`text-xl font-bold ${plData.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(plData.netProfit)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500">Profit Margin</p>
                    <p className={`text-xl font-bold ${plData.profitMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>{plData.profitMargin}%</p>
                  </CardContent>
                </Card>
              </div>

              {plData.monthly?.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">Monthly Revenue vs Expenses</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={plData.monthly.map((r: any) => ({ ...r, period: format(new Date(r.period), "MMM yy") }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                        <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {plData.expenseByCategory?.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">Expense Breakdown</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plData.expenseByCategory.map((r: any) => (
                          <TableRow key={r.category}>
                            <TableCell><Badge className={`text-[10px] ${CAT_COLORS[r.category] || "bg-slate-100"}`}>{r.category}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{fmt(r.total)}</TableCell>
                            <TableCell className="text-right text-slate-500">{plData.totalExpenses > 0 ? Math.round((r.total / plData.totalExpenses) * 100) : 0}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Expense Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was this expense for?" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vendor</Label><Input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Optional" /></div>
              <div><Label>Date</Label><Input type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Reference #</Label><Input value={form.referenceNo} onChange={e => setForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="Optional" /></div>
              <div>
                <Label>Payment Method</Label>
                <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md bg-white">
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CHECK">Check</option>
                </select>
              </div>
            </div>
            <div><Label>Notes</Label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Optional notes" /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              {saving ? "Saving..." : editId ? "Update Expense" : "Add Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
