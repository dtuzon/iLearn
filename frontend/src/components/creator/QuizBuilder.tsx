import React, { useState, useEffect } from 'react';
import { quizzesApi } from '../../api/quizzes.api';
import type { QuestionType } from '../../api/quizzes.api';
import { coursesApi } from '../../api/courses.api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Loader2, Plus, Trash2, Trash, AlertCircle, Check, X, Save, Pencil, ToggleLeft, List, BookOpen, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface QuizBuilderProps {
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

type DraftQuestion = {
  id: string;
  type: QuestionType;
  questionText: string;
  essayPrompt?: string;
  maxScore?: number | null;         // Essay only
  // Enumeration only
  enumCaseSensitive?: boolean;
  enumOrderMatters?: boolean;
  enumStrictPunctuation?: boolean;
  // MC / ENUMERATION
  options: { optionText: string; isCorrect: boolean }[];
  // TRUE_FALSE
  correctAnswer?: 'true' | 'false';
};

const TYPE_META: Record<QuestionType, { label: string; icon: React.ReactNode; color: string }> = {
  MULTIPLE_CHOICE: { label: 'Multiple Choice', icon: <CheckSquare className="h-4 w-4" />, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
  TRUE_FALSE:      { label: 'True / False',    icon: <ToggleLeft  className="h-4 w-4" />, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  ENUMERATION:     { label: 'Enumeration',      icon: <List        className="h-4 w-4" />, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  ESSAY:           { label: 'Essay',            icon: <BookOpen    className="h-4 w-4" />, color: 'bg-rose-500/10 text-rose-600 border-rose-200' },
};

function emptyDraft(type: QuestionType): DraftQuestion {
  const id = `temp-${Date.now()}-${Math.random()}`;
  if (type === 'MULTIPLE_CHOICE') return { id, type, questionText: '', options: [{ optionText: '', isCorrect: true }, { optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }, { optionText: '', isCorrect: false }] };
  if (type === 'TRUE_FALSE')      return { id, type, questionText: '', options: [], correctAnswer: 'true' };
  if (type === 'ENUMERATION')     return { id, type, questionText: '', options: [{ optionText: '', isCorrect: true }], enumCaseSensitive: false, enumOrderMatters: false, enumStrictPunctuation: false };
  return { id, type, questionText: '', essayPrompt: '', maxScore: null, options: [] };
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ courseId, moduleId, moduleTitle, isOpen, onClose }) => {
  const [questions, setQuestions]   = useState<DraftQuestion[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [activeTab, setActiveTab]   = useState('manual');
  const [settings, setSettings]     = useState({ shuffleQuestions: false, shuffleOptions: false });
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editDraft, setEditDraft]   = useState<DraftQuestion | null>(null);
  const [newQ, setNewQ]             = useState<DraftQuestion>(emptyDraft('MULTIPLE_CHOICE'));

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !moduleId) return;
    (async () => {
      setIsLoading(true);
      try {
        const [qs, mod] = await Promise.all([
          quizzesApi.getModuleQuestions(moduleId),
          fetch(`/api/courses/modules/${moduleId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
        ]);
        setQuestions(qs as DraftQuestion[]);
        setSettings({ shuffleQuestions: mod.shuffleQuestions || false, shuffleOptions: mod.shuffleOptions || false });
      } catch { toast.error('Failed to load quiz'); }
      finally { setIsLoading(false); }
    })();
  }, [isOpen, moduleId]);

  // ── Add to local pool ─────────────────────────────────────────────────────
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.questionText.trim()) return toast.error('Question text is required');
    if (newQ.type === 'MULTIPLE_CHOICE' && newQ.options.some(o => !o.optionText.trim())) return toast.error('Fill all 4 options');
    if (newQ.type === 'ENUMERATION' && newQ.options.some(o => !o.optionText.trim())) return toast.error('Fill all enumeration answers');
    setQuestions(prev => [...prev, { ...newQ, id: `temp-${Date.now()}` }]);
    setNewQ(emptyDraft(newQ.type));
    toast.success('Question added');
  };

  // ── Inline edit helpers ───────────────────────────────────────────────────
  const startEdit  = (q: DraftQuestion) => { setEditingId(q.id); setEditDraft({ ...q, options: q.options.map(o => ({ ...o })) }); };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const confirmEdit = () => {
    if (!editDraft) return;
    if (!editDraft.questionText.trim()) return toast.error('Question text is required');
    setQuestions(prev => prev.map(q => q.id === editingId ? { ...editDraft } : q));
    cancelEdit();
    toast.success('Question updated');
  };

  // ── Save all ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await quizzesApi.syncQuiz(moduleId, questions as any);
      toast.success('Quiz saved!');
      onClose();
    } catch { toast.error('Failed to save quiz'); }
    finally { setIsSaving(false); }
  };

  const updateSetting = async (field: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    try { await coursesApi.updateModule(courseId, moduleId, { [field]: value }); toast.success('Setting updated'); }
    catch { toast.error('Failed to update setting'); }
  };

  // ── Per-type form renderers ───────────────────────────────────────────────
  const renderForm = (draft: DraftQuestion, setDraft: (d: DraftQuestion) => void, isEdit = false) => (
    <div className="space-y-4">
      {/* Type selector */}
      {!isEdit && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(TYPE_META) as QuestionType[]).map(t => (
            <button
              key={t} type="button"
              onClick={() => setDraft(emptyDraft(t))}
              className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-bold transition-all', draft.type === t ? 'border-primary bg-primary/5 shadow-sm' : 'border-muted-foreground/10 hover:border-primary/40')}
            >
              {TYPE_META[t].icon}
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
      )}

      {/* Question text */}
      <div>
        <Label className="text-xs">Question Text</Label>
        <Input
          placeholder="Enter question..."
          value={draft.questionText}
          onChange={e => setDraft({ ...draft, questionText: e.target.value })}
          className="mt-1 bg-background border-primary/10"
        />
      </div>

      {/* MULTIPLE CHOICE */}
      {draft.type === 'MULTIPLE_CHOICE' && (
        <div className="space-y-2">
          <Label className="text-xs">Options — select the correct one</Label>
          <RadioGroup
            value={draft.options.findIndex(o => o.isCorrect).toString()}
            onValueChange={val => setDraft({ ...draft, options: draft.options.map((o, i) => ({ ...o, isCorrect: i === +val })) })}
            className="grid grid-cols-1 md:grid-cols-2 gap-2"
          >
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 bg-background p-2 rounded-xl border border-primary/5">
                <RadioGroupItem value={i.toString()} id={`opt-${i}-${draft.id}`} />
                <Input placeholder={`Option ${i + 1}`} value={opt.optionText}
                  onChange={e => { const opts = [...draft.options]; opts[i].optionText = e.target.value; setDraft({ ...draft, options: opts }); }}
                  className="h-8 text-sm border-none focus-visible:ring-0 p-0" />
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* TRUE / FALSE */}
      {draft.type === 'TRUE_FALSE' && (
        <div className="space-y-2">
          <Label className="text-xs">Correct Answer</Label>
          <RadioGroup
            value={draft.correctAnswer || 'true'}
            onValueChange={val => setDraft({ ...draft, correctAnswer: val as 'true' | 'false' })}
            className="flex gap-4"
          >
            {['true', 'false'].map(v => (
              <div key={v} className={cn('flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer flex-1 justify-center font-bold', draft.correctAnswer === v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-muted-foreground/10')}>
                <RadioGroupItem value={v} id={`tf-${v}-${draft.id}`} />
                <Label htmlFor={`tf-${v}-${draft.id}`} className="cursor-pointer capitalize font-bold">{v === 'true' ? 'True ✓' : 'False ✗'}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* ENUMERATION */}
      {draft.type === 'ENUMERATION' && (
        <div className="space-y-2">
          <Label className="text-xs">Correct Answers (one per row — order doesn't matter)</Label>
          <div className="space-y-2">
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-center font-mono">{i + 1}.</span>
                <Input placeholder={`Answer ${i + 1}`} value={opt.optionText}
                  onChange={e => { const opts = [...draft.options]; opts[i].optionText = e.target.value; setDraft({ ...draft, options: opts }); }}
                  className="h-9 text-sm border-primary/10" />
                {draft.options.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive"
                    onClick={() => setDraft({ ...draft, options: draft.options.filter((_, idx) => idx !== i) })}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full h-9 border-dashed text-xs"
              onClick={() => setDraft({ ...draft, options: [...draft.options, { optionText: '', isCorrect: true }] })}>
              <Plus className="h-3 w-3 mr-2" /> Add Answer
            </Button>
          </div>

          {/* Enumeration Grading Settings */}
          <div className="mt-4 p-4 border rounded-xl bg-amber-500/5 space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-amber-700/70">Grading Strictness</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-amber-900">Case Sensitive</Label>
                  <p className="text-[10px] text-amber-900/60 leading-tight">Must match uppercase/lowercase exactly.</p>
                </div>
                <Switch 
                  checked={!!draft.enumCaseSensitive} 
                  onCheckedChange={val => setDraft({ ...draft, enumCaseSensitive: val })} 
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-amber-900">Order Matters</Label>
                  <p className="text-[10px] text-amber-900/60 leading-tight">Must be entered in the exact sequence above.</p>
                </div>
                <Switch 
                  checked={!!draft.enumOrderMatters} 
                  onCheckedChange={val => setDraft({ ...draft, enumOrderMatters: val })} 
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-amber-900">Strict Punctuation</Label>
                  <p className="text-[10px] text-amber-900/60 leading-tight">Do not ignore symbols and spaces.</p>
                </div>
                <Switch 
                  checked={!!draft.enumStrictPunctuation} 
                  onCheckedChange={val => setDraft({ ...draft, enumStrictPunctuation: val })} 
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ESSAY */}
      {draft.type === 'ESSAY' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
            <BookOpen className="h-4 w-4 text-rose-500 shrink-0" />
            <p className="text-xs text-rose-700 font-medium">Essay answers are submitted to checkers for manual grading. They do not affect the auto-graded score.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Rubric / Prompt for Learner (optional)</Label>
              <Textarea placeholder="e.g., Explain in 3-5 sentences..." value={draft.essayPrompt || ''}
                onChange={e => setDraft({ ...draft, essayPrompt: e.target.value })}
                className="text-sm border-primary/10 resize-none mt-1" rows={3} />
            </div>
            <div>
              <Label className="text-xs">Max Score (points)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 5"
                  value={draft.maxScore ?? ''}
                  onChange={e => setDraft({ ...draft, maxScore: e.target.value ? Number(e.target.value) : null })}
                  className="h-10 border-primary/10 text-sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">pts</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Checker grades 0 – max score</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Question card (read mode) ─────────────────────────────────────────────
  const renderReadCard = (q: DraftQuestion, idx: number) => {
    const meta = TYPE_META[q.type];
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-4">
          <span className="font-bold text-base leading-snug">
            <span className="text-primary/30 font-mono mr-2">#{idx + 1}</span>{q.questionText}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-xl" onClick={() => startEdit(q)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        <Badge variant="outline" className={cn('text-[10px] font-bold gap-1', meta.color)}>{meta.icon}{meta.label}</Badge>

        {(q.type === 'MULTIPLE_CHOICE') && (
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((o, i) => (
              <div key={i} className={cn('text-xs p-3 rounded-xl border flex items-center justify-between', o.isCorrect ? 'bg-primary/5 border-primary/30 text-primary font-bold ring-1 ring-primary/20' : 'bg-muted/10 border-transparent text-muted-foreground')}>
                <div className="flex items-center gap-2"><span className="opacity-30 font-mono">{String.fromCharCode(65 + i)}</span>{o.optionText}</div>
                {o.isCorrect && <Check className="h-3 w-3 shrink-0" />}
              </div>
            ))}
          </div>
        )}

        {q.type === 'TRUE_FALSE' && (
          <div className="flex gap-2">
            {['True', 'False'].map(v => {
              const isCorrect = (q.correctAnswer === 'true' && v === 'True') || (q.correctAnswer === 'false' && v === 'False');
              return (
                <div key={v} className={cn('text-xs px-4 py-2 rounded-xl border flex items-center gap-2 font-bold', isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-muted/10 border-transparent text-muted-foreground')}>
                  {v}{isCorrect && <Check className="h-3 w-3" />}
                </div>
              );
            })}
          </div>
        )}

        {q.type === 'ENUMERATION' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {q.options.map((o, i) => (
                <span key={i} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full font-medium">{i + 1}. {o.optionText}</span>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", q.enumCaseSensitive ? "border-amber-400 text-amber-700 bg-amber-50" : "text-muted-foreground opacity-50")}>
                Case Sensitive
              </Badge>
              <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", q.enumOrderMatters ? "border-amber-400 text-amber-700 bg-amber-50" : "text-muted-foreground opacity-50")}>
                Strict Order
              </Badge>
              <Badge variant="outline" className={cn("text-[9px] font-bold uppercase", q.enumStrictPunctuation ? "border-amber-400 text-amber-700 bg-amber-50" : "text-muted-foreground opacity-50")}>
                Strict Punctuation
              </Badge>
            </div>
          </div>
        )}

        {q.type === 'ESSAY' && (
          <div className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-xl border border-dashed space-y-1">
            <p>{q.essayPrompt ? `Prompt: "${q.essayPrompt}"` : 'Open-ended — no rubric set'}</p>
            {q.maxScore != null && (
              <p className="font-semibold text-rose-600 not-italic">Max Score: {q.maxScore} pts</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Quiz Builder: {moduleTitle}</DialogTitle>
              <DialogDescription>Changes are local until you hit "Save Quiz".</DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs">{questions.length} Questions</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="manual">Add Question</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <form onSubmit={handleAdd} className="space-y-4 p-5 border rounded-2xl bg-muted/20 border-primary/10">
                <h3 className="font-bold text-xs uppercase tracking-widest text-primary">New Question</h3>
                {renderForm(newQ, setNewQ)}
                <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" /> Add to Pool
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="settings">
              <div className="grid gap-4">
                {[['shuffleQuestions', 'Shuffle Questions', 'Random order for every learner.'], ['shuffleOptions', 'Shuffle Options', 'Random A/B/C/D order (MC only).']].map(([field, label, desc]) => (
                  <div key={field} className="flex items-center justify-between p-5 border rounded-2xl bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div><Label className="text-base font-bold">{label}</Label><p className="text-sm text-muted-foreground">{desc}</p></div>
                    <Switch checked={(settings as any)[field]} onCheckedChange={val => updateSetting(field, val)} />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Question Pool */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black tracking-tight">Question Pool</h3>
                <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none">{questions.length}</Badge>
              </div>
              {questions.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => { if (window.confirm('Clear all?')) { setQuestions([]); } }} className="text-destructive hover:bg-destructive/10">
                  <Trash className="h-3.5 w-3.5 mr-2" /> Clear Pool
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-40" />
                <p className="text-sm text-muted-foreground">Loading questions...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/5 border-muted-foreground/10">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h4 className="text-xl font-bold text-muted-foreground/60">Quiz is empty</h4>
                <p className="text-sm text-muted-foreground/50 max-w-xs mx-auto mt-2">Use the form above to add questions.</p>
              </div>
            ) : (
              <div className="space-y-4 pb-20">
                {questions.map((q, idx) => (
                  <div key={q.id} className={cn('group p-5 rounded-2xl border transition-all duration-300', editingId === q.id ? 'border-primary ring-2 ring-primary/20 bg-background shadow-2xl scale-[1.01]' : 'border-muted-foreground/10 bg-muted/5 hover:border-primary/30 hover:bg-background')}>
                    {editingId === q.id && editDraft ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-primary/10 text-primary border-none font-bold">EDITING</Badge>
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                            <Button size="icon" variant="default" onClick={confirmEdit} className="h-8 w-8"><Check className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        {renderForm(editDraft, setEditDraft, true)}
                      </div>
                    ) : (
                      renderReadCard(q, idx)
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/10 border-t flex flex-row items-center justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Discard</Button>
          <Button className="h-11 px-8 font-bold shadow-xl shadow-primary/20" onClick={handleSave} disabled={isSaving || isLoading || questions.length === 0}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Quiz</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
