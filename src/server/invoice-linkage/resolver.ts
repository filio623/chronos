import type { LinkagePort } from "./port";

export interface LinkageInput {
  projectId: string | null;
  fallbackClientId?: string | null;
}

export type LinkageReason =
  | "project-scoped-block"
  | "client-level-block"
  | "client-block-is-project-scoped"
  | "no-active-block"
  | "no-client";

export interface LinkageResult {
  clientId: string | null;
  invoiceBlockId: string | null;
  reason: LinkageReason;
}

export async function resolveEntryLinkage(
  input: LinkageInput,
  port: LinkagePort,
): Promise<LinkageResult> {
  let clientId = input.fallbackClientId ?? null;

  if (input.projectId) {
    const projectClient = await port.getProjectClientId(input.projectId);
    if (projectClient) clientId = projectClient;

    const block = await port.findActiveBlockForProject(input.projectId);
    if (block) {
      return { clientId, invoiceBlockId: block.id, reason: "project-scoped-block" };
    }
  }

  if (!clientId) {
    return { clientId: null, invoiceBlockId: null, reason: "no-client" };
  }

  const latest = await port.findLatestActiveClientBlock(clientId);
  if (!latest) {
    return { clientId, invoiceBlockId: null, reason: "no-active-block" };
  }
  if (latest.projectAssignmentCount > 0) {
    return { clientId, invoiceBlockId: null, reason: "client-block-is-project-scoped" };
  }
  return { clientId, invoiceBlockId: latest.id, reason: "client-level-block" };
}
