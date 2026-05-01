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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Loader2, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { coursesApi } from '../../api/courses.api';
import { evaluationsApi, TemplateCategory } from '../../api/evaluations.api';
import type { EvaluationTemplate } from '../../api/evaluations.api';


interface EvaluationTemplatePickerProps {
  courseId: string;
  moduleId: string;
  category: TemplateCategory;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const EvaluationTemplatePicker: React.FC<EvaluationTemplatePickerProps> = ({
  courseId,
  moduleId,
  category,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      fetchModuleDetails();
    }
  }, [isOpen, moduleId, category]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await evaluationsApi.getTemplates(category);
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to load evaluation templates');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModuleDetails = async () => {
    try {
      // We need to get the module to see the current templateId
      // coursesApi.getById is a bit heavy, but it works for now
      const course = await coursesApi.getById(courseId);
      const module = course.modules?.find(m => m.id === moduleId);
      if (module && (module as any).evaluationTemplateId) {
        setSelectedTemplateId((module as any).evaluationTemplateId);
      } else {
        setSelectedTemplateId('');
      }
    } catch (error) {
      // Ignore
    }
  };

  const handleSave = async () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template');
      return;
    }

    setIsSaving(true);
    try {
      await coursesApi.updateModule(courseId, moduleId, {
        evaluationTemplateId: selectedTemplateId
      });
      toast.success('Evaluation template linked');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to link template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            {category === TemplateCategory.KASH_EVALUATION ? 'Configure K.A.S.H.' : 'Configure Quality Survey'}
          </DialogTitle>
          <DialogDescription>
            Link a global template to this module. Only templates matching the module category are shown.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground animate-pulse">Syncing Global Templates...</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">Global Template Registry</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="bg-muted/30 border-none h-12">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <div className="p-4 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No templates available in this category.</p>
                    </div>
                  ) : (
                    templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex flex-col">
                          <span className="font-semibold">{t.name}</span>
                          <span className="text-[10px] opacity-60">{t.questions.length} Questions</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateId && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">Template Connected</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Learners will be required to complete the questions defined in this template before they can progress past this module.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !selectedTemplateId} className="shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
