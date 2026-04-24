import type { Project, Client } from "@/types";
import { resolveDefaultBillableRule } from "./rule";

export function resolveDefaultBillableClient(args: {
  projectId?: string | null;
  clientId?: string | null;
  projects: ReadonlyArray<Pick<Project, "id" | "clientId" | "defaultBillable">>;
  clients: ReadonlyArray<Pick<Client, "id" | "defaultBillable">>;
}): boolean {
  if (args.projectId && args.projectId !== "none") {
    const project = args.projects.find((p) => p.id === args.projectId);
    if (project) {
      const projectClient = args.clients.find((c) => c.id === project.clientId);
      return resolveDefaultBillableRule({
        projectDefault: project.defaultBillable,
        clientDefault: projectClient?.defaultBillable,
      });
    }
  }

  if (args.clientId) {
    const client = args.clients.find((c) => c.id === args.clientId);
    return resolveDefaultBillableRule({
      clientDefault: client?.defaultBillable,
    });
  }

  return resolveDefaultBillableRule({});
}
