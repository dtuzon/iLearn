import apiClient from './client';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'LIVE_SESSION' | 'COURSE_DEADLINE' | 'BATCH_SCHEDULE' | 'COURSE_SCHEDULE';
  start: string;
  end: string;
  extendedProps?: {
    joinUrl?: string;
    meetingId?: string;
    passcode?: string;
    batchName?: string;
    courseTitle?: string;
    lpTitle?: string;
    learnerName?: string;
    targetTitle?: string;
  };
}

export const calendarApi = {
  getEvents: async () => {
    const response = await apiClient.get('/calendar');
    return response.data as CalendarEvent[];
  }
};
