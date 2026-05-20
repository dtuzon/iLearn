import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Video, Calendar as CalendarIcon, ExternalLink, Key, CheckCircle, Loader2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { coursesApi } from '../../api/courses.api';
import { zoomApi } from '../../api/zoom.api';
import type { BatchLiveSession } from '../../api/zoom.api';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LiveSessionPlayerProps {
  module: any;
  onComplete: () => void;
  /** Pass batchId to activate Embedded Zoom SDK Mode (Mode B) */
  batchId?: string | null;
}

type ZoomPlayerState =
  | 'idle'
  | 'loading-session'
  | 'session-not-found'
  | 'loading-signature'
  | 'initializing-sdk'
  | 'joined'
  | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// LiveSessionPlayer
// ─────────────────────────────────────────────────────────────────────────────

export const LiveSessionPlayer: React.FC<LiveSessionPlayerProps> = ({ module, onComplete, batchId }) => {
  // ── Shared state ──────────────────────────────────────────────────────────
  const [passcode, setPasscode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // ── Mode B (Embedded SDK) state ───────────────────────────────────────────
  const [zoomState, setZoomState] = useState<ZoomPlayerState>('idle');
  const [session, setSession] = useState<BatchLiveSession | null>(null);
  const [zoomError, setZoomError] = useState<string | null>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  // Keep a reference to the Zoom client for cleanup on unmount
  const zoomClientRef = useRef<any>(null);

  const useEmbeddedSdk = !!batchId;
  const localTime = module.scheduledAt ? format(new Date(module.scheduledAt), 'PPPP p') : 'Not Scheduled';

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (zoomClientRef.current) {
        try {
          zoomClientRef.current.leaveMeeting?.();
        } catch {
          // Ignore errors during cleanup
        }
        zoomClientRef.current = null;
      }
    };
  }, []);

  // ── Mode B: Join the embedded Zoom meeting ────────────────────────────────
  const handleJoinEmbedded = useCallback(async () => {
    if (!batchId) return;

    try {
      // Step 1: Fetch BatchLiveSession credentials
      setZoomState('loading-session');
      setZoomError(null);

      let liveSession: BatchLiveSession;
      try {
        liveSession = await zoomApi.getLiveSession(batchId, module.id);
        setSession(liveSession);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setZoomState('session-not-found');
          return;
        }
        throw err;
      }

      // Step 2: Fetch SDK Signature
      setZoomState('loading-signature');
      const { signature, sdkKey } = await zoomApi.getSignature(liveSession.zoomMeetingId, 0);

      // Step 3: Dynamically import Zoom Embedded SDK (keeps it out of the main bundle)
      setZoomState('initializing-sdk');

      // Wait for container to be ready
      if (!zoomContainerRef.current) {
        throw new Error('Zoom container element is not available.');
      }

      // The embedded client lives in the /embedded subpath of @zoom/meetingsdk
      const ZoomMtgEmbedded = (await import('@zoom/meetingsdk/embedded')).default;

      // Clean up any previous instance
      if (zoomClientRef.current) {
        try { zoomClientRef.current.leaveMeeting?.(); } catch { /* ignore */ }
      }

      const client = ZoomMtgEmbedded.createClient();
      zoomClientRef.current = client;

      await client.init({
        zoomAppRoot: zoomContainerRef.current,
        language: 'en-US',
        customize: {
          video: { isResizable: true, viewSizes: { default: { width: 1100, height: 580 } } },
          meetingInfo: ['topic', 'host', 'mn', 'pwd', 'telPwd', 'invite', 'participant', 'dc', 'enctype'],
          toolbar: {
            buttons: [
              { text: 'Leave Session', className: 'leave-btn', onClick: () => client.leaveMeeting() }
            ]
          }
        }
      });

      await client.join({
        sdkKey,
        signature,
        meetingNumber: liveSession.zoomMeetingId,
        password: liveSession.zoomPasscode,
        userName: 'iLearn Learner', // In production: use the authenticated user's name
        userEmail: '', // Optional
      });

      setZoomState('joined');

    } catch (err: any) {
      console.error('[LiveSessionPlayer] Zoom SDK error:', err);
      const message = err?.response?.data?.message || err?.message || 'Failed to join the Zoom session.';
      setZoomError(message);
      setZoomState('error');
      toast.error(message);
    }
  }, [batchId, module.id]);

  // ── Mode A: Open external URL ─────────────────────────────────────────────
  const handleJoinExternal = () => {
    const url = module.meetingUrl || session?.joinUrl;
    if (url) window.open(url, '_blank');
  };

  // ── Mode A: Add to Calendar ───────────────────────────────────────────────
  const handleAddToCalendar = () => {
    if (!module.scheduledAt) return;
    const startDate = new Date(module.scheduledAt);
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
      `DESCRIPTION:Live Session. Join here: ${module.meetingUrl || 'N/A'}`,
      `LOCATION:${module.meetingUrl || 'Virtual'}`,
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

  // ── Attendance verification (shared for both modes) ───────────────────────
  const handleVerify = async () => {
    if (!passcode.trim()) { toast.error('Please enter the attendance passcode.'); return; }
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const renderZoomStatus = () => {
    switch (zoomState) {
      case 'loading-session':
        return (
          <div className="flex items-center gap-3 text-primary font-bold text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Fetching session credentials...
          </div>
        );
      case 'loading-signature':
        return (
          <div className="flex items-center gap-3 text-primary font-bold text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Authenticating with Zoom...
          </div>
        );
      case 'initializing-sdk':
        return (
          <div className="flex items-center gap-3 text-primary font-bold text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Launching meeting client...
          </div>
        );
      case 'session-not-found':
        return (
          <div className="flex items-center gap-3 text-amber-600 font-bold text-sm p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-black">Zoom session not yet configured</p>
              <p className="font-medium text-xs mt-0.5 text-amber-700">
                The meeting link for this session is still being set up by your administrator. Please check back later or use the external link below if available.
              </p>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-3 text-rose-600 font-bold text-sm p-4 bg-rose-50 rounded-2xl border border-rose-200">
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-black">Connection failed</p>
              <p className="font-medium text-xs mt-0.5 text-rose-700">{zoomError}</p>
            </div>
          </div>
        );
      case 'joined':
        return (
          <div className="flex items-center gap-3 text-emerald-600 font-bold text-sm">
            <Wifi className="h-5 w-5" />
            Connected to live session
          </div>
        );
      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Session Card ────────────────────────────────────────────────── */}
      <Card className="border-none shadow-2xl overflow-hidden bg-gradient-to-br from-background to-orange-50/30">
        <div className="h-2 bg-orange-500" />
        <CardHeader className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                <Video className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight">{module.title}</CardTitle>
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
          {/* Schedule + URL info */}
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
                <p className="font-bold truncate text-sm">
                  {session?.joinUrl || module.meetingUrl || (useEmbeddedSdk ? 'Auto-configured via Zoom API' : 'TBA by Instructor')}
                </p>
              </div>
            </div>
          </div>

          {/* SDK status feedback */}
          {useEmbeddedSdk && zoomState !== 'idle' && (
            <div className="transition-all duration-300">
              {renderZoomStatus()}
            </div>
          )}

          {/* Embedded Zoom SDK container — always in DOM when in Mode B so ref is ready */}
          {useEmbeddedSdk && (
            <div
              ref={zoomContainerRef}
              id="zoom-sdk-container"
              className="w-full rounded-2xl overflow-hidden bg-slate-900"
              style={{ minHeight: zoomState === 'joined' ? '580px' : '0px', transition: 'min-height 0.3s ease' }}
            />
          )}

          {/* Join button */}
          {useEmbeddedSdk ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleJoinEmbedded}
                disabled={['loading-session', 'loading-signature', 'initializing-sdk', 'joined'].includes(zoomState)}
                className="flex-1 h-16 text-lg font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 bg-orange-600 hover:bg-orange-700 disabled:opacity-60"
              >
                {['loading-session', 'loading-signature', 'initializing-sdk'].includes(zoomState)
                  ? <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Connecting...</>
                  : zoomState === 'joined'
                  ? <><Wifi className="mr-3 h-6 w-6" /> Session Active</>
                  : <><Video className="mr-3 h-6 w-6" /> Launch Zoom Session</>
                }
              </Button>
              {/* Fallback external link — always available */}
              {(session?.joinUrl || module.meetingUrl) && (
                <Button variant="outline" onClick={handleJoinExternal} className="h-16 px-6 font-bold border-orange-200 hover:bg-orange-50">
                  <ExternalLink className="mr-2 h-5 w-5" /> Open in Zoom App
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={handleJoinExternal}
              disabled={!module.meetingUrl}
              className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 bg-orange-600 hover:bg-orange-700"
            >
              <ExternalLink className="mr-3 h-6 w-6" />
              Join Live Session Now
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Attendance Verification ──────────────────────────────────────── */}
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
