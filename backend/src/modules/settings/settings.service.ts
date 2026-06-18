import { prisma } from '../../lib/prisma';

export class SettingsService {
  static async getSettings() {
    const settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      // Return defaults if not found
      return {
        companyName: 'Standard Insurance Co., Inc.',
        primaryColorHex: '#4F46E5',
        secondaryColorHex: '#10B981',
        frontPageWelcomeText: 'Welcome to the iLearn Portal',
        footerText: '© 2024 Standard Insurance Co., Inc. All Rights Reserved.',
        dashboardBulletinMessage: 'No active announcements.',
        smtpServer: 'smtp.gmail.com',
        smtpPort: 465,
        senderEmail: 'no-reply@standard-insurance.com',
        maxUploadSizeMb: 10,
        allowedFileTypes: '.pdf,.zip,.docx,.mp4'
      };
    }
    return settings;
  }

  static async updateSettings(data: Partial<{
    companyName: string;
    primaryColorHex: string;
    secondaryColorHex: string;
    companyLogoUrl: string;
    passingScore: number;
    frontPageWelcomeText: string;
    footerText: string;
    dashboardBulletinMessage: string;
    smtpServer: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    senderEmail: string;
    maxUploadSizeMb: number;
    allowedFileTypes: string;
  }>) {
    const current = await prisma.systemSettings.findFirst();
    const updateData = { ...data };

    if (!updateData.smtpPassword) {
      delete updateData.smtpPassword;
    }

    if (!current) {
      return prisma.systemSettings.create({ data: updateData as any });
    }
    return prisma.systemSettings.update({
      where: { id: current.id },
      data: updateData
    });
  }
}
