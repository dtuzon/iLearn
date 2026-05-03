import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Loader2, Save, Video, Calendar as CalendarIcon, Link as LinkIcon, Key } from 'lucide-react';
import { coursesApi } from '../../api/courses.api';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LiveSessionBuilderProps {
  courseId: string;
  moduleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const LiveSessionBuilder: React.FC<LiveSessionBuilderProps> = ({
  courseId,
  moduleId,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    meetingUrl: '',
    scheduledAt: '',
    attendanceCode: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && moduleId) {
      fetchModule();
    } else {
      setFormData({
        meetingUrl: '',
        scheduledAt: '',
        attendanceCode: ''
      });
    }
  }, [isOpen, moduleId]);

  const fetchModule = async () => {
    if (!moduleId) return;
    setIsLoading(true);
    try {
      const moduleData = await coursesApi.getModule(moduleId);
      setFormData({
        meetingUrl: moduleData.meetingUrl || '',
        scheduledAt: moduleData.scheduledAt ? format(new Date(moduleData.scheduledAt), "yyyy-MM-dd'T'HH:mm") : '',
        attendanceCode: moduleData.attendanceCode || ''
      });
    } catch (error) {
      toast.error('Failed to load live session details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!moduleId) return;
    setIsSaving(true);
    try {
      await coursesApi.updateModule(courseId, moduleId, {
        meetingUrl: formData.meetingUrl,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null as any,
        attendanceCode: formData.attendanceCode
      });
      toast.success('Live session updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to save live session');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-none shadow-2xl rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Live Session Config</DialogTitle>
              <DialogDescription>
                Configure your webinar or physical meeting details.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-20">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest">Fetching details...</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-url" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                Meeting Link
              </Label>
              <Input 
                id="meeting-url" 
                placeholder="https://zoom.us/j/..." 
                value={formData.meetingUrl}
                onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                className="rounded-xl h-12 bg-muted/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled-at" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Scheduled Date & Time
              </Label>
              <Input 
                id="scheduled-at" 
                type="datetime-local" 
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="rounded-xl h-12 bg-muted/30"
              />
              <p className="text-[10px] text-muted-foreground italic">Scheduled in your local timezone.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendance-code" className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Attendance Passcode
              </Label>
              <Input 
                id="attendance-code" 
                placeholder="e.g. 1234" 
                value={formData.attendanceCode}
                onChange={(e) => setFormData({ ...formData, attendanceCode: e.target.value })}
                className="rounded-xl h-12 bg-muted/30 font-mono text-center text-lg tracking-widest"
              />
              <p className="text-[10px] text-muted-foreground">
                <span className="font-bold text-primary">TIP:</span> Instructors will announce this code at the end of the call to verify attendance.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="font-bold">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading} className="font-bold min-w-[140px] shadow-lg shadow-primary/20 rounded-xl h-12">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
