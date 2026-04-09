"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuthStore } from "@/store/auth-store";

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user?.role === "CUSTOMER") {
      router.push("/portal");
    }
  }, [user, router]);

  if (user?.role === "CUSTOMER") return null;

  return <AppLayout>{children}</AppLayout>;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ProtectedContent>{children}</ProtectedContent>
    </AuthGuard>
  );
}
