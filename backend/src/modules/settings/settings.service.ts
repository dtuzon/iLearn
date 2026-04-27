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
  }>) {
    const current = await prisma.systemSettings.findFirst();
    if (!current) {
      return prisma.systemSettings.create({ data: data as any });
    }
    return prisma.systemSettings.update({
      where: { id: current.id },
      data
    });
  }
}
