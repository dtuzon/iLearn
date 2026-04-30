import React, { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Upload, Video, CheckCircle2, X } from 'lucide-react';

import { toast } from 'sonner';
import apiClient from '../../api/client';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (videoUrl: string) => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onUploadSuccess 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 100MB.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await apiClient.post('/courses/modules/video/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total) 
            : 0;
          setUploadProgress(progress);
        },
      });

      toast.success('Video uploaded successfully!');
      onUploadSuccess(response.data.url);
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload video');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isUploading && handleClose()}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Video Asset Manager
          </DialogTitle>
          <DialogDescription>
            Upload high-resolution training content for the learning loop.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/20 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">Click or Drag to Upload</p>
                <p className="text-xs text-muted-foreground mt-1">MP4, WebM up to 100MB</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/mp4,video/webm" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                  <div className="max-w-[200px]">
                    <p className="text-sm font-bold truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                {!isUploading && (
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-primary">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="shadow-lg shadow-primary/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
