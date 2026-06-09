import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Video, Calendar as CalendarIcon, ExternalLink, Key, CheckCircle, Loader2, Wifi, WifiOff, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { format } from 'date-fns';
import { coursesApi } from '../../api/courses.api';
import { zoomApi } from '../../api/zoom.api';
import type { BatchLiveSession } from '../../api/zoom.api';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LiveSessionPlayerProps {
  module: any;
  onComplete: () => void;
  /** Pass batchId to activate Embedded Zoom SDK Mode (Mode B) */
  batchId?: string | null;
  isWidescreen?: boolean;
  onToggleWidescreen?: () => void;
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

export const LiveSessionPlayer: React.FC<LiveSessionPlayerProps> = ({ 
  module, 
  onComplete, 
  batchId,
  isWidescreen = false,
  onToggleWidescreen
}) => {
  const { user } = useAuth();

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
  const joinAttemptRef = useRef(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomHeight, setZoomHeight] = useState(600);

  const useEmbeddedSdk = !!batchId;
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'iLearn Learner';
  const localTime = module.scheduledAt ? format(new Date(module.scheduledAt), 'PPPP p') : 'Not Scheduled';

  // ── Cleanup and Preloading ────────────────────────────────────────────────
  useEffect(() => {
    // 1. Preload the massive 5MB Zoom SDK immediately so we don't break the browser's 
    // user-gesture timeout window (1-2 seconds) when the user finally clicks 'Launch'.
    if (useEmbeddedSdk) {
      import('@zoom/meetingsdk/embedded').catch(() => {
        // Silently ignore preload failures, it will retry on click
      });
    }

    const cleanupZoom = () => {
      if (zoomClientRef.current) {
        try {
          zoomClientRef.current.leaveMeeting?.();
        } catch {
          // Ignore errors during cleanup
        }
      }
    };

    // Handle hard refreshes and tab closures
    window.addEventListener('beforeunload', cleanupZoom);

    // Handle React component unmounts
    return () => {
      window.removeEventListener('beforeunload', cleanupZoom);
      cleanupZoom();
      zoomClientRef.current = null;
    };
  }, []);

  // ── Dynamic Zoom Sizing and CSS Transform Scaling ──────────────────────────
  const updateScale = useCallback(() => {
    const containerEl = zoomContainerRef.current;
    if (!containerEl) return;
    
    const containerWidth = containerEl.clientWidth || 800;
    const targetWidth = 960;
    const targetHeight = 600;
    
    const scale = containerWidth / targetWidth;
    setZoomScale(scale);
    setZoomHeight(targetHeight * scale);
    
    const child = containerEl.firstElementChild as HTMLElement;
    if (child) {
      child.style.transform = `scale(${scale})`;
      child.style.transformOrigin = 'top left';
      child.style.width = `${targetWidth}px`;
      child.style.height = `${targetHeight}px`;
      child.style.position = 'absolute';
      child.style.top = '0px';
      child.style.left = '0px';
    }
  }, []);

  useEffect(() => {
    if (!['loading-session', 'loading-signature', 'initializing-sdk', 'joined'].includes(zoomState)) return;
    
    const containerEl = zoomContainerRef.current;
    if (!containerEl) return;
    
    // Set up MutationObserver to detect when Zoom SDK mounts its child element
    const observer = new MutationObserver(() => {
      updateScale();
    });
    
    observer.observe(containerEl, { childList: true });
    
    // Run initial scale update
    updateScale();
    
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [zoomState, isWidescreen, updateScale]);

  // ── Helper: Destroy the current Zoom client safely ─────────────────────────
  const destroyZoomClient = useCallback(() => {
    if (zoomClientRef.current) {
      try { zoomClientRef.current.leaveMeeting?.(); } catch { /* ignore */ }
      zoomClientRef.current = null;
    }
  }, []);

  // ── Mode B: Join the embedded Zoom meeting ────────────────────────────────
  const handleJoinEmbedded = useCallback(async () => {
    if (!batchId) return;

    // Pre-request browser camera and microphone permissions to cache approval
    try {
      console.log('[LiveSessionPlayer] Pre-requesting camera and microphone permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      // Stop tracks immediately after obtaining permission to release the device
      stream.getTracks().forEach(track => track.stop());
      console.log('[LiveSessionPlayer] Media permissions pre-acquired successfully');
    } catch (permErr) {
      console.warn('[LiveSessionPlayer] Media permissions pre-acquisition warned/denied:', permErr);
    }

    // Initialize global log array
    (window as any).zoomLogs = [];
    const log = (msg: string, data?: any) => {
      const entry = `[${new Date().toISOString()}] ${msg} ${data ? JSON.stringify(data) : ''}`;
      console.log(entry);
      (window as any).zoomLogs.push(entry);
    };

    try {
      log('Step 1: Fetching BatchLiveSession credentials...');
      setZoomState('loading-session');
      setZoomError(null);

      let liveSession: BatchLiveSession;
      try {
        liveSession = await zoomApi.getLiveSession(batchId, module.id);
        setSession(liveSession);
        log('Session credentials fetched successfully', liveSession);
      } catch (err: any) {
        log('Failed to fetch session credentials', err);
        if (err?.response?.status === 404) {
          setZoomState('session-not-found');
          return;
        }
        throw err;
      }

      log('Step 2: Fetching SDK Signature...');
      setZoomState('loading-signature');
      const { signature } = await zoomApi.getSignature(liveSession.zoomMeetingId, 0);
      log('SDK Signature fetched successfully', { signatureLength: signature?.length });

      log('Step 3: Dynamically importing Zoom Embedded SDK...');
      setZoomState('initializing-sdk');

      if (!zoomContainerRef.current) {
        throw new Error('Zoom container element is not available.');
      }

      const ZoomMtgEmbedded = (await import('@zoom/meetingsdk/embedded')).default;
      log('Zoom Embedded SDK imported successfully');

      if (zoomClientRef.current) {
        log('Cleaning up previous Zoom client instance...');
        destroyZoomClient();
      }

      log('Creating Zoom client instance...');
      const client = ZoomMtgEmbedded.createClient();
      zoomClientRef.current = client;
      joinAttemptRef.current += 1;
      const currentAttempt = joinAttemptRef.current;

      log('Step 4: Initializing SDK into container...');
      setZoomState('initializing-sdk');

      const containerEl = zoomContainerRef.current!;

      // Delay to ensure the container has its final layout dimensions
      await new Promise(resolve => setTimeout(resolve, 200));
      const containerWidth = containerEl.clientWidth || 800;
      const containerHeight = containerEl.clientHeight || Math.min(900, Math.max(780, Math.round(window.innerHeight * 0.8)));

      log('Browser isolation status:', {
        crossOriginIsolated: typeof window !== 'undefined' ? window.crossOriginIsolated : false,
        sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined'
      });

      log('Container dimensions at init:', { containerWidth, containerHeight });

      await client.init({
        zoomAppRoot: containerEl,
        language: 'en-US',
        customize: {
          video: { 
            isResizable: false, 
            popper: {
              disableDraggable: true
            },
            viewSizes: { 
              default: { 
                width: 960, 
                height: 600 
              } 
            } 
          },
          meetingInfo: ['topic', 'host', 'mn', 'pwd', 'telPwd', 'invite', 'participant', 'dc', 'enctype']
        }
      });
      log('SDK client.init completed successfully');

      let isSettled = false;
      log('Entering connection promise block...');
      await new Promise<void>((resolve, reject) => {
        // Auto-retry: if this is the first attempt and nothing happens in 30s,
        // the WASM is likely still downloading. Destroy and retry (assets will be cached).
        const autoRetryTimeout = currentAttempt <= 1 ? setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            log('Auto-retry: no connection after 30s on first attempt, retrying...');
            toast.info('Reconnecting to Zoom (assets are now cached)...');
            destroyZoomClient();
            // Schedule retry on next tick to let state settle
            setTimeout(() => handleJoinEmbedded(), 500);
            // Resolve (don't reject) — the retry will handle the new attempt
            resolve();
          }
        }, 30000) : null;

        log(`Setting up 180s timeout guard (attempt ${currentAttempt})...`);
        const timeout = setTimeout(() => {
          if (isSettled) return;
          isSettled = true;
          if (autoRetryTimeout) clearTimeout(autoRetryTimeout);
          log('Timeout guard triggered (180s reached)');
          reject(new Error('Connection timed out. Please check that the meeting host has started the session and try again.'));
        }, 180000); // 3 minutes for slow connections downloading 20MB of WASM

        // Show a helpful toast if it takes longer than 10 seconds
        const slowNetworkWarning = setTimeout(() => {
          if (!isSettled) {
            toast.info('Downloading Zoom media assets. This may take a moment on slower connections...');
          }
        }, 10000);

        log('Registering connection-change event listener...');
        client.on('connection-change', (payload: any) => {
          log('connection-change event received', payload);
          if (payload.state === 'Connected') {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timeout);
              clearTimeout(slowNetworkWarning);
              if (autoRetryTimeout) clearTimeout(autoRetryTimeout);
              log('Connected successfully, resolving promise');
              resolve();
            } else {
              setZoomState('joined');
            }
          } else if (['Closed', 'Failed', 'Forbidden'].includes(payload.state)) {
            if (!isSettled) {
              isSettled = true;
              clearTimeout(timeout);
              clearTimeout(slowNetworkWarning);
              if (autoRetryTimeout) clearTimeout(autoRetryTimeout);
              log(`Connection state: ${payload.state}, rejecting promise`, payload);
              reject(new Error(payload.reason || `Meeting connection ${payload.state.toLowerCase()}.`));
            } else {
              log(`Connection closed after join: ${payload.state}`);
              setZoomState('idle');
            }
          }
        });

        log('Invoking client.join()...');
        client.join({
          signature,
          meetingNumber: liveSession.zoomMeetingId,
          password: liveSession.zoomPasscode,
          userName,
          // Append a random salt to the email to bypass Zoom's 60-second ghost session lock
          userEmail: `${user?.email?.split('@')[0] || 'learner'}+${Math.random().toString(36).substring(2, 8)}@${user?.email?.split('@')[1] || 'ilearn.local'}`,
        }).then((res: any) => {
          log('client.join() promise resolved (note: may not mean connected yet)', res);
        }).catch((err: any) => {
          log('client.join() promise rejected', err);
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeout);
            clearTimeout(slowNetworkWarning);
            if (autoRetryTimeout) clearTimeout(autoRetryTimeout);
            reject(err);
          }
        });
      });

      // If auto-retry triggered (resolved without rejection), don't transition — the retry handles it
      if (zoomClientRef.current === client) {
        log('Zoom SDK join sequence fully finished. Transitioning to joined.');
        setZoomState('joined');
      }

    } catch (err: any) {
      log('Zoom SDK error encountered in catch block', err);
      console.error('[LiveSessionPlayer] Zoom SDK error:', err);
      const zoomReason = err?.reason || err?.type;
      const message = zoomReason
        ? `Zoom error: ${zoomReason}`
        : err?.response?.data?.message || err?.message || 'Failed to join the Zoom session.';
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

  const hasJoined = zoomState === 'joined';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── Session Card ────────────────────────────────────────────────── */}
      <Card className={`border-none shadow-2xl overflow-hidden transition-colors duration-500 ${
        hasJoined 
          ? 'bg-slate-950 text-white rounded-none md:rounded-2xl' 
          : 'bg-gradient-to-br from-background to-orange-50/30'
      }`}>
        {!hasJoined && <div className="h-2 bg-orange-500" />}
        <CardHeader className={`transition-all duration-300 ${hasJoined ? 'p-4 border-b border-slate-900 bg-slate-950' : 'p-8'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-colors ${
                hasJoined ? 'bg-orange-500/20' : 'bg-orange-500/10'
              }`}>
                <Video className={`h-8 w-8 transition-colors ${hasJoined ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <div>
                <CardTitle className={`text-2xl font-black uppercase tracking-tight ${hasJoined ? 'text-white' : ''}`}>
                  {module.title}
                </CardTitle>
                <CardDescription className={`font-bold uppercase tracking-widest text-xs ${
                  hasJoined ? 'text-orange-400' : 'text-orange-600'
                }`}>
                  {hasJoined ? 'Active Live Session' : 'Live Learning Session'}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {onToggleWidescreen && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onToggleWidescreen} 
                  className={`font-bold gap-1.5 transition-all ${
                    hasJoined 
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white bg-slate-950' 
                      : 'border-orange-200 hover:bg-orange-50 text-orange-600'
                  }`}
                >
                  {isWidescreen ? (
                    <><Minimize2 className="h-4 w-4" /> Normal View</>
                  ) : (
                    <><Maximize2 className="h-4 w-4" /> Theater Mode</>
                  )}
                </Button>
              )}
              {!hasJoined && (
                <Button variant="outline" size="sm" onClick={handleAddToCalendar} className="font-bold border-orange-200 hover:bg-orange-50">
                  <CalendarIcon className="mr-2 h-4 w-4" /> Add to Calendar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className={`transition-all duration-300 ${hasJoined ? 'p-0 bg-black' : 'p-8 pt-0 space-y-8'}`}>
          {/* Schedule + URL info */}
          {!hasJoined && (
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
          )}

          {/* SDK status feedback */}
          {useEmbeddedSdk && zoomState !== 'idle' && (
            <div className={`transition-all duration-300 ${hasJoined ? 'px-4 py-2' : ''}`}>
              {renderZoomStatus()}
            </div>
          )}

          {/* Embedded Zoom SDK container — always in DOM when in Mode B so ref is ready */}
          {useEmbeddedSdk && (
            <div
              ref={zoomContainerRef}
              id="zoom-sdk-container"
              className={`relative w-full overflow-hidden bg-black transition-all ${
                hasJoined ? 'rounded-none' : 'rounded-2xl'
              }`}
              style={{
                height: ['loading-session', 'loading-signature', 'initializing-sdk', 'joined'].includes(zoomState)
                  ? `${zoomHeight}px`
                  : '0px',
                minHeight: ['loading-session', 'loading-signature', 'initializing-sdk', 'joined'].includes(zoomState)
                  ? `${zoomHeight}px`
                  : '0px',
              }}
            />
          )}

          {/* Join button */}
          {!hasJoined && (
            useEmbeddedSdk ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleJoinEmbedded}
                  disabled={['loading-session', 'loading-signature', 'initializing-sdk', 'joined', 'session-not-found'].includes(zoomState)}
                  className="flex-1 h-16 text-lg font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 bg-orange-600 hover:bg-orange-700 disabled:opacity-60"
                >
                  {['loading-session', 'loading-signature', 'initializing-sdk'].includes(zoomState)
                    ? <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Connecting...</>
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
            )
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
