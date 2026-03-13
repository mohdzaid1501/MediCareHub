-- CreateTable
CREATE TABLE `medicine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `unitPrice` DOUBLE NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `medicine_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prescription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appointmentId` INTEGER NULL,
    `patientId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',

    UNIQUE INDEX `prescription_appointmentId_key`(`appointmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prescription_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prescriptionId` INTEGER NOT NULL,
    `medicineId` INTEGER NOT NULL,
    `dosage` VARCHAR(191) NOT NULL,
    `duration` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `prescription` ADD CONSTRAINT `prescription_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription_item` ADD CONSTRAINT `prescription_item_prescriptionId_fkey` FOREIGN KEY (`prescriptionId`) REFERENCES `prescription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prescription_item` ADD CONSTRAINT `prescription_item_medicineId_fkey` FOREIGN KEY (`medicineId`) REFERENCES `medicine`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
