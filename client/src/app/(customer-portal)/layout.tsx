"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useAuthStore } from "@/store/auth-store";
import { CustomerSidebar } from "@/components/layout/customer-sidebar";
import { Header } from "@/components/layout/header";

function CustomerPortalContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== "CUSTOMER") {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "CUSTOMER") return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      <CustomerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <CustomerPortalContent>{children}</CustomerPortalContent>
    </AuthGuard>
  );
}
