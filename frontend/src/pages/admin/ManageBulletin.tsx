import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { announcementsApi } from '../../api/announcements.api';
import type { Announcement } from '../../api/announcements.api';

import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Calendar, Newspaper, Megaphone } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ManageBulletin: React.FC = () => {
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
    fetchAnnouncements();
  }, []);

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight italic uppercase flex items-center gap-3">
          <Newspaper className="h-10 w-10 text-primary" />
          Bulletin Management
        </h1>
        <p className="text-muted-foreground text-lg">Broadcast important updates and motivational content to the entire organization.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form */}
        <Card className="lg:col-span-1 shadow-xl border-primary/5">
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <CardTitle>New Announcement</CardTitle>
            </div>
            <CardDescription>Fill out the details below to publish a new bulletin banner.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Headline Title</Label>
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Weekly Motivation"
                  className="bg-muted/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Expiration Date (Optional)</Label>
                <Input 
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="bg-muted/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Message Content</Label>
                <Textarea 
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="What would you like to say to the team?"
                  rows={4}
                  className="bg-muted/30"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest">Banner Image</Label>
                <div className="space-y-3">
                  <Input 
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept="image/*"
                    className="cursor-pointer file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-4 file:font-bold h-auto py-2"
                  />
                  <p className="text-[10px] text-muted-foreground italic leading-tight">
                    Optimized for 1200x400 (3:1 ratio).
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-md font-bold shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Publish to Bulletin
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tight italic">Active Broadcasts</h3>
            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {announcements.length} Total
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-20"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>
          ) : announcements.length === 0 ? (
            <Card className="border-dashed flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/5">
              <Newspaper className="h-12 w-12 opacity-10 mb-4" />
              <p className="italic">No active announcements on the board.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {announcements.map((ann) => (
                <Card key={ann.id} className="overflow-hidden group hover:border-primary/20 transition-all duration-300">
                  <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                    {ann.imageUrl && (
                      <div className="w-full sm:w-48 h-32 sm:h-auto overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={ann.imageUrl} 
                          alt={ann.title} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      </div>
                    )}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="font-black text-lg tracking-tight">{ann.title}</p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                            onClick={() => handleDelete(ann.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-3">
                          {ann.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
                        <span className="text-[10px] uppercase font-black text-muted-foreground/60 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {ann.expiresAt ? `Expires: ${new Date(ann.expiresAt).toLocaleDateString()}` : 'Indefinite Publication'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
