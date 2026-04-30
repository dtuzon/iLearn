import React, { useState, useRef } from 'react';

import { 
  CheckCircle2, 
  Lock, 
  Play, 
  Pause,
  AlertCircle
} from 'lucide-react';


import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

interface LocalVideoPlayerProps {
  url: string;
  onComplete: () => void;
  className?: string;
}

export const LocalVideoPlayer: React.FC<LocalVideoPlayerProps> = ({ 
  url, 
  onComplete,
  className 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [highestWatchedTime, setHighestWatchedTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Get full URL for local assets
  const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL?.replace('/api', '')}${url}`;

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    // Update progress percentage
    if (duration) {
      setProgress((currentTime / duration) * 100);
    }

    // Only update highestWatchedTime if it's within 2 seconds of current highest
    // or if they are watching forward linearly. This prevents "skipping" glitches
    // but allows normal playback.
    if (currentTime > highestWatchedTime) {
      // If the jump is too large, it might be a seek attempt that wasn't caught by onSeeking
      // (though onSeeking is usually reliable)
      if (currentTime - highestWatchedTime < 2) {
        setHighestWatchedTime(currentTime);
      }
    }

    // Check for completion (95% watched)
    if (!isCompleted && duration && (currentTime / duration) >= 0.95) {
      setIsCompleted(true);
      onComplete();
    }
  };

  const handleSeeking = () => {
    if (!videoRef.current) return;

    // If attempting to seek forward past what they've already watched
    if (videoRef.current.currentTime > highestWatchedTime + 1) {
      videoRef.current.currentTime = highestWatchedTime;
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={cn("relative group rounded-3xl overflow-hidden bg-black shadow-2xl", className)}>
      {/* Warning Overlay */}
      <div className={cn(
        "absolute top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
        showWarning ? "translate-y-0 opacity-100" : "-translate-y-12 opacity-0"
      )}>
        <Badge variant="destructive" className="bg-destructive/90 backdrop-blur-md border-none px-4 py-2 shadow-xl flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          <span className="text-xs font-black uppercase tracking-widest">Forward Seeking Disabled</span>
        </Badge>
      </div>

      {/* Compliance Message */}
      <div className="absolute top-6 right-6 z-40">
        <Badge variant="outline" className="bg-black/40 backdrop-blur-md border-white/10 text-white/70 px-3 py-1.5 flex items-center gap-2">
          <AlertCircle className="h-3 w-3" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Compliance Protocol Active</span>
        </Badge>
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        src={fullUrl}
        className="w-full h-full aspect-video cursor-pointer"
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeeking}
        onEnded={() => {
          setIsCompleted(true);
          onComplete();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        controlsList="nodownload"
        onClick={togglePlay}
      />

      {/* Custom Controls Overlay (Fade on hover) */}
      <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
            {/* Limit line */}
            <div 
              className="absolute top-0 h-full w-0.5 bg-white/30"
              style={{ left: `${(highestWatchedTime / (videoRef.current?.duration || 1)) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={togglePlay}
                className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-none"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
              </Button>

              <div className="space-y-0.5">
                <p className="text-white font-black text-xs uppercase tracking-widest">
                  {isCompleted ? "Training Verified" : "Learning in Progress"}
                </p>
                <p className="text-white/50 text-[10px] font-medium italic">
                  Complete the entire sequence to unlock next module
                </p>
              </div>
            </div>

            {isCompleted && (
              <Badge className="bg-success text-white border-none py-2 px-4 animate-in zoom-in-95">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Sequence Validated
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Large Center Play Button when paused */}
      {!isPlaying && (
        <div 
          onClick={togglePlay}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[2px] cursor-pointer"
        >
          <div className="h-24 w-24 rounded-full bg-primary/90 flex items-center justify-center shadow-2xl scale-95 hover:scale-100 transition-transform">
            <Play className="h-10 w-10 text-white fill-current translate-x-1" />
          </div>
        </div>
      )}
    </div>
  );
};
