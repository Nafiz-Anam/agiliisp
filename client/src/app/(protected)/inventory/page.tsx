"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Package,
  BoxIcon,
  Truck,
  AlertTriangle,
  Wrench,
  ShoppingCart,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowDownUp,
  ClipboardList,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useConfirm } from "@/components/ui/confirm-dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

// --- Types ---

interface DashboardStats {
  totalItems: number;
  totalInStock: number;
  totalDeployed: number;
  totalDamaged: number;
  totalInRepair: number;
  lowStockCount: number;
  pendingOrders: number;
  categoryBreakdown: { category: string; count: number; inStock: number }[];
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  model: string;
  description?: string;
  unitCost: number;
  sellingPrice?: number;
  minStockThreshold: number;
  totalQuantity: number;
  inStockCount: number;
  deployedCount: number;
  damagedCount: number;
  inRepairCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  condition: string;
  reference: string;
  notes: string;
  createdAt: string;
  user?: { name: string };
  customer?: { name: string };
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  supplierContact: string;
  supplierEmail: string;
  status: string;
  totalAmount: number;
  expectedDate: string;
  notes: string;
  createdAt: string;
  items: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: { name: string; sku: string };
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

// --- Constants ---

const CATEGORY_COLORS: Record<string, string> = {
  ROUTER: "bg-blue-100 text-blue-700",
  ONU: "bg-purple-100 text-purple-700",
  CABLE: "bg-amber-100 text-amber-700",
  SPLITTER: "bg-emerald-100 text-emerald-700",
  TOOL: "bg-slate-100 text-slate-700",
  OTHER: "bg-slate-100 text-slate-700",
};

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-blue-100 text-blue-700",
  ORDERED: "bg-amber-100 text-amber-700",
  PARTIALLY_RECEIVED: "bg-purple-100 text-purple-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const TRANSACTION_TYPES = [
  "PURCHASE_IN",
  "DEPLOY_OUT",
  "RETURN_IN",
  "DAMAGE",
  "REPAIR_SEND",
  "REPAIR_RETURN",
  "ADJUSTMENT",
  "SALE",
  "DECOMMISSION",
];

const CONDITIONS = [
  "NEW",
  "GOOD",
  "FAIR",
  "DAMAGED",
  "DEFECTIVE",
  "DECOMMISSIONED",
];

interface Category {
  id: string;
  name: string;
  description: string | null;
  _count?: { items: number };
}

// --- Helpers ---

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-lg animate-spin mx-auto" />
    </div>
  );
}

function formatLabel(str: string) {
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// --- Main Component ---

export default function InventoryPage() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);

  // Items
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemsMeta, setItemsMeta] = useState<PaginationMeta>({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsLimit, setItemsLimit] = useState(20);
  const [itemsSearch, setItemsSearch] = useState("");
  const [itemsCategoryFilter, setItemsCategoryFilter] = useState("all");
  const [itemsSortBy, setItemsSortBy] = useState("name");
  const [itemsSortOrder, setItemsSortOrder] = useState<"asc" | "desc">("asc");

  // Item dialogs
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", sku: "", categoryId: "", brand: "", model: "", description: "", unitCost: "", sellingPrice: "", minStockThreshold: "5" });

  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [txForm, setTxForm] = useState({ type: "PURCHASE_IN", quantity: "1", condition: "NEW", customerId: "", reference: "", notes: "" });

  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<Transaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Purchase Orders
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [poMeta, setPoMeta] = useState<PaginationMeta>({ page: 1, limit: 20, totalPages: 1, total: 0 });
  const [poPage, setPoPage] = useState(1);
  const [poLimit, setPoLimit] = useState(20);
  const [poStatusFilter, setPoStatusFilter] = useState("all");

  const [showPoDialog, setShowPoDialog] = useState(false);
  const [poForm, setPoForm] = useState({ supplier: "", supplierContact: "", supplierEmail: "", expectedDate: "", notes: "" });
  const [poLineItems, setPoLineItems] = useState<{ inventoryItemId: string; quantity: string; unitCost: string }[]>([{ inventoryItemId: "", quantity: "1", unitCost: "0" }]);

  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});

  // All items list for PO line item selection
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);

  // --- Fetch Functions ---

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/isp/inventory/categories");
      setCategories(res.data.data?.categories || []);
    } catch { /* silent */ }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get("/isp/inventory/dashboard");
      setDashboard(res.data.data);
    } catch {
      toast.error("Failed to load dashboard");
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: itemsPage, limit: itemsLimit, sortBy: itemsSortBy, sortOrder: itemsSortOrder };
      if (itemsSearch) params.search = itemsSearch;
      if (itemsCategoryFilter !== "all") params.categoryId = itemsCategoryFilter;
      const res = await api.get("/isp/inventory", { params });
      setItems(res.data.data.items || []);
      setItemsMeta(res.data.data.meta || { page: 1, limit: 20, totalPages: 1, total: 0 });
    } catch {
      toast.error("Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  }, [itemsPage, itemsLimit, itemsSearch, itemsCategoryFilter, itemsSortBy, itemsSortOrder]);

  const fetchAllItems = useCallback(async () => {
    try {
      const res = await api.get("/isp/inventory", { params: { limit: 200 } });
      setAllItems(res.data.data.items || []);
    } catch {
      // silent
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: poPage, limit: poLimit };
      if (poStatusFilter !== "all") params.status = poStatusFilter;
      const res = await api.get("/isp/inventory/purchase-orders", { params });
      setPurchaseOrders(res.data.data.purchaseOrders || []);
      setPoMeta(res.data.data.meta || { page: 1, limit: 20, totalPages: 1, total: 0 });
    } catch {
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [poPage, poLimit, poStatusFilter]);

  // --- Effects ---

  useEffect(() => {
    fetchDashboard();
    fetchAllItems();
    fetchCategories();
  }, [fetchDashboard, fetchAllItems, fetchCategories]);

  useEffect(() => {
    if (activeTab === "items") fetchItems();
  }, [activeTab, fetchItems]);

  useEffect(() => {
    if (activeTab === "purchase-orders") fetchPurchaseOrders();
  }, [activeTab, fetchPurchaseOrders]);

  // --- Item Handlers ---

  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm({ name: "", sku: "", categoryId: "", brand: "", model: "", description: "", unitCost: "", sellingPrice: "", minStockThreshold: "5" });
    setShowItemDialog(true);
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      sku: item.sku,
      categoryId: item.categoryId || "",
      brand: item.brand || "",
      model: item.model || "",
      description: item.description || "",
      unitCost: String(item.unitCost || ""),
      sellingPrice: String(item.sellingPrice || ""),
      minStockThreshold: String(item.minStockThreshold),
    });
    setShowItemDialog(true);
  };

  const handleSaveItem = async () => {
    const payload = {
      name: itemForm.name,
      sku: itemForm.sku,
      categoryId: itemForm.categoryId,
      brand: itemForm.brand,
      model: itemForm.model,
      description: itemForm.description,
      unitCost: parseFloat(itemForm.unitCost) || 0,
      sellingPrice: parseFloat(itemForm.sellingPrice) || 0,
      minStockThreshold: parseInt(itemForm.minStockThreshold) || 0,
    };
    try {
      if (editingItem) {
        await api.patch(`/isp/inventory/${editingItem.id}`, payload);
        toast.success("Item updated");
      } else {
        await api.post("/isp/inventory", payload);
        toast.success("Item created");
      }
      setShowItemDialog(false);
      fetchItems();
      fetchDashboard();
      fetchAllItems();
    } catch {
      toast.error(editingItem ? "Failed to update item" : "Failed to create item");
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    const confirmed = await confirm({
      title: "Delete Item",
      description: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await api.delete(`/isp/inventory/${item.id}`);
      toast.success("Item deleted");
      fetchItems();
      fetchDashboard();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  // --- Transaction Handlers ---

  const openTransaction = (item: InventoryItem) => {
    setTransactionItem(item);
    setTxForm({ type: "PURCHASE_IN", quantity: "1", condition: "NEW", customerId: "", reference: "", notes: "" });
    setShowTransactionDialog(true);
  };

  const handleSubmitTransaction = async () => {
    if (!transactionItem) return;
    const payload: Record<string, unknown> = {
      type: txForm.type,
      quantity: parseInt(txForm.quantity) || 0,
      condition: txForm.condition,
      reference: txForm.reference,
      notes: txForm.notes,
    };
    if (txForm.customerId) payload.customerId = txForm.customerId;
    try {
      await api.post(`/isp/inventory/${transactionItem.id}/transactions`, payload);
      toast.success("Transaction recorded");
      setShowTransactionDialog(false);
      fetchItems();
      fetchDashboard();
    } catch {
      toast.error("Failed to record transaction");
    }
  };

  // --- Details Handler ---

  const openDetails = async (item: InventoryItem) => {
    setDetailItem(item);
    setDetailTransactions([]);
    setDetailLoading(true);
    setShowDetailsDialog(true);
    try {
      const res = await api.get(`/isp/inventory/${item.id}/transactions`);
      setDetailTransactions(res.data.data.transactions || []);
    } catch {
      toast.error("Failed to load transaction history");
    } finally {
      setDetailLoading(false);
    }
  };

  // --- Purchase Order Handlers ---

  const openCreatePO = () => {
    setPoForm({ supplier: "", supplierContact: "", supplierEmail: "", expectedDate: "", notes: "" });
    setPoLineItems([{ inventoryItemId: "", quantity: "1", unitCost: "0" }]);
    setShowPoDialog(true);
  };

  const addPoLineItem = () => {
    setPoLineItems([...poLineItems, { inventoryItemId: "", quantity: "1", unitCost: "0" }]);
  };

  const removePoLineItem = (idx: number) => {
    setPoLineItems(poLineItems.filter((_, i) => i !== idx));
  };

  const updatePoLineItem = (idx: number, field: string, value: string) => {
    const updated = [...poLineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setPoLineItems(updated);
  };

  const handleCreatePO = async () => {
    const payload = {
      supplier: poForm.supplier,
      supplierContact: poForm.supplierContact,
      supplierEmail: poForm.supplierEmail,
      expectedDate: poForm.expectedDate || undefined,
      notes: poForm.notes,
      items: poLineItems
        .filter((li) => li.inventoryItemId)
        .map((li) => ({
          inventoryItemId: li.inventoryItemId,
          quantity: parseInt(li.quantity) || 0,
          unitCost: parseFloat(li.unitCost) || 0,
        })),
    };
    try {
      await api.post("/isp/inventory/purchase-orders", payload);
      toast.success("Purchase order created");
      setShowPoDialog(false);
      fetchPurchaseOrders();
      fetchDashboard();
    } catch {
      toast.error("Failed to create purchase order");
    }
  };

  // --- Receive PO Handlers ---

  const openReceivePO = async (po: PurchaseOrder) => {
    try {
      const res = await api.get(`/isp/inventory/purchase-orders/${po.id}`);
      const fullPo = res.data.data;
      setReceivePo(fullPo);
      const quantities: Record<string, string> = {};
      (fullPo.items || []).forEach((item: PurchaseOrderItem) => {
        quantities[item.inventoryItemId] = String(item.quantity - (item.receivedQuantity || 0));
      });
      setReceiveQuantities(quantities);
      setShowReceiveDialog(true);
    } catch {
      toast.error("Failed to load purchase order details");
    }
  };

  const handleReceivePO = async () => {
    if (!receivePo) return;
    const payload = {
      items: Object.entries(receiveQuantities)
        .filter(([, qty]) => parseInt(qty) > 0)
        .map(([inventoryItemId, qty]) => ({
          inventoryItemId,
          receivedQuantity: parseInt(qty) || 0,
        })),
    };
    try {
      await api.post(`/isp/inventory/purchase-orders/${receivePo.id}/receive`, payload);
      toast.success("Items received successfully");
      setShowReceiveDialog(false);
      fetchPurchaseOrders();
      fetchItems();
      fetchDashboard();
    } catch {
      toast.error("Failed to receive items");
    }
  };

  // --- Sort Handler ---

  const handleSort = (field: string, order: "asc" | "desc") => {
    setItemsSortBy(field);
    setItemsSortOrder(order);
    setItemsPage(1);
  };

  // --- Render ---

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">ISP Inventory Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        {/* ========== DASHBOARD TAB ========== */}
        <TabsContent value="dashboard" className="space-y-6">
          {!dashboard ? (
            <Spinner />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <DashboardCard icon={<Package className="h-5 w-5 text-blue-600" />} label="Product Types" value={dashboard.totalItems} />
                <DashboardCard icon={<BoxIcon className="h-5 w-5 text-emerald-600" />} label="Available Units" value={dashboard.totalInStock} />
                <DashboardCard icon={<Truck className="h-5 w-5 text-amber-600" />} label="Deployed" value={dashboard.totalDeployed} />
                <DashboardCard icon={<AlertTriangle className="h-5 w-5 text-red-600" />} label="Damaged" value={dashboard.totalDamaged} />
                <DashboardCard icon={<Wrench className="h-5 w-5 text-purple-600" />} label="In Repair" value={dashboard.totalInRepair} />
                <DashboardCard
                  icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                  label="Low Stock"
                  value={dashboard.lowStockCount}
                  className={dashboard.lowStockCount > 0 ? "border-red-200 bg-red-50" : ""}
                />
                <DashboardCard icon={<ShoppingCart className="h-5 w-5 text-blue-600" />} label="Pending POs" value={dashboard.pendingOrders} />
              </div>

              {dashboard.categoryBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Item Types</TableHead>
                          <TableHead className="text-right">Available Units</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.categoryBreakdown.map((cat) => (
                          <TableRow key={cat.category}>
                            <TableCell>
                              <Badge className={CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.OTHER}>
                                {formatLabel(cat.category)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{cat.count}</TableCell>
                            <TableCell className="text-right font-medium">{cat.inStock}</TableCell>
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

        {/* ========== ITEMS TAB ========== */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search items..."
                value={itemsSearch}
                onChange={(e) => { setItemsSearch(e.target.value); setItemsPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={itemsCategoryFilter} onValueChange={(v) => { setItemsCategoryFilter(v); setItemsPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreateItem} className="bg-blue-500 hover:bg-blue-600 text-white ml-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Item
            </Button>
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>
                        <SortableHeader label="Name" field="name" currentSort={itemsSortBy} currentOrder={itemsSortOrder} onSort={handleSort} />
                      </TableHead>
                      <TableHead>
                        <SortableHeader label="SKU" field="sku" currentSort={itemsSortBy} currentOrder={itemsSortOrder} onSort={handleSort} />
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">In Stock</TableHead>
                      <TableHead className="text-right">Deployed</TableHead>
                      <TableHead className="text-right">Damaged</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                          No inventory items found
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-800">{item.name}</p>
                              {item.brand && <p className="text-xs text-slate-500">{item.brand}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 font-mono text-sm">{item.sku}</TableCell>
                          <TableCell>
                            <Badge className={CATEGORY_COLORS[(item as any).category?.name?.toUpperCase()] || CATEGORY_COLORS.OTHER}>
                              {(item as any).category?.name || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.inStockCount}</TableCell>
                          <TableCell className="text-right font-medium">{item.deployedCount}</TableCell>
                          <TableCell className="text-right font-medium">{item.damagedCount}</TableCell>
                          <TableCell className="text-right font-medium">{item.totalQuantity}</TableCell>
                          <TableCell>
                            {item.inStockCount <= item.minStockThreshold ? (
                              <Badge className="bg-red-100 text-red-700">Low Stock</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetails(item)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditItem(item)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openTransaction(item)}>
                                  <ArrowDownUp className="h-4 w-4 mr-2" />
                                  Record Transaction
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteItem(item)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination
                page={itemsMeta.page}
                totalPages={itemsMeta.totalPages}
                totalResults={itemsMeta.total}
                limit={itemsMeta.limit}
                onPageChange={(p) => setItemsPage(p)}
                onLimitChange={(l) => { setItemsLimit(l); setItemsPage(1); }}
              />
            </>
          )}
        </TabsContent>

        {/* ========== PURCHASE ORDERS TAB ========== */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Select value={poStatusFilter} onValueChange={(v) => { setPoStatusFilter(v); setPoPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.keys(PO_STATUS_COLORS).map((s) => (
                  <SelectItem key={s} value={s}>{formatLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreatePO} className="bg-blue-500 hover:bg-blue-600 text-white ml-auto">
              <Plus className="h-4 w-4 mr-2" />
              New PO
            </Button>
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Order #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Expected Date</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                          No purchase orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseOrders.map((po) => (
                        <TableRow key={po.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono text-sm font-medium">{po.orderNumber}</TableCell>
                          <TableCell className="font-medium text-slate-800">{po.supplier}</TableCell>
                          <TableCell>
                            <Badge className={PO_STATUS_COLORS[po.status] || PO_STATUS_COLORS.DRAFT}>
                              {formatLabel(po.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{po.items?.length || 0}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${(po.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {po.createdAt ? format(new Date(po.createdAt), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {po.expectedDate ? format(new Date(po.expectedDate), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {(po.status === "ORDERED" || po.status === "PARTIALLY_RECEIVED") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                onClick={() => openReceivePO(po)}
                              >
                                Receive
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination
                page={poMeta.page}
                totalPages={poMeta.totalPages}
                totalResults={poMeta.total}
                limit={poMeta.limit}
                onPageChange={(p) => setPoPage(p)}
                onLimitChange={(l) => { setPoLimit(l); setPoPage(1); }}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ========== CREATE / EDIT ITEM DIALOG ========== */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "New Inventory Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. Huawei HG8245H" />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} placeholder="e.g. ONU-HW-001" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={itemForm.categoryId} onValueChange={(v) => setItemForm({ ...itemForm, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input value={itemForm.brand} onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value })} placeholder="e.g. Huawei" />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={itemForm.model} onChange={(e) => setItemForm({ ...itemForm, model: e.target.value })} placeholder="e.g. HG8245H" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unit Cost ($)</Label>
                <Input type="number" value={itemForm.unitCost} onChange={(e) => setItemForm({ ...itemForm, unitCost: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Selling Price ($)</Label>
                <Input type="number" value={itemForm.sellingPrice} onChange={(e) => setItemForm({ ...itemForm, sellingPrice: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Min Stock Threshold</Label>
                <Input type="number" value={itemForm.minStockThreshold} onChange={(e) => setItemForm({ ...itemForm, minStockThreshold: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveItem} className="bg-blue-500 hover:bg-blue-600 text-white">
                {editingItem ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== RECORD TRANSACTION DIALOG ========== */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Transaction</DialogTitle>
          </DialogHeader>
          {transactionItem && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Item: <span className="font-medium text-slate-800">{transactionItem.name}</span> ({transactionItem.sku})
              </p>
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={txForm.type} onValueChange={(v) => setTxForm({ ...txForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{formatLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select value={txForm.condition} onValueChange={(v) => setTxForm({ ...txForm, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{formatLabel(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={txForm.reference} onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })} placeholder="e.g. PO-2024-001" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={txForm.notes} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmitTransaction} className="bg-blue-500 hover:bg-blue-600 text-white">
                  Submit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== VIEW DETAILS DIALOG ========== */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Name</p>
                  <p className="font-medium text-slate-800">{detailItem.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">SKU</p>
                  <p className="font-mono text-sm">{detailItem.sku}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Category</p>
                  <Badge className={CATEGORY_COLORS[(detailItem as any).category?.name?.toUpperCase()] || CATEGORY_COLORS.OTHER}>
                    {(detailItem as any).category?.name || "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Brand / Model</p>
                  <p className="text-sm">{detailItem.brand} {detailItem.model}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Unit Cost</p>
                  <p className="font-medium">${(detailItem.unitCost || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Min Stock Threshold</p>
                  <p className="font-medium">{detailItem.minStockThreshold}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <Card className="p-3">
                  <p className="text-xs text-slate-500">In Stock</p>
                  <p className="text-xl font-bold text-emerald-600">{detailItem.inStockCount}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-slate-500">Deployed</p>
                  <p className="text-xl font-bold text-blue-600">{detailItem.deployedCount}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-slate-500">Damaged</p>
                  <p className="text-xl font-bold text-red-600">{detailItem.damagedCount}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-slate-500">In Repair</p>
                  <p className="text-xl font-bold text-purple-600">{detailItem.inRepairCount}</p>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Recent Transactions</h3>
                {detailLoading ? (
                  <Spinner />
                ) : detailTransactions.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No transactions recorded</p>
                ) : (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailTransactions.slice(0, 20).map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <Badge variant="outline">{formatLabel(tx.type)}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{tx.quantity}</TableCell>
                            <TableCell className="text-sm text-slate-600">{formatLabel(tx.condition)}</TableCell>
                            <TableCell className="text-sm text-slate-600">{tx.reference || "-"}</TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {tx.createdAt ? format(new Date(tx.createdAt), "MMM dd, yyyy HH:mm") : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== CREATE PURCHASE ORDER DIALOG ========== */}
      <Dialog open={showPoDialog} onOpenChange={setShowPoDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input value={poForm.supplier} onChange={(e) => setPoForm({ ...poForm, supplier: e.target.value })} placeholder="Supplier name" />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={poForm.supplierContact} onChange={(e) => setPoForm({ ...poForm, supplierContact: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={poForm.supplierEmail} onChange={(e) => setPoForm({ ...poForm, supplierEmail: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Date</Label>
                <Input type="date" value={poForm.expectedDate} onChange={(e) => setPoForm({ ...poForm, expectedDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Line Items</Label>
                <Button variant="outline" size="sm" onClick={addPoLineItem}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              {poLineItems.map((li, idx) => (
                <div key={idx} className="flex items-end gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Item</Label>
                    <Select value={li.inventoryItemId} onValueChange={(v) => updatePoLineItem(idx, "inventoryItemId", v)}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>
                        {allItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min="1" value={li.quantity} onChange={(e) => updatePoLineItem(idx, "quantity", e.target.value)} />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Unit Cost ($)</Label>
                    <Input type="number" value={li.unitCost} onChange={(e) => updatePoLineItem(idx, "unitCost", e.target.value)} />
                  </div>
                  {poLineItems.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700" onClick={() => removePoLineItem(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowPoDialog(false)}>Cancel</Button>
              <Button onClick={handleCreatePO} className="bg-blue-500 hover:bg-blue-600 text-white">
                Create PO
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== RECEIVE PO DIALOG ========== */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receive Items - {receivePo?.orderNumber}</DialogTitle>
          </DialogHeader>
          {receivePo && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Supplier: <span className="font-medium">{receivePo.supplier}</span>
              </p>
              <div className="space-y-3">
                {(receivePo.items || []).map((item) => {
                  const remaining = item.quantity - (item.receivedQuantity || 0);
                  return (
                    <div key={item.inventoryItemId} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.inventoryItem?.name || "Item"}</p>
                        <p className="text-xs text-slate-500">
                          Ordered: {item.quantity} | Received: {item.receivedQuantity || 0} | Remaining: {remaining}
                        </p>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min="0"
                          max={remaining}
                          value={receiveQuantities[item.inventoryItemId] || "0"}
                          onChange={(e) => setReceiveQuantities({ ...receiveQuantities, [item.inventoryItemId]: e.target.value })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>Cancel</Button>
                <Button onClick={handleReceivePO} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  Confirm Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Dashboard Card Sub-Component ---

function DashboardCard({
  icon,
  label,
  value,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">{icon}</div>
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
