"use server";

import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

export async function exportAllTimeEntries() {
  noStore();
  
  const entries = await prisma.timeEntry.findMany({
    orderBy: { startTime: "desc" },
    include: {
      project: {
        include: {
          client: true,
        },
      },
      tags: true,
    },
  });

  const csvRows = entries.map((entry) => {
    const duration = entry.duration || 
      (entry.endTime ? Math.floor((entry.endTime.getTime() - entry.startTime.getTime()) / 1000) : 0);
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    const formattedDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    return {
      Date: entry.startTime.toISOString().split("T")[0],
      Description: entry.description,
      Project: entry.project?.name || "No Project",
      Client: entry.project?.client?.name || "No Client",
      Start: entry.startTime.toISOString(),
      End: entry.endTime?.toISOString() || "Running",
      DurationSeconds: duration,
      DurationFormatted: formattedDuration,
      Billable: entry.isBillable ? "Yes" : "No",
      Tags: entry.tags.map(t => t.name).join(", "),
    };
  });

  return csvRows;
}
