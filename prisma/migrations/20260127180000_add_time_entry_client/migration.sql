-- add clientId to TimeEntry and align pausedAt precision
ALTER TABLE "TimeEntry" ALTER COLUMN "pausedAt" TYPE TIMESTAMP(3);
ALTER TABLE "TimeEntry" ADD COLUMN IF NOT EXISTS "clientId" TEXT;
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL;
