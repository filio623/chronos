-- Merge duplicate workspace names into the earliest row, then enforce uniqueness.

WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt" ASC, id ASC) AS rn
  FROM "Workspace"
),
dupes AS (
  SELECT r.id AS dupe_id, k.id AS keeper_id
  FROM ranked r
  JOIN ranked k ON k.name = r.name AND k.rn = 1
  WHERE r.rn > 1
)
UPDATE "Client" AS c
SET "workspaceId" = d.keeper_id
FROM dupes d
WHERE c."workspaceId" = d.dupe_id;

WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt" ASC, id ASC) AS rn
  FROM "Workspace"
),
dupes AS (
  SELECT r.id AS dupe_id, k.id AS keeper_id
  FROM ranked r
  JOIN ranked k ON k.name = r.name AND k.rn = 1
  WHERE r.rn > 1
)
UPDATE "Project" AS p
SET "workspaceId" = d.keeper_id
FROM dupes d
WHERE p."workspaceId" = d.dupe_id;

WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt" ASC, id ASC) AS rn
  FROM "Workspace"
),
dupes AS (
  SELECT r.id AS dupe_id, k.id AS keeper_id
  FROM ranked r
  JOIN ranked k ON k.name = r.name AND k.rn = 1
  WHERE r.rn > 1
)
UPDATE "Tag" AS t
SET "workspaceId" = d.keeper_id
FROM dupes d
WHERE t."workspaceId" = d.dupe_id;

DELETE FROM "Workspace" AS w
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt" ASC, id ASC) AS rn
    FROM "Workspace"
  ) ranked
  WHERE ranked.rn > 1
) d
WHERE w.id = d.id;

CREATE UNIQUE INDEX "Workspace_name_key" ON "Workspace"("name");
