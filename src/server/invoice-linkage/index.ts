import { resolveEntryLinkage, type LinkageInput, type LinkageResult } from "./resolver";
import { createPrismaLinkagePort, type PrismaLike } from "./prisma-adapter";

export { resolveEntryLinkage } from "./resolver";
export type { LinkageInput, LinkageResult, LinkageReason } from "./resolver";
export type { LinkagePort, ActiveBlockRef } from "./port";
export { createPrismaLinkagePort } from "./prisma-adapter";
export type { PrismaLike } from "./prisma-adapter";

/** Default wiring for server actions. Tests import resolveEntryLinkage directly with an in-memory port. */
export async function resolveEntryLinkageWithPrisma(
  db: PrismaLike,
  input: LinkageInput,
): Promise<LinkageResult> {
  return resolveEntryLinkage(input, createPrismaLinkagePort(db));
}
