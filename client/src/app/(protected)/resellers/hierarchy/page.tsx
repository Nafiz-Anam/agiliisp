"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Users, Plus, Building2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";

interface ResellerNode {
  id: string;
  businessName: string;
  level: "MASTER" | "AREA" | "SUB";
  balance: number;
  _count?: { customers: number };
  childResellers?: ResellerNode[];
}

const LEVEL_STYLES: Record<string, string> = {
  MASTER: "bg-purple-100 text-purple-700",
  AREA: "bg-blue-100 text-blue-700",
  SUB: "bg-emerald-100 text-emerald-700",
};

export default function ResellerHierarchyPage() {
  const [tree, setTree] = useState<ResellerNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/isp/resellers/hierarchy/tree");
      const data = res.data.data;
      setTree(Array.isArray(data) ? data : data?.tree || []);
    } catch {
      toast.error("Failed to load reseller hierarchy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collect = (nodes: ResellerNode[]) => {
      for (const n of nodes) {
        if (n.childResellers && n.childResellers.length > 0) {
          allIds.add(n.id);
          collect(n.childResellers);
        }
      }
    };
    collect(tree);
    setExpanded(allIds);
  };

  const collapseAll = () => setExpanded(new Set());

  // Summary counts
  const summary = useMemo(() => {
    const counts = { MASTER: 0, AREA: 0, SUB: 0, total: 0 };
    const walk = (nodes: ResellerNode[]) => {
      for (const n of nodes) {
        counts[n.level] = (counts[n.level] || 0) + 1;
        counts.total++;
        if (n.childResellers) walk(n.childResellers);
      }
    };
    walk(tree);
    return counts;
  }, [tree]);

  const TreeNode = ({ node, depth = 0 }: { node: ResellerNode; depth?: number }) => {
    const hasChildren = node.childResellers && node.childResellers.length > 0;
    const isExpanded = expanded.has(node.id);
    const customerCount = node._count?.customers ?? 0;

    return (
      <div>
        <div
          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          style={{ paddingLeft: `${12 + depth * 28}px` }}
          onClick={() => hasChildren && toggleExpand(node.id)}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              )
            ) : (
              <div className="w-3.5 shrink-0" />
            )}
            <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="font-medium text-slate-700 text-sm">{node.businessName}</span>
            <Badge className={`text-[10px] font-semibold ${LEVEL_STYLES[node.level]}`}>
              {node.level}
            </Badge>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Users className="h-3 w-3" /> {customerCount}
            </div>
            <span className="text-xs font-medium text-slate-600 min-w-[80px] text-right">
              {Number(node.balance).toLocaleString("en-US", { style: "currency", currency: "BDT" })}
            </span>
          </div>
        </div>
        {isExpanded &&
          node.childResellers?.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reseller Hierarchy</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visual tree of the 3-level reseller structure
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={fetchTree}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Link href="/resellers/create">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5 text-sm h-9">
              <Plus className="h-4 w-4" /> New Reseller
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total Resellers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{summary.MASTER}</p>
            <p className="text-xs text-slate-400 mt-0.5">Master</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.AREA}</p>
            <p className="text-xs text-slate-400 mt-0.5">Area</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{summary.SUB}</p>
            <p className="text-xs text-slate-400 mt-0.5">Sub</p>
          </CardContent>
        </Card>
      </div>

      {/* Tree */}
      <Card>
        <CardContent className="p-4">
          {!loading && tree.length > 0 && (
            <div className="flex justify-end gap-2 mb-3">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : tree.length > 0 ? (
            <div className="space-y-0.5">
              {tree.map((node) => (
                <TreeNode key={node.id} node={node} />
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-12">No resellers found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
