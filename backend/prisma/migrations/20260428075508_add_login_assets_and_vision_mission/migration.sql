-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "loginBackgroundUrl" TEXT,
ADD COLUMN     "missionText" TEXT DEFAULT 'To provide excellent service and innovative products that meet the needs of our clients.',
ADD COLUMN     "missionTitle" TEXT DEFAULT 'OUR MISSION',
ADD COLUMN     "visionText" TEXT DEFAULT 'To be the most preferred and trusted insurance company in the country.',
ADD COLUMN     "visionTitle" TEXT DEFAULT 'OUR VISION';
