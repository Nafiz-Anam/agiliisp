"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  startTime: string | null;
  endTime: string | null;
  estimatedResolve: string | null;
  createdAt: string;
}

const TYPE_STYLES: Record<string, string> = {
  OUTAGE: "bg-red-100 text-red-700",
  MAINTENANCE: "bg-amber-100 text-amber-700",
  INFO: "bg-blue-100 text-blue-700",
  GENERAL: "bg-slate-100 text-slate-600",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getOverallStatus(active: Announcement[]) {
  if (active.length === 0) return "operational";
  const hasOutage = active.some((a) => a.type === "OUTAGE");
  return hasOutage ? "major" : "partial";
}

export default function ServiceStatusPage() {
  const [active, setActive] = useState<Announcement[]>([]);
  const [resolved, setResolved] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/customer-portal/announcements")
      .then((res) => {
        const all: Announcement[] = res.data?.data?.announcements ?? [];
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        setActive(all.filter((a) => a.status === "ACTIVE"));
        setResolved(
          all.filter(
            (a) =>
              a.status === "RESOLVED" &&
              new Date(a.endTime || a.createdAt) >= sevenDaysAgo
          )
        );
      })
      .catch(() => {
        setActive([]);
        setResolved([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const status = getOverallStatus(active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Service Status</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Current network health and announcements
        </p>
      </div>

      {/* Overall Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {status === "operational" && (
              <>
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-emerald-700">
                    All Systems Operational
                  </p>
                  <p className="text-sm text-slate-500">
                    No active issues affecting your service
                  </p>
                </div>
              </>
            )}
            {status === "partial" && (
              <>
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-amber-700">
                    Partial Outage
                  </p>
                  <p className="text-sm text-slate-500">
                    Some services may be affected
                  </p>
                </div>
              </>
            )}
            {status === "major" && (
              <>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-red-700">
                    Major Outage
                  </p>
                  <p className="text-sm text-slate-500">
                    We are actively working to restore service
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Outages */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-700">
            Active Issues
          </h2>
          {active.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-800">{a.title}</h3>
                      <Badge
                        className={`text-[10px] ${TYPE_STYLES[a.type] || TYPE_STYLES.GENERAL}`}
                      >
                        {a.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{a.message}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      {a.startTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started: {formatDate(a.startTime)}
                        </span>
                      )}
                      {a.estimatedResolve && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Est. resolution: {formatDate(a.estimatedResolve)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recently Resolved */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-700">
            Recently Resolved
          </h2>
          {resolved.map((a) => (
            <Card key={a.id} className="opacity-75">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-700">{a.title}</h3>
                      <Badge
                        className={`text-[10px] ${TYPE_STYLES[a.type] || TYPE_STYLES.GENERAL}`}
                      >
                        {a.type}
                      </Badge>
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700">
                        RESOLVED
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{a.message}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                      {a.startTime && (
                        <span>Started: {formatDate(a.startTime)}</span>
                      )}
                      {a.endTime && (
                        <span>Resolved: {formatDate(a.endTime)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-slate-400 text-center pt-2">
        This page shows announcements relevant to your service area. Last
        checked: {new Date().toLocaleString("en-US")}
      </p>
    </div>
  );
}
