import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Video, Calendar as CalendarIcon, ExternalLink, Key, CheckCircle, Loader2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { coursesApi } from '../../api/courses.api';
import { zoomApi } from '../../api/zoom.api';
import type { BatchLiveSession } from '../../api/zoom.api';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';

interface LiveSessionPlayerProps {
  module: any;
  onComplete: () => void;
  batchId?: string | null;
}

export const LiveSessionPlayer: React.FC<LiveSessionPlayerProps> = ({ 
  module, 
  onComplete, 
  batchId 
}) => {
  const [passcode, setPasscode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [session, setSession] = useState<BatchLiveSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Fetch session details on mount if batchId is provided
  useEffect(() => {
    const fetchSession = async () => {
      if (!batchId) return;
      setIsLoadingSession(true);
      try {
        const liveSession = await zoomApi.getLiveSession(batchId, module.id);
        setSession(liveSession);
      } catch {
        // Live session details unavailable — UI will show fallback
      } finally {
        setIsLoadingSession(false);
      }
    };
    fetchSession();
  }, [batchId, module.id]);

  // Use the accurate scheduled time from the batch session, falling back to course module scheduled date
  const scheduledTimeRaw = session?.scheduledAt || module.scheduledAt;
  const localTime = scheduledTimeRaw ? format(new Date(scheduledTimeRaw), 'PPPP p') : 'Not Scheduled';
  const joinUrl = session?.joinUrl || module.meetingUrl;

  const handleLaunch = () => {
    if (joinUrl) {
      window.open(joinUrl, '_blank', 'noopener,noreferrer');
      toast.success('Opening Zoom Live Session in a new tab...');
    } else {
      toast.error('The Zoom session link is not available yet. Please contact your administrator.');
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleAddToCalendar = () => {
    if (!scheduledTimeRaw) return;
    const startDate = new Date(scheduledTimeRaw);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//iLearn LMS//Live Session//EN',
      'BEGIN:VEVENT',
      `UID:${module.id}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(startDate)}`,
      `DTEND:${fmt(endDate)}`,
      `SUMMARY:${module.title}`,
      `DESCRIPTION:Live Learning Session. Join here: ${joinUrl || 'N/A'}`,
      `LOCATION:${joinUrl || 'Virtual'}`,
      'END:VEVENT', 'END:VCALENDAR'
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

  const handleAddToGoogleCalendar = () => {
    if (!scheduledTimeRaw) return;
    const startDate = new Date(scheduledTimeRaw);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const fmtGoogle = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const datesParam = `${fmtGoogle(startDate)}/${fmtGoogle(endDate)}`;
    
    const title = encodeURIComponent(module.title);
    const details = encodeURIComponent(`Live Learning webcast session. Join link: ${joinUrl || 'TBA'}`);
    const location = encodeURIComponent(joinUrl || 'Virtual');
    
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
    
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
    toast.success('Redirecting to Google Calendar...');
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      {/* ── Main Session details card ─────────────────────────── */}
      <Card className="border-none shadow-2xl overflow-hidden bg-card">
        <div className="h-2 bg-primary" />
        <CardHeader className="p-8 pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-primary/10 shadow-inner">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight text-foreground">
                  {module.title}
                </CardTitle>
                <CardDescription className="font-bold uppercase tracking-widest text-xs text-muted-foreground mt-1">
                  Live Learning Session
                </CardDescription>
              </div>
            </div>
            {scheduledTimeRaw && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="font-bold border-border hover:bg-muted text-foreground transition-all shadow-sm rounded-xl h-10 px-4 shrink-0"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" /> Add to Calendar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 bg-popover border shadow-md">
                  <DropdownMenuItem 
                    onClick={handleAddToGoogleCalendar} 
                    className="cursor-pointer hover:bg-muted font-bold rounded-lg py-2"
                  >
                    Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleAddToCalendar} 
                    className="cursor-pointer hover:bg-muted font-bold rounded-lg py-2"
                  >
                    Outlook / Apple (.ics)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-8 pt-0 space-y-8">
          {/* Info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-4 hover:bg-muted/60 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-background flex items-center justify-center shadow-sm">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Scheduled Time</p>
                <p className="font-bold text-base mt-0.5 text-foreground">{localTime}</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-4 hover:bg-muted/60 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-background flex items-center justify-center shadow-sm">
                <ExternalLink className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Meeting Destination</p>
                <p className="font-bold truncate text-sm mt-0.5 text-foreground">
                  {isLoadingSession ? 'Retrieving link...' : (joinUrl ? 'Zoom Live Webcast' : 'TBA by Instructor')}
                </p>
              </div>
            </div>
          </div>

          {/* Meeting Credentials card/section */}
          {session && (
            <div className="p-6 rounded-2xl bg-muted/30 border border-border/70 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Meeting Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Meeting ID */}
                <div className="flex flex-col justify-between p-4 bg-background border border-border/50 rounded-xl">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Meeting ID</p>
                    <p className="font-bold text-base mt-1 text-foreground font-mono tracking-wider">{session.zoomMeetingId || 'N/A'}</p>
                  </div>
                  {session.zoomMeetingId && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopy(session.zoomMeetingId, 'Meeting ID')}
                      className="mt-3 text-xs text-muted-foreground hover:text-primary h-8 px-2 justify-start font-bold"
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy ID
                    </Button>
                  )}
                </div>

                {/* Passcode */}
                <div className="flex flex-col justify-between p-4 bg-background border border-border/50 rounded-xl">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Passcode</p>
                    <p className="font-bold text-base mt-1 text-foreground font-mono tracking-wider">{session.zoomPasscode || 'N/A'}</p>
                  </div>
                  {session.zoomPasscode && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopy(session.zoomPasscode, 'Passcode')}
                      className="mt-3 text-xs text-muted-foreground hover:text-primary h-8 px-2 justify-start font-bold"
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Passcode
                    </Button>
                  )}
                </div>

                {/* Direct Link */}
                <div className="flex flex-col justify-between p-4 bg-background border border-border/50 rounded-xl">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Webcast Link</p>
                    <p className="font-semibold text-xs mt-1 text-primary truncate hover:underline">
                      {session.joinUrl ? (
                        <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
                          {session.joinUrl}
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </p>
                  </div>
                  {session.joinUrl && (
                    <div className="flex items-center gap-1.5 mt-3">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleCopy(session.joinUrl || '', 'Join URL')}
                        className="text-xs text-muted-foreground hover:text-primary h-8 px-2 font-bold flex-1 justify-start"
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Link
                      </Button>
                      <a 
                        href={session.joinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-lg h-8 px-2 text-xs font-bold text-primary hover:bg-muted border border-border/50"
                      >
                        Open <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Launcher Button */}
          <Button
            onClick={handleLaunch}
            disabled={isLoadingSession || !joinUrl}
            className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isLoadingSession ? (
              <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Fetching link...</>
            ) : (
              <><ExternalLink className="mr-3 h-6 w-6" /> Launch Zoom Meeting</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Attendance verification gateway ─────────────────────────── */}
      <Card className="border-dashed border-2 border-primary/20 shadow-none overflow-hidden bg-primary/5 rounded-3xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <CardHeader className="text-center p-8">
          <div className="rounded-full flex items-center justify-center mx-auto mb-3 h-12 w-12 bg-primary/10">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">Verification Gateway</CardTitle>
          <CardDescription>
            Enter the secret passcode announced by the instructor at the end of the session to unlock your progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 items-center p-8 pt-0 md:flex-row">
          <Input
            placeholder="ENTER PASSCODE"
            className="h-14 text-2xl tracking-[0.5em] text-center font-black uppercase bg-background border-primary/20 focus-visible:ring-primary rounded-2xl flex-1 w-full"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            disabled={isVerifying}
          />
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className="h-14 px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-2xl w-full md:w-auto min-w-[200px] font-black uppercase tracking-widest transition-all"
          >
            {isVerifying ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-5 w-5" />
            )}
            Verify
          </Button>
        </CardContent>
        <CardFooter className="bg-primary/5 p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest w-full text-center text-primary">
            Integrity Check: Attendance is monitored.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
