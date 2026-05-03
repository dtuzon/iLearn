import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2, Save, FileText } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen && moduleId) {
      fetchModule();
    }
  }, [isOpen, moduleId]);

  const fetchModule = async () => {
    if (!moduleId) return;
    setIsLoading(true);
    try {
      const moduleData = await coursesApi.getModule(moduleId);
      setContent(moduleData.contentUrlOrText || '');
    } catch (error) {
      toast.error('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!moduleId) return;
    setIsSaving(true);
    try {
      await coursesApi.updateModule(moduleId, {
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
              <DialogDescription>Craft your module content using the rich text editor.</DialogDescription>
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
