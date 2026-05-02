import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { announcementsApi } from '../../api/announcements.api';
import type { Announcement } from '../../api/announcements.api';

import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Calendar } from 'lucide-react';


interface ManageBulletinDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageBulletinDialog: React.FC<ManageBulletinDialogProps> = ({ isOpen, onClose }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    expiresAt: '',
    priority: 'NORMAL'
  });

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const data = await announcementsApi.getAll();
      setAnnouncements(data);
    } catch (error) {
      toast.error('Failed to fetch announcements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnnouncements();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (file) {
        const uploadRes = await announcementsApi.uploadImage(file);
        imageUrl = uploadRes.imageUrl;
      }

      await announcementsApi.create({
        ...formData,
        imageUrl,
        expiresAt: formData.expiresAt || undefined
      });

      toast.success('Announcement published successfully');
      setFormData({ title: '', content: '', expiresAt: '', priority: 'NORMAL' });
      setFile(null);
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to publish announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await announcementsApi.delete(id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Manage Bulletin Board</DialogTitle>
          <DialogDescription>
            Publish announcements, motivational quotes, or event flyers for all users.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Weekly Motivation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Expiration Date (Optional)</Label>
              <Input 
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message Content</Label>
            <Textarea 
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter your announcement message..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Bulletin Image (Optional Banner)</Label>
            <div className="flex items-center gap-4">
              <Input 
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="image/*"
                className="cursor-pointer"
              />
              {file && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{file.name}</span>}
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Publish to Bulletin
          </Button>
        </form>

        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-bold">Active Announcements</h3>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
          ) : announcements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 italic">No active announcements.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {announcements.map((ann) => (
                <div key={ann.id} className="flex items-start justify-between p-4 rounded-lg border bg-background shadow-sm hover:shadow-md transition-all">
                  <div className="flex gap-4">
                    {ann.imageUrl && (
                      <div className="h-16 w-16 rounded overflow-hidden flex-shrink-0 border bg-muted">
                        <img src={ann.imageUrl} alt={ann.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">{ann.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ann.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] uppercase font-black text-muted-foreground/60 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {ann.expiresAt ? `Expires: ${new Date(ann.expiresAt).toLocaleDateString()}` : 'No Expiry'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(ann.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
