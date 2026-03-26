"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
      <div className="p-4 rounded-full bg-rose-50">
        <AlertCircle className="w-8 h-8 text-rose-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
        <p className="text-sm text-slate-500 max-w-md">
          An unexpected error occurred while loading this page. Please try again.
        </p>
      </div>
      <Button
        onClick={reset}
        variant="outline"
        className="gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </Button>
    </div>
  );
}
