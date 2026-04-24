import type { PrismaClient } from "@prisma/client";
import { resolveDefaultBillableRule } from "@/lib/billable/rule";

export async function resolveDefaultBillableServer(
  db: PrismaClient,
  args: { projectId?: string | null; clientId?: string | null },
): Promise<boolean> {
  if (args.projectId) {
    const project = await db.project.findUnique({
      where: { id: args.projectId },
      select: {
        defaultBillable: true,
        client: { select: { defaultBillable: true } },
      },
    });
    return resolveDefaultBillableRule({
      projectDefault: project?.defaultBillable,
      clientDefault: project?.client?.defaultBillable,
    });
  }

  if (args.clientId) {
    const client = await db.client.findUnique({
      where: { id: args.clientId },
      select: { defaultBillable: true },
    });
    return resolveDefaultBillableRule({
      clientDefault: client?.defaultBillable,
    });
  }

  return resolveDefaultBillableRule({});
}
