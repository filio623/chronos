-- DropForeignKey
ALTER TABLE "TimeEntry" DROP CONSTRAINT "TimeEntry_clientId_fkey";

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "defaultBillable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "defaultBillable" BOOLEAN;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
