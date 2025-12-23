-- CreateTable
CREATE TABLE `CompanyPaymentMethod` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `type` ENUM('MOBILE_MONEY', 'BANK_ACCOUNT', 'CREDIT_CARD') NOT NULL,
    `provider` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyPaymentMethod_companyId_idx`(`companyId`),
    INDEX `CompanyPaymentMethod_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyPortfolio` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `targetCompanyId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `averageBuyPrice` DECIMAL(18, 2) NOT NULL,
    `totalInvested` DECIMAL(18, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyPortfolio_companyId_idx`(`companyId`),
    INDEX `CompanyPortfolio_targetCompanyId_idx`(`targetCompanyId`),
    UNIQUE INDEX `CompanyPortfolio_companyId_targetCompanyId_key`(`companyId`, `targetCompanyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyTrade` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `targetCompanyId` VARCHAR(191) NOT NULL,
    `type` ENUM('BUY', 'SELL') NOT NULL,
    `status` ENUM('PENDING', 'EXECUTED', 'PARTIALLY_EXECUTED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `priceType` ENUM('MARKET', 'LIMIT') NOT NULL DEFAULT 'MARKET',
    `quantity` INTEGER NOT NULL,
    `requestedPrice` DECIMAL(18, 2) NULL,
    `executedPrice` DECIMAL(18, 2) NULL,
    `executedQuantity` INTEGER NULL,
    `totalAmount` DECIMAL(18, 2) NOT NULL,
    `fees` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `transactionId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `executedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyTrade_companyId_idx`(`companyId`),
    INDEX `CompanyTrade_createdAt_idx`(`createdAt`),
    INDEX `CompanyTrade_status_idx`(`status`),
    INDEX `CompanyTrade_targetCompanyId_idx`(`targetCompanyId`),
    INDEX `CompanyTrade_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CompanyPaymentMethod` ADD CONSTRAINT `CompanyPaymentMethod_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyPortfolio` ADD CONSTRAINT `CompanyPortfolio_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyPortfolio` ADD CONSTRAINT `CompanyPortfolio_targetCompanyId_fkey` FOREIGN KEY (`targetCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyTrade` ADD CONSTRAINT `CompanyTrade_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyTrade` ADD CONSTRAINT `CompanyTrade_targetCompanyId_fkey` FOREIGN KEY (`targetCompanyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
