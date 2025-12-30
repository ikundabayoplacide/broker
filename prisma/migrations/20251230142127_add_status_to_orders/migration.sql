-- DropForeignKey
ALTER TABLE `Branch` DROP FOREIGN KEY `Branch_managerId_fkey`;

-- DropForeignKey
ALTER TABLE `Trade` DROP FOREIGN KEY `Trade_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_createdById_fkey`;

-- AlterTable
ALTER TABLE `PurchaseOrder` ADD COLUMN `status` ENUM('PENDING', 'EXECUTED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `SaleOrder` ADD COLUMN `status` ENUM('PENDING', 'EXECUTED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
