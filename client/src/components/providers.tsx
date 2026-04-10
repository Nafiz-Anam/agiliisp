"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSocket } from "@/hooks/use-socket";

function SocketInitializer() {
  useSocket();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <TooltipProvider>
      <ConfirmProvider>
        <SocketInitializer />
        {children}
        <Toaster position="top-right" richColors />
      </ConfirmProvider>
    </TooltipProvider>
  );
}
