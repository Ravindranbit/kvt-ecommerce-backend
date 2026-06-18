-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUYER', 'SELLER');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "showInFilters" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showInHeader" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'BUYER',
ADD COLUMN     "storeDescription" TEXT,
ADD COLUMN     "storeName" TEXT;

-- CreateIndex
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
