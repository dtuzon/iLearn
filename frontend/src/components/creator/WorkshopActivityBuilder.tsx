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
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Input } from '../ui/input';
import { Loader2, BookOpen, UserCheck, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { coursesApi } from '../../api/courses.api';
import { usersApi } from '../../api/users.api';
import type { UserResponse } from '../../api/users.api';

import apiClient from '../../api/client';

interface WorkshopActivityBuilderProps {
  courseId: string;
  moduleId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const WorkshopActivityBuilder: React.FC<WorkshopActivityBuilderProps> = ({
  courseId,
  moduleId,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [checkerType, setCheckerType] = useState<'IMMEDIATE_SUPERIOR' | 'COURSE_CREATOR' | 'SPECIFIC_USER'>('COURSE_CREATOR');
  const [specificCheckerId, setSpecificCheckerId] = useState('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateUrl, setTemplateUrl] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen && moduleId) {
      fetchModuleDetails();
    }
  }, [isOpen, moduleId]);

  const fetchModuleDetails = async () => {
    setIsLoading(true);
    try {
      const module = await coursesApi.getById(courseId).then(c => c.modules?.find(m => m.id === moduleId));
      if (module) {
        setInstructions(module.activityInstructions || '');
        setCheckerType(module.checkerType || 'COURSE_CREATOR');
        setSpecificCheckerId(module.specificCheckerId || '');
        setTemplateUrl(module.activityTemplateUrl || '');
      }
    } catch (error) {
      toast.error('Failed to load module details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const results = await usersApi.getAll({ search: searchQuery });
      setUsers(results);
    } catch (error) {
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalTemplateUrl = templateUrl;

      // Upload template if exists
      if (templateFile) {
        const formData = new FormData();
        formData.append('file', templateFile);
        const uploadRes = await apiClient.post('/workshops/upload-template', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalTemplateUrl = uploadRes.data.url;
      }

      await coursesApi.updateModule(courseId, moduleId, {
        activityInstructions: instructions,
        activityTemplateUrl: finalTemplateUrl,
        checkerType,
        specificCheckerId: checkerType === 'SPECIFIC_USER' ? specificCheckerId : undefined
      });

      toast.success('Activity configuration saved');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Workshop Activity Configuration
          </DialogTitle>
          <DialogDescription>
            Define instructions, templates, and the approval workflow for this activity.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider">Activity Instructions</Label>
              <Textarea 
                placeholder="Describe what the learner needs to do. Markdown is supported."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[120px] bg-muted/30 border-none focus:ring-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Approval Workflow</Label>
                <Select 
                  value={checkerType} 
                  onValueChange={(val: any) => setCheckerType(val)}
                >
                  <SelectTrigger className="bg-muted/30 border-none">
                    <SelectValue placeholder="Who will approve this?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COURSE_CREATOR">Course Creator (You)</SelectItem>
                    <SelectItem value="IMMEDIATE_SUPERIOR">Immediate Superior (HR/Manager)</SelectItem>
                    <SelectItem value="SPECIFIC_USER">Specific Authorized User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">Reference Template (Optional)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="file" 
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                    className="bg-muted/30 border-none cursor-pointer"
                  />
                  {templateUrl && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={templateUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {checkerType === 'SPECIFIC_USER' && (
              <div className="space-y-3 p-4 border rounded-xl bg-primary/5 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-primary">Search Checker</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Name, Username, or Email"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-background border-none shadow-inner"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                    />
                  </div>
                  <Button type="button" onClick={handleSearchUsers} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>

                {users.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
                    {users.map(u => (
                      <div 
                        key={u.id}
                        onClick={() => setSpecificCheckerId(u.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${specificCheckerId === u.id ? 'bg-primary text-white' : 'hover:bg-primary/10'}`}
                      >
                        <div className="text-sm font-medium">
                          {u.firstName} {u.lastName} <span className="opacity-60 text-xs">({u.role})</span>
                        </div>
                        {specificCheckerId === u.id && <UserCheck className="h-4 w-4" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !instructions}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Activity Config'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
