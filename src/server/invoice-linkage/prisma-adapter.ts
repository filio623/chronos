import type { PrismaClient, Prisma } from "@prisma/client";
import { InvoiceBlockStatus } from "@prisma/client";
import type { LinkagePort, ActiveBlockRef } from "./port";

export type PrismaLike = PrismaClient | Prisma.TransactionClient;

export function createPrismaLinkagePort(db: PrismaLike): LinkagePort {
  return {
    async getProjectClientId(projectId) {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { clientId: true },
      });
      return project?.clientId ?? null;
    },

    async findActiveBlockForProject(projectId): Promise<ActiveBlockRef | null> {
      const linked = await db.invoiceBlockProject.findFirst({
        where: {
          projectId,
          invoiceBlock: {
            status: InvoiceBlockStatus.ACTIVE,
          },
        },
        select: {
          invoiceBlock: {
            select: {
              id: true,
              clientId: true,
              _count: { select: { projectAssignments: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!linked?.invoiceBlock) return null;
      return {
        id: linked.invoiceBlock.id,
        clientId: linked.invoiceBlock.clientId,
        projectAssignmentCount: linked.invoiceBlock._count.projectAssignments,
      };
    },

    async findLatestActiveClientBlock(clientId): Promise<ActiveBlockRef | null> {
      const block = await db.invoiceBlock.findFirst({
        where: {
          clientId,
          status: InvoiceBlockStatus.ACTIVE,
        },
        select: {
          id: true,
          clientId: true,
          _count: { select: { projectAssignments: true } },
        },
        orderBy: { startDate: "desc" },
      });

      if (!block) return null;
      return {
        id: block.id,
        clientId: block.clientId,
        projectAssignmentCount: block._count.projectAssignments,
      };
    },
  };
}
