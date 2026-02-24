-- Convert legacy completed blocks to submitted after enum values exist
UPDATE "InvoiceBlock"
SET "status" = 'SUBMITTED'
WHERE "status" = 'COMPLETED';
