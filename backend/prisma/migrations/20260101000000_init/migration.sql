-- CreateTable
CREATE TABLE `sensors` (
    `location_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sensor_name` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'A',
    `direction_1` VARCHAR(100) NULL,
    `direction_2` VARCHAR(100) NULL,
    `installed_at` DATETIME(3) NULL,

    PRIMARY KEY (`location_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `realtime_counts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sensor_id` INTEGER NOT NULL,
    `sensing_time` DATETIME(3) NOT NULL,
    `total_count` INTEGER NOT NULL,
    `direction_1_count` INTEGER NOT NULL DEFAULT 0,
    `direction_2_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `realtime_counts_sensor_id_sensing_time_idx`(`sensor_id`, `sensing_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedestrian_counts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sensor_id` INTEGER NOT NULL,
    `count_date` DATE NOT NULL,
    `hour_of_day` INTEGER NOT NULL,
    `pedestrian_count` INTEGER NOT NULL,

    INDEX `pedestrian_counts_sensor_id_hour_of_day_idx`(`sensor_id`, `hour_of_day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiet_spaces` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `feature_name` VARCHAR(191) NOT NULL,
    `theme` VARCHAR(100) NOT NULL,
    `sub_theme` VARCHAR(100) NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `address` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `realtime_counts` ADD CONSTRAINT `realtime_counts_sensor_id_fkey` FOREIGN KEY (`sensor_id`) REFERENCES `sensors`(`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedestrian_counts` ADD CONSTRAINT `pedestrian_counts_sensor_id_fkey` FOREIGN KEY (`sensor_id`) REFERENCES `sensors`(`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

