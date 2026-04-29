import apiClient from './client';

export interface SystemSettingsPayload {
  companyName?: string;
  primaryColorHex?: string;
  secondaryColorHex?: string;
  companyLogoUrl?: string;
  passingScore?: number;
  frontPageWelcomeText?: string;
  footerText?: string;
  dashboardBulletinMessage?: string;
  smtpServer?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  senderEmail?: string;
  maxUploadSizeMb?: number;
  allowedFileTypes?: string;
}

export const settingsApi = {
  updateSettings: async (data: SystemSettingsPayload) => {
    const response = await apiClient.put('/settings', data);
    return response.data;
  },
};
