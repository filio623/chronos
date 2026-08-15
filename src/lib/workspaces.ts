import prisma from "@/lib/prisma";

const DEFAULT_WORKSPACE_NAME = "Default Workspace";

/**
 * Single-tenant bootstrap. Name is unique; upsert is safe under concurrency.
 */
export async function getDefaultWorkspaceId() {
  const workspace = await prisma.workspace.upsert({
    where: { name: DEFAULT_WORKSPACE_NAME },
    update: {},
    create: {
      name: DEFAULT_WORKSPACE_NAME,
      ownerId: "system",
    },
  });

  return workspace.id;
}
