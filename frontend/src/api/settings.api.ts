import apiClient from './client';

export interface SystemSettingsPayload {
  companyName: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  companyLogoUrl?: string;
  passingScore?: number;
}

export const settingsApi = {
  updateSettings: async (data: SystemSettingsPayload) => {
    const response = await apiClient.put('/settings', data);
    return response.data;
  },
};
