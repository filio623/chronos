-- Phase 3: at most one running timer; at most one ACTIVE invoice block per client.

-- Keep the newest running row; finalize any extras so the unique index can apply.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "startTime" DESC, id DESC) AS rn
  FROM "TimeEntry"
  WHERE "endTime" IS NULL
)
UPDATE "TimeEntry" AS t
SET
  "endTime" = NOW(),
  duration = GREATEST(
    0,
    EXTRACT(EPOCH FROM (NOW() - t."startTime"))::int - t."pausedSeconds"
  ),
  "pausedAt" = NULL
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX "TimeEntry_one_running_key"
ON "TimeEntry" ((1))
WHERE "endTime" IS NULL;

-- Keep the newest ACTIVE block per client; complete extras.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "clientId"
      ORDER BY "startDate" DESC, "createdAt" DESC, id DESC
    ) AS rn
  FROM "InvoiceBlock"
  WHERE status = 'ACTIVE'
)
UPDATE "InvoiceBlock" AS b
SET
  status = 'COMPLETED',
  "endDate" = COALESCE(b."endDate", NOW())
FROM ranked r
WHERE b.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX "InvoiceBlock_one_active_per_client_key"
ON "InvoiceBlock" ("clientId")
WHERE status = 'ACTIVE';
