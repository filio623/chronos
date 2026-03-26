import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
      <div className="p-4 rounded-full bg-slate-100">
        <FileQuestion className="w-8 h-8 text-slate-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Page not found</h2>
        <p className="text-sm text-slate-500 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
