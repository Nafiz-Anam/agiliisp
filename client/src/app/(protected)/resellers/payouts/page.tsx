"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface Payout {
  id: string;
  reseller: {
    id: string;
    businessName: string;
    level: string;
  };
  amount: number;
  method: "BANK_TRANSFER" | "BKASH" | "NAGAD" | "CASH";
  status: "PENDING" | "COMPLETED" | "REJECTED";
  referenceNumber?: string;
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const LEVEL_STYLES: Record<string, string> = {
  MASTER: "bg-purple-100 text-purple-700",
  AREA: "bg-blue-100 text-blue-700",
  SUB: "bg-emerald-100 text-emerald-700",
};

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  BKASH: "bKash",
  NAGAD: "Nagad",
  CASH: "Cash",
};

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  // Approve dialog
  const [approveTarget, setApproveTarget] = useState<Payout | null>(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [approving, setApproving] = useState(false);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<Payout | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await api.get(`/isp/payouts?${params}`);
      setPayouts(res.data.data.payouts || res.data.data || []);
    } catch {
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    try {
      await api.patch(`/isp/payouts/${approveTarget.id}/approve`, {
        ...(referenceNumber && { referenceNumber }),
      });
      toast.success("Payout approved");
      setApproveTarget(null);
      setReferenceNumber("");
      fetchPayouts();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || "Failed to approve payout");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setRejecting(true);
    try {
      await api.patch(`/isp/payouts/${rejectTarget.id}/reject`, {
        reason: rejectionReason,
      });
      toast.success("Payout rejected");
      setRejectTarget(null);
      setRejectionReason("");
      fetchPayouts();
    } catch (e: any) {
      toast.error(e.response?.data?.error?.message || "Failed to reject payout");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payout Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review and process reseller payout requests
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={fetchPayouts}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <Card className="border-slate-200/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Reseller
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Level
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Method
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Requested
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Processed
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      No payouts found
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-700">
                          {p.reseller.businessName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          className={`text-[10px] font-semibold ${LEVEL_STYLES[p.reseller.level] || "bg-slate-100 text-slate-600"}`}
                        >
                          {p.reseller.level}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                        {Number(p.amount).toLocaleString("en-US", {
                          style: "currency",
                          currency: "BDT",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-[13px]">
                        {METHOD_LABELS[p.method] || p.method}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          className={`text-[10px] font-bold ${STATUS_STYLES[p.status] || "bg-slate-100 text-slate-600"}`}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[12px]">
                        {format(new Date(p.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-[12px]">
                        {p.processedAt
                          ? format(new Date(p.processedAt), "MMM d, yyyy")
                          : "--"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {p.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setApproveTarget(p)}
                            >
                              <Check className="h-3 w-3" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50"
                              onClick={() => setRejectTarget(p)}
                            >
                              <X className="h-3 w-3" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">--</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Approve Payout</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-slate-600">
              Approve payout of{" "}
              <span className="font-semibold">
                {approveTarget &&
                  Number(approveTarget.amount).toLocaleString("en-US", {
                    style: "currency",
                    currency: "BDT",
                  })}
              </span>{" "}
              to{" "}
              <span className="font-semibold">{approveTarget?.reseller.businessName}</span> via{" "}
              {approveTarget && (METHOD_LABELS[approveTarget.method] || approveTarget.method)}?
            </p>
            <div className="space-y-1.5">
              <Label>Reference Number (optional)</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction or reference ID"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {approving ? "Approving..." : "Approve Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Reject Payout</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-slate-600">
              Reject payout of{" "}
              <span className="font-semibold">
                {rejectTarget &&
                  Number(rejectTarget.amount).toLocaleString("en-US", {
                    style: "currency",
                    currency: "BDT",
                  })}
              </span>{" "}
              from{" "}
              <span className="font-semibold">{rejectTarget?.reseller.businessName}</span>?
            </p>
            <div className="space-y-1.5">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide the reason for rejecting this payout"
                rows={3}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejecting || !rejectionReason.trim()}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {rejecting ? "Rejecting..." : "Reject Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
