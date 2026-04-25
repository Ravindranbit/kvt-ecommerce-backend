-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "price" DOUBLE PRECISION;

-- BackfillPriceFromProduct
UPDATE "CartItem" ci
SET "price" = p."price"
FROM "Product" p
WHERE ci."productId" = p."id";

-- FallbackForMissingProduct
UPDATE "CartItem"
SET "price" = 0
WHERE "price" IS NULL;

-- EnforceNotNull
ALTER TABLE "CartItem" ALTER COLUMN "price" SET NOT NULL;
