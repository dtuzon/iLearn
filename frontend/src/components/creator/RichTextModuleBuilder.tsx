import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2, Save, FileText, Plus, Trash2, UploadCloud, File as FileIcon } from 'lucide-react';

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { coursesApi } from '../../api/courses.api';
import { toast } from 'sonner';

interface RichTextModuleBuilderProps {
  courseId: string;
  moduleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const RichTextModuleBuilder: React.FC<RichTextModuleBuilderProps> = ({
  courseId,
  moduleId,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);



  const handleSave = async () => {
    if (!moduleId) return;
    setIsSaving(true);
    try {
      await coursesApi.updateModule(courseId, moduleId, {
        contentUrlOrText: content
      });
      toast.success('Content saved successfully');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to save content');
    } finally {
      setIsSaving(true);
      setTimeout(() => setIsSaving(false), 500);
    }
  };


  useEffect(() => {
    if (isOpen && moduleId) {
      fetchModule();
    } else {
      setContent('');
      setAttachments([]);
    }
  }, [isOpen, moduleId]);

  const fetchModule = async () => {
    if (!moduleId) return;
    setIsLoading(true);
    try {
      const moduleData = await coursesApi.getModule(moduleId);
      setContent(moduleData.contentUrlOrText || '');
      setAttachments((moduleData as any).attachments || []);
    } catch (error) {
      toast.error('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !moduleId) return;
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      const newAttachment = await coursesApi.uploadAttachment(courseId, file, moduleId);
      setAttachments([...attachments, newAttachment]);
      toast.success('Attachment added to module');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    try {
      await coursesApi.deleteAttachment(id);
      setAttachments(attachments.filter(a => a.id !== id));
      toast.success('Attachment removed');
    } catch (error) {
      toast.error('Failed to remove attachment');
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'clean']
    ],
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 bg-primary/5 border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Content Designer</DialogTitle>
              <DialogDescription>
                Craft your module content and manage specific files for this component.
              </DialogDescription>


            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 opacity-20">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-xs font-black uppercase">Loading Content...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="quill-editor-container border rounded-xl overflow-hidden shadow-inner bg-background">
                <ReactQuill 
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  className="min-h-[400px]"
                  placeholder="Start typing your module content here..."
                />
              </div>

              {/* Module-Specific Attachments Section */}
              <div className="pt-6 border-t border-dashed">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Module Attachments</h3>
                  </div>
                  <Label htmlFor="module-file-upload" className="cursor-pointer">
                    <div className="flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80 transition-opacity">
                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Add Material
                    </div>
                  </Label>
                  <input 
                    id="module-file-upload" 
                    type="file" 
                    className="hidden" 
                    onChange={handleAttachmentUpload}
                    disabled={isUploading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/10 group hover:bg-muted/20 transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center flex-shrink-0 shadow-sm">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[11px] font-bold truncate pr-2">{file.fileName}</p>
                          <p className="text-[9px] text-muted-foreground font-mono">
                            {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteAttachment(file.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <div className="col-span-2 py-8 border border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground/30">
                      <FileIcon className="h-6 w-6 mb-1" />
                      <p className="text-[10px] font-black uppercase tracking-tighter">No Specific Attachments</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          )}
        </div>

        <DialogFooter className="p-6 bg-muted/30 border-t border-border/50">
          <Button variant="outline" onClick={onClose} className="font-bold">Discard</Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading} className="font-bold min-w-[140px] shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sync Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
