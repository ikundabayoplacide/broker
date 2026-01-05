/*
  Warnings:

  - Added the required column `userId` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SaleOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PurchaseOrder` ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `SaleOrder` ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `PurchaseOrder_userId_idx` ON `PurchaseOrder`(`userId`);

-- CreateIndex
CREATE INDEX `SaleOrder_userId_idx` ON `SaleOrder`(`userId`);

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleOrder` ADD CONSTRAINT `SaleOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
