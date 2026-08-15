"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Client, TimeEntry } from "@/types";
import { displayElapsedSeconds, timeEntryToTimerLike } from "@/lib/timer-calculator";
import { liveBlockHours, retainerCrossings } from "@/lib/tracking";
import { useTimerSession } from "./TimerSessionContext";

export function RetainerWatch({
  clients,
  runningClientId,
  runningEntry,
}: {
  clients: Client[];
  runningClientId: string | null;
  runningEntry: TimeEntry | null;
}) {
  const session = useTimerSession();
  const shouldTick = session.status === "running" && !!runningEntry;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldTick) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shouldTick]);

  const liveSeconds = runningEntry
    ? displayElapsedSeconds({
        status: session.status,
        serverStatus: session.serverStatus,
        entry: timeEntryToTimerLike(runningEntry),
        frozenElapsed: session.frozenElapsed,
        resumeStartedAt: session.resumeStartedAt,
        nowMs,
      })
    : 0;
  useEffect(() => {
    if (typeof window === "undefined") return;
    for (const client of clients) {
      const block = client.activeInvoiceBlock;
      if (!block || block.hoursTarget <= 0) continue;
      const tracked = liveBlockHours({
        hoursTracked: block.hoursTracked,
        liveSeconds,
        runningBelongsToBlock: !!runningEntry && runningClientId === client.id,
      });
      const percent = (tracked / block.hoursTarget) * 100;
      const key = `chronos-retainer-${block.id}`;
      const prev = Number(window.sessionStorage.getItem(key) ?? "0");
      const hits = retainerCrossings(prev, percent);
      if (hits.includes(80)) {
        toast.warning(`${client.name} retainer crossed 80%`);
      }
      if (hits.includes(100)) {
        toast.error(`${client.name} retainer crossed 100%`);
      }
      if (percent > prev) {
        window.sessionStorage.setItem(key, String(percent));
      }
    }
  }, [clients, liveSeconds, runningClientId, runningEntry]);

  return null;
}
