-- AlterTable
ALTER TABLE "system_settings" ALTER COLUMN "primaryColorHex" SET DEFAULT '#e8aa33';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "resetPasswordExpires" TIMESTAMP(3),
ADD COLUMN "resetPasswordToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_resetPasswordToken_key" ON "users"("resetPasswordToken");
