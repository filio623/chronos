import prisma from "@/lib/prisma";

/**
 * For the initial development phase without full Auth,
 * we use a default workspace to satisfy the DB constraints.
 */
export async function getDefaultWorkspaceId() {
  const workspace = await prisma.workspace.findFirst({
    where: { name: "Default Workspace" }
  });

  if (workspace) return workspace.id;

  // Create it if it doesn't exist
  const newWorkspace = await prisma.workspace.create({
    data: {
      name: "Default Workspace",
      ownerId: "system", // Placeholder
    }
  });

  return newWorkspace.id;
}
