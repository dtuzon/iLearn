import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Star, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Brain,
  Heart,
  Settings,
  Zap
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { evaluationsApi, TemplateCategory, EvalQuestionType, KashDomain } from '../../api/evaluations.api';
import type { EvaluationTemplate } from '../../api/evaluations.api';

interface EvaluationPlayerProps {
  courseId: string;
  moduleId: string;
  templateId: string;
  onComplete: () => void;
}

export const EvaluationPlayer: React.FC<EvaluationPlayerProps> = ({
  courseId,
  templateId,
  onComplete
}) => {
  const [template, setTemplate] = useState<EvaluationTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    setIsLoading(true);
    try {
      const data = await evaluationsApi.getTemplateById(templateId);
      setTemplate(data);
      // Initialize answers
      const initialAnswers: Record<string, any> = {};
      data.questions.forEach((q: any) => {
        if (q.id) {
          initialAnswers[q.id] = q.type === EvalQuestionType.RATING_1_TO_5 ? undefined : '';
        }
      });
      setAnswers(initialAnswers);
    } catch (error) {
      toast.error('Failed to load evaluation template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const isAllAnswered = () => {
    if (!template) return false;
    return template.questions.every(q => {
      if (!q.id) return true;
      const answer = answers[q.id];
      if (q.type === EvalQuestionType.RATING_1_TO_5) return answer !== undefined;
      if (q.type === EvalQuestionType.YES_NO) return answer !== undefined && answer !== '';
      return typeof answer === 'string' && answer.trim() !== '';
    });
  };

  const handleSubmit = async () => {
    if (!isAllAnswered()) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await evaluationsApi.submitResponse({
        courseId,
        templateId,
        answers
      });
      toast.success('Evaluation submitted successfully');
      onComplete();
    } catch (error) {
      toast.error('Failed to submit evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getKashIcon = (domain: KashDomain) => {
    switch (domain) {
      case KashDomain.KNOWLEDGE: return <Brain className="h-4 w-4 text-blue-500" />;
      case KashDomain.ATTITUDE: return <Heart className="h-4 w-4 text-red-500" />;
      case KashDomain.SKILLS: return <Settings className="h-4 w-4 text-purple-500" />;
      case KashDomain.HABITS: return <Zap className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Initializing Unified Evaluation Engine...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
        <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="font-semibold">Template Not Linked</p>
        <p className="text-sm text-muted-foreground">This evaluation module has not been configured by the course creator.</p>
      </div>
    );
  }

  // Group questions by domain if KASH
  const groupedQuestions = template.category === TemplateCategory.KASH_EVALUATION
    ? Object.values(KashDomain).reduce((acc, domain) => {
        const domainQuestions = template.questions.filter(q => q.kashDomain === domain);
        if (domainQuestions.length > 0) acc[domain] = domainQuestions;
        return acc;
      }, {} as Record<string, any[]>)
    : { default: template.questions };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
          <ClipboardCheck className="h-3 w-3" /> Standardized Evaluation
        </div>
        <h3 className="text-3xl font-black italic uppercase tracking-tight">{template.name}</h3>
        {template.description && <p className="text-muted-foreground text-sm max-w-lg mx-auto">{template.description}</p>}
      </div>

      <div className="space-y-12">
        {Object.entries(groupedQuestions).map(([groupKey, groupQuestions]) => (
          <div key={groupKey} className="space-y-6">
            {template.category === TemplateCategory.KASH_EVALUATION && groupKey !== 'default' && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-muted-foreground/10" />
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/30 border border-muted-foreground/5">
                  {getKashIcon(groupKey as KashDomain)}
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{groupKey}</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-muted-foreground/10" />
              </div>
            )}

            <div className="space-y-6">
              {groupQuestions.map((q: any) => (
                <div key={q.id} className="group space-y-4 p-6 rounded-2xl bg-background border shadow-sm hover:shadow-md transition-all duration-300">
                  <Label className="text-lg font-bold leading-tight block">
                    {q.text}
                  </Label>

                  {q.type === EvalQuestionType.RATING_1_TO_5 && (
                    <div className="flex justify-between items-center gap-2 max-w-md">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleAnswerChange(q.id, num)}
                          className={cn(
                            "flex-1 flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all duration-200",
                            answers[q.id] === num 
                              ? "border-primary bg-primary/5 text-primary shadow-inner scale-105" 
                              : "border-muted-foreground/10 hover:bg-muted/50 text-muted-foreground hover:scale-105"
                          )}
                        >
                          <Star className={cn("h-5 w-5 mb-1", answers[q.id] === num ? "fill-primary" : "fill-transparent")} />
                          <span className="text-sm font-black">{num}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === EvalQuestionType.YES_NO && (
                    <RadioGroup 
                      value={answers[q.id]} 
                      onValueChange={(val) => handleAnswerChange(q.id, val)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="YES" id={`yes-${q.id}`} className="sr-only" />
                        <Label 
                          htmlFor={`yes-${q.id}`}
                          className={cn(
                            "px-6 py-2 rounded-full border-2 cursor-pointer font-bold transition-all",
                            answers[q.id] === 'YES' ? "border-success bg-success/10 text-success" : "border-muted-foreground/10 opacity-50"
                          )}
                        >
                          YES
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="NO" id={`no-${q.id}`} className="sr-only" />
                        <Label 
                          htmlFor={`no-${q.id}`}
                          className={cn(
                            "px-6 py-2 rounded-full border-2 cursor-pointer font-bold transition-all",
                            answers[q.id] === 'NO' ? "border-destructive bg-destructive/10 text-destructive" : "border-muted-foreground/10 opacity-50"
                          )}
                        >
                          NO
                        </Label>
                      </div>
                    </RadioGroup>
                  )}

                  {q.type === EvalQuestionType.TEXT_RESPONSE && (
                    <Textarea 
                      placeholder="Type your response here..."
                      className="min-h-[100px] bg-muted/20 border-none rounded-xl resize-none focus:ring-2 focus:ring-primary/20"
                      value={answers[q.id]}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-dashed">
        <Button 
          className="w-full h-14 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
          disabled={!isAllAnswered() || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <CheckCircle2 className="h-6 w-6 mr-2" />}
          Finalize Evaluation
        </Button>
        {!isAllAnswered() && (
          <p className="text-center text-[10px] text-muted-foreground font-bold mt-4 uppercase tracking-[0.1em] flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" /> Complete all criteria to proceed
          </p>
        )}
      </div>
    </div>
  );
};
