"use client";

import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { exportAllTimeEntries } from "@/server/actions/export";
import { useState } from "react";

export function ExportButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await exportAllTimeEntries();
      
      if (!data || data.length === 0) {
        alert("No entries to export.");
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(","),
        ...data.map(row => headers.map(header => {
          const cell = row[header as keyof typeof row]?.toString() || "";
          return cell.includes(",") || cell.includes('"') 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell;
        }).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `time_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport} 
      disabled={loading}
      className="gap-2 text-slate-600 border-slate-200"
    >
      <DownloadIcon className="h-4 w-4" />
      {loading ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
