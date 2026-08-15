import { describe, expect, it } from "vitest";
import type { LinkagePort } from "./port";
import { resolveEntryLinkage } from "./resolver";

function port(partial: Partial<LinkagePort>): LinkagePort {
  return {
    getProjectClientId: async () => null,
    findActiveBlockForProject: async () => null,
    findLatestActiveClientBlock: async () => null,
    ...partial,
  };
}

describe("resolveEntryLinkage", () => {
  it("uses a project-scoped active block first", async () => {
    const result = await resolveEntryLinkage(
      { projectId: "p1", fallbackClientId: "other" },
      port({
        getProjectClientId: async () => "c1",
        findActiveBlockForProject: async () => ({
          id: "b-project",
          clientId: "c1",
          projectAssignmentCount: 1,
        }),
      }),
    );
    expect(result).toEqual({
      clientId: "c1",
      invoiceBlockId: "b-project",
      reason: "project-scoped-block",
    });
  });

  it("falls back to a client-level block when the project has no live link", async () => {
    const result = await resolveEntryLinkage(
      { projectId: "p1" },
      port({
        getProjectClientId: async () => "c1",
        findLatestActiveClientBlock: async () => ({
          id: "b-client",
          clientId: "c1",
          projectAssignmentCount: 0,
        }),
      }),
    );
    expect(result).toEqual({
      clientId: "c1",
      invoiceBlockId: "b-client",
      reason: "client-level-block",
    });
  });

  it("does not attach to a project-scoped client block without a project link", async () => {
    const result = await resolveEntryLinkage(
      { projectId: null, fallbackClientId: "c1" },
      port({
        findLatestActiveClientBlock: async () => ({
          id: "b-scoped",
          clientId: "c1",
          projectAssignmentCount: 2,
        }),
      }),
    );
    expect(result).toEqual({
      clientId: "c1",
      invoiceBlockId: null,
      reason: "client-block-is-project-scoped",
    });
  });

  it("returns no-client when nothing resolves a client", async () => {
    const result = await resolveEntryLinkage({ projectId: null }, port({}));
    expect(result).toEqual({
      clientId: null,
      invoiceBlockId: null,
      reason: "no-client",
    });
  });
});
