"use client";

import React, { createContext, useContext } from "react";
import type { TimerChromeStatus, WeekStartsOn } from "@/lib/time";
import type { RoundingRule } from "@/lib/tracking";

export type StartTimerOptions = { isBillable?: boolean };

export type TimerSessionValue = {
  status: TimerChromeStatus;
  serverStatus: TimerChromeStatus;
  timerId: string | null;
  description: string;
  clientName: string | null;
  frozenElapsed: number | null;
  resumeStartedAt: number | null;
  isStarting: boolean;
  isBillable: boolean;
  weekStartsOn: WeekStartsOn;
  rounding: RoundingRule;
  requestStart: (projectId: string | null, description: string, options?: StartTimerOptions) => Promise<boolean>;
  openManualEntry: () => void;
};

const defaultSession: TimerSessionValue = {
  status: "stopped",
  serverStatus: "stopped",
  timerId: null,
  description: "",
  clientName: null,
  frozenElapsed: null,
  resumeStartedAt: null,
  isStarting: false,
  isBillable: true,
  weekStartsOn: 0,
  rounding: { incrementMinutes: 0, mode: "none" },
  requestStart: async () => false,
  openManualEntry: () => {},
};

const TimerSessionContext = createContext<TimerSessionValue>(defaultSession);

export function TimerSessionProvider({
  value,
  children,
}: {
  value: TimerSessionValue;
  children: React.ReactNode;
}) {
  return (
    <TimerSessionContext.Provider value={value}>
      {children}
    </TimerSessionContext.Provider>
  );
}

export function useTimerSession(): TimerSessionValue {
  return useContext(TimerSessionContext);
}
