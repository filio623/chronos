-- Expand invoice block statuses for manual invoicing workflow
DO $$
BEGIN
  ALTER TYPE "InvoiceBlockStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE "InvoiceBlockStatus" ADD VALUE IF NOT EXISTS 'PAID';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Track explicit time-entry assignment to invoice blocks
ALTER TABLE "TimeEntry" ADD COLUMN IF NOT EXISTS "invoiceBlockId" TEXT;

-- Track project-level live links to invoice blocks
CREATE TABLE IF NOT EXISTS "InvoiceBlockProject" (
  "id" TEXT NOT NULL,
  "invoiceBlockId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvoiceBlockProject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TimeEntry_invoiceBlockId_idx" ON "TimeEntry"("invoiceBlockId");
CREATE INDEX IF NOT EXISTS "InvoiceBlockProject_projectId_idx" ON "InvoiceBlockProject"("projectId");
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceBlockProject_invoiceBlockId_projectId_key" ON "InvoiceBlockProject"("invoiceBlockId", "projectId");

ALTER TABLE "TimeEntry"
  ADD CONSTRAINT "TimeEntry_invoiceBlockId_fkey"
  FOREIGN KEY ("invoiceBlockId") REFERENCES "InvoiceBlock"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceBlockProject"
  ADD CONSTRAINT "InvoiceBlockProject_invoiceBlockId_fkey"
  FOREIGN KEY ("invoiceBlockId") REFERENCES "InvoiceBlock"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceBlockProject"
  ADD CONSTRAINT "InvoiceBlockProject_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill block assignment from prior date-range logic (client-attached entries)
UPDATE "TimeEntry" te
SET "invoiceBlockId" = ib."id"
FROM "InvoiceBlock" ib
WHERE te."invoiceBlockId" IS NULL
  AND te."endTime" IS NOT NULL
  AND te."clientId" = ib."clientId"
  AND te."startTime" >= ib."startDate"
  AND (ib."endDate" IS NULL OR te."startTime" <= ib."endDate")
  AND ib."startDate" = (
    SELECT MAX(ib2."startDate")
    FROM "InvoiceBlock" ib2
    WHERE ib2."clientId" = te."clientId"
      AND te."startTime" >= ib2."startDate"
      AND (ib2."endDate" IS NULL OR te."startTime" <= ib2."endDate")
  );

-- Backfill block assignment from prior date-range logic (project-attached entries)
UPDATE "TimeEntry" te
SET "invoiceBlockId" = ib."id"
FROM "Project" p
JOIN "InvoiceBlock" ib ON ib."clientId" = p."clientId"
WHERE te."invoiceBlockId" IS NULL
  AND te."endTime" IS NOT NULL
  AND te."projectId" = p."id"
  AND te."startTime" >= ib."startDate"
  AND (ib."endDate" IS NULL OR te."startTime" <= ib."endDate")
  AND ib."startDate" = (
    SELECT MAX(ib2."startDate")
    FROM "InvoiceBlock" ib2
    WHERE ib2."clientId" = p."clientId"
      AND te."startTime" >= ib2."startDate"
      AND (ib2."endDate" IS NULL OR te."startTime" <= ib2."endDate")
  );
