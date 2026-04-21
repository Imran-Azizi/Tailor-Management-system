-- Normalize existing NOT_LOAN data before narrowing enum values.
UPDATE "Transaction"
SET "kind" = 'LOAN'
WHERE "kind" = 'NOT_LOAN';

ALTER TABLE "Transaction" ALTER COLUMN "kind" DROP DEFAULT;

CREATE TYPE "TransactionKind_new" AS ENUM ('LOAN');

ALTER TABLE "Transaction"
ALTER COLUMN "kind" TYPE "TransactionKind_new"
USING ("kind"::text::"TransactionKind_new");

DROP TYPE "TransactionKind";
ALTER TYPE "TransactionKind_new" RENAME TO "TransactionKind";

ALTER TABLE "Transaction"
ALTER COLUMN "kind" SET DEFAULT 'LOAN';
