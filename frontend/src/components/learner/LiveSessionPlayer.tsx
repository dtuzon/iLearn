import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Video, Calendar as CalendarIcon, ExternalLink, Key, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { coursesApi } from '../../api/courses.api';
import { toast } from 'sonner';

interface LiveSessionPlayerProps {
  module: any;
  onComplete: () => void;
}

export const LiveSessionPlayer: React.FC<LiveSessionPlayerProps> = ({ module, onComplete }) => {
  const [passcode, setPasscode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const localTime = module.scheduledAt ? format(new Date(module.scheduledAt), 'PPPP p') : 'Not Scheduled';
  
  const handleJoin = () => {
    if (module.meetingUrl) {
      window.open(module.meetingUrl, '_blank');
    }
  };

  const handleAddToCalendar = () => {
    if (!module.scheduledAt) return;

    const startDate = new Date(module.scheduledAt);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default to 1 hour

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Elevate LMS//Live Session//EN',
      'BEGIN:VEVENT',
      `UID:${module.id}`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${module.title}`,
      `DESCRIPTION:Live Session for course. Join here: ${module.meetingUrl || 'N/A'}`,
      `LOCATION:${module.meetingUrl || 'Virtual'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${module.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVerify = async () => {
    if (!passcode.trim()) {
      toast.error('Please enter the attendance passcode.');
      return;
    }

    setIsVerifying(true);
    try {
      await coursesApi.verifyAttendance(module.id, passcode);
      toast.success('Attendance verified! Unlocking next module...');
      onComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="border-none shadow-2xl overflow-hidden bg-gradient-to-br from-background to-orange-50/30">
        <div className="h-2 bg-orange-500" />
        <CardHeader className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <Video className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black italic uppercase tracking-tight italic">{module.title}</CardTitle>
                <CardDescription className="font-bold text-orange-600 uppercase tracking-widest text-xs">Live Learning Session</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAddToCalendar} className="font-bold border-orange-200 hover:bg-orange-50">
                <CalendarIcon className="mr-2 h-4 w-4" /> Add to Calendar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Scheduled Time</p>
                <p className="font-bold text-lg">{localTime}</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Meeting Destination</p>
                <p className="font-bold truncate">{module.meetingUrl || 'TBA by Instructor'}</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleJoin} 
            disabled={!module.meetingUrl}
            className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 bg-orange-600 hover:bg-orange-700"
          >
            <ExternalLink className="mr-3 h-6 w-6" />
            Join Live Session Now
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed border-2 border-primary/20 bg-primary/5 shadow-none rounded-3xl overflow-hidden">
        <CardHeader className="p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Verification Gateway</CardTitle>
          <CardDescription>
            Enter the secret passcode announced by the instructor at the end of the session to unlock your progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0 flex flex-col md:flex-row gap-4 items-center">
          <Input 
            placeholder="ENTER PASSCODE" 
            className="h-14 text-center text-2xl font-black tracking-[0.5em] uppercase bg-background rounded-2xl border-primary/20 focus-visible:ring-primary"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            disabled={isVerifying}
          />
          <Button 
            onClick={handleVerify} 
            disabled={isVerifying}
            className="h-14 px-8 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-2xl w-full md:w-auto min-w-[200px]"
          >
            {isVerifying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
            Verify Attendance
          </Button>
        </CardContent>
        <CardFooter className="bg-primary/5 p-4 text-center">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest w-full text-center">
            Integrity Check: Attendance is monitored. Incorrect codes are logged.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
