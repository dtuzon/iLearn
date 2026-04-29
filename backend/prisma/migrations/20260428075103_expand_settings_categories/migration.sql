-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "allowedFileTypes" TEXT DEFAULT '.pdf,.zip,.docx,.mp4',
ADD COLUMN     "dashboardBulletinMessage" TEXT DEFAULT 'No active announcements.',
ADD COLUMN     "maxUploadSizeMb" INTEGER DEFAULT 10,
ADD COLUMN     "senderEmail" TEXT DEFAULT 'no-reply@example.com',
ADD COLUMN     "smtpPassword" TEXT,
ADD COLUMN     "smtpPort" INTEGER DEFAULT 587,
ADD COLUMN     "smtpServer" TEXT DEFAULT 'smtp.example.com',
ADD COLUMN     "smtpUser" TEXT;
