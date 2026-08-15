import { describe, expect, it } from "vitest";
import { resolveDefaultBillableClient } from "./resolve-client";
import { resolveDefaultBillableRule } from "./rule";
import { resolveDefaultBillableServer } from "@/server/billable/resolve";

describe("resolveDefaultBillableRule", () => {
  it("prefers project over client over true", () => {
    expect(resolveDefaultBillableRule({ projectDefault: false, clientDefault: true })).toBe(false);
    expect(resolveDefaultBillableRule({ projectDefault: null, clientDefault: false })).toBe(false);
    expect(resolveDefaultBillableRule({})).toBe(true);
  });
});

describe("resolveDefaultBillableClient", () => {
  const projects = [
    { id: "p1", clientId: "c1", defaultBillable: false as boolean | null },
    { id: "p2", clientId: "c1", defaultBillable: null },
  ];
  const clients = [{ id: "c1", defaultBillable: false }];

  it("uses the project default when set", () => {
    expect(resolveDefaultBillableClient({ projectId: "p1", projects, clients })).toBe(false);
  });

  it("falls back to the client default", () => {
    expect(resolveDefaultBillableClient({ projectId: "p2", projects, clients })).toBe(false);
    expect(resolveDefaultBillableClient({ clientId: "c1", projects, clients })).toBe(false);
  });
});

describe("resolveDefaultBillableServer", () => {
  it("loads project then client defaults through the shipped resolver", async () => {
    const db = {
      project: {
        findUnique: async () => ({
          defaultBillable: null,
          client: { defaultBillable: false },
        }),
      },
      client: {
        findUnique: async () => ({ defaultBillable: true }),
      },
    };

    await expect(
      resolveDefaultBillableServer(db as never, { projectId: "p1" }),
    ).resolves.toBe(false);
    await expect(
      resolveDefaultBillableServer(db as never, { clientId: "c1" }),
    ).resolves.toBe(true);
    await expect(
      resolveDefaultBillableServer(db as never, {}),
    ).resolves.toBe(true);
  });
});
