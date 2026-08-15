export const CACHE_TAGS = {
  timer: "timer",
  entries: "time-entries",
  projects: "projects",
  clients: "clients",
  reports: "reports",
} as const;

export type CacheMutation =
  | "pause"
  | "resume"
  | "start"
  | "stop"
  | "entry-write"
  | "assign-work"
  | "invoice-write"
  | "project-write"
  | "client-write"
  | "prefs";

export type CachePlan = {
  tags: string[];
  paths: string[];
};

/** Which cache tags and routes a mutation busts. Tests and actions share this. */
export function cachePlanFor(kind: CacheMutation): CachePlan {
  switch (kind) {
    case "pause":
    case "resume":
      return {
        tags: [CACHE_TAGS.timer],
        paths: ["/", "/tracker"],
      };
    case "start":
    case "stop":
      return {
        tags: [CACHE_TAGS.timer, CACHE_TAGS.entries],
        paths: ["/", "/projects", "/tracker", "/timesheet"],
      };
    case "entry-write":
      return {
        tags: [CACHE_TAGS.entries, CACHE_TAGS.projects, CACHE_TAGS.clients, CACHE_TAGS.reports],
        paths: ["/", "/projects", "/tracker", "/timesheet", "/reports"],
      };
    case "assign-work":
      return {
        tags: [CACHE_TAGS.entries, CACHE_TAGS.projects, CACHE_TAGS.clients, CACHE_TAGS.reports],
        paths: ["/", "/tracker", "/projects", "/clients", "/reports"],
      };
    case "invoice-write":
      return {
        tags: [CACHE_TAGS.clients, CACHE_TAGS.reports, CACHE_TAGS.entries],
        paths: ["/", "/clients", "/reports", "/tracker", "/projects"],
      };
    case "project-write":
      return {
        tags: [CACHE_TAGS.projects],
        paths: ["/", "/projects"],
      };
    case "client-write":
      return {
        tags: [CACHE_TAGS.clients],
        paths: ["/", "/clients"],
      };
    case "prefs":
      return {
        tags: [CACHE_TAGS.entries, CACHE_TAGS.reports],
        paths: ["/", "/timesheet", "/reports", "/tracker"],
      };
  }
}
