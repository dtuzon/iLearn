import apiClient from './client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchLiveSession {
  id: string;
  batchId: string;
  courseModuleId: string;
  zoomMeetingId: string;
  zoomPasscode: string;
  joinUrl: string | null;
  scheduledAt: string | null;
  topic: string;
}

export interface ZoomSignatureResponse {
  signature: string;
  sdkKey: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Methods
// ─────────────────────────────────────────────────────────────────────────────

export const zoomApi = {
  /**
   * Fetches the SDK JWT signature from the backend.
   * @param meetingNumber - The Zoom meeting number (numeric string)
   * @param role - 0 = attendee, 1 = host
   */
  getSignature: async (meetingNumber: string, role: 0 | 1): Promise<ZoomSignatureResponse> => {
    const response = await apiClient.post('/zoom/signature', { meetingNumber, role });
    return response.data as ZoomSignatureResponse;
  },

  /**
   * Retrieves the Zoom session credentials (joinUrl, passcode, meetingId)
   * for a specific batch + module combination.
   */
  getLiveSession: async (batchId: string, moduleId: string): Promise<BatchLiveSession> => {
    const response = await apiClient.get(`/zoom/session/${batchId}/${moduleId}`);
    return response.data as BatchLiveSession;
  },
};
