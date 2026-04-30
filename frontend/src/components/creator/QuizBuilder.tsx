import React, { useState, useEffect } from 'react';
import { quizzesApi } from '../../api/quizzes.api';
import { coursesApi } from '../../api/courses.api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Loader2, Plus, Download, FileSpreadsheet, Pencil, Trash2, Trash, AlertCircle, Check, X, Save } from 'lucide-react';

import { toast } from 'sonner';
import Papa from 'papaparse';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';

interface QuizBuilderProps {
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ courseId, moduleId, moduleTitle, isOpen, onClose }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  
  // Settings state
  const [settings, setSettings] = useState({
    shuffleQuestions: false,
    shuffleOptions: false
  });

  // Inline Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<any>(null);

  // New Question State (for the top form)
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    options: [
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
    ]
  });

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const data = await quizzesApi.getModuleQuestions(moduleId);
      setQuestions(data);
    } catch (error) {
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/courses/modules/${moduleId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setSettings({
        shuffleQuestions: data.shuffleQuestions || false,
        shuffleOptions: data.shuffleOptions || false
      });
    } catch (err) {
      console.error('Failed to fetch module settings');
    }
  };

  useEffect(() => {
    if (isOpen && moduleId) {
      fetchQuestions();
      fetchSettings();
    }
  }, [isOpen, moduleId]);

  // LOCAL ACTIONS
  const handleAddLocalQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.questionText) return toast.error('Question text is required');
    if (newQuestion.options.some(opt => !opt.optionText)) return toast.error('All 4 options must have text');

    const tempId = `temp-${Date.now()}`;
    setQuestions([...questions, { ...newQuestion, id: tempId }]);
    setNewQuestion({
      questionText: '',
      options: [
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
        { optionText: '', isCorrect: false },
      ]
    });
    toast.success('Question added to list');
  };

  const handleStartEdit = (q: any) => {
    setEditingId(q.id);
    setEditDraft({
      questionText: q.questionText,
      options: q.options.map((o: any) => ({ optionText: o.optionText, isCorrect: o.isCorrect }))
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const handleConfirmEdit = () => {
    if (!editDraft.questionText) return toast.error('Question text is required');
    if (editDraft.options.some((o: any) => !o.optionText)) return toast.error('All options must have text');

    setQuestions(questions.map(q => q.id === editingId ? { ...q, ...editDraft } : q));
    setEditingId(null);
    setEditDraft(null);
    toast.success('Question updated locally');
  };

  const handleDeleteLocal = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    toast.info('Question removed');
  };

  const handleClearAllLocal = () => {
    if (!window.confirm('Wipe all questions from this session?')) return;
    setQuestions([]);
    toast.info('All questions removed');
  };

  // MASTER SAVE
  const handleSaveQuiz = async () => {
    setIsSaving(true);
    try {
      // Prepare questions (remove temp IDs if any)
      const sanitizedQuestions = questions.map(q => ({
        questionText: q.questionText,
        options: q.options.map((o: any) => ({
          optionText: o.optionText,
          isCorrect: o.isCorrect
        }))
      }));

      await quizzesApi.syncQuiz(moduleId, sanitizedQuestions);
      toast.success('Quiz persisted to database!');
      onClose();
    } catch (err) {
      toast.error('Failed to save quiz');
    } finally {
      setIsSaving(false);
    }
  };

  // CSV UPLOAD (LOCAL)
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        const newBatch: any[] = [];
        let skipCount = 0;

        for (const row of rows) {
          const questionText = row["Question"];
          const opt1 = row["Option 1"];
          const opt2 = row["Option 2"];
          const opt3 = row["Option 3"];
          const opt4 = row["Option 4"];
          const correctIndex = parseInt(row["Correct Answer (1-4)"]) - 1;

          if (!questionText || !opt1 || !opt2 || !opt3 || !opt4 || isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
            skipCount++;
            continue;
          }

          newBatch.push({
            id: `csv-${Date.now()}-${Math.random()}`,
            questionText,
            options: [
              { optionText: opt1, isCorrect: correctIndex === 0 },
              { optionText: opt2, isCorrect: correctIndex === 1 },
              { optionText: opt3, isCorrect: correctIndex === 2 },
              { optionText: opt4, isCorrect: correctIndex === 3 },
            ]
          });
        }

        setQuestions([...questions, ...newBatch]);
        toast.success(`Imported ${newBatch.length} questions locally!${skipCount > 0 ? ` (${skipCount} skipped)` : ''}`);
        e.target.value = '';
      }
    });
  };

  const updateSetting = async (field: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    try {
      await coursesApi.updateModule(courseId, moduleId, { [field]: value });
      toast.success('Setting updated');
    } catch (err) {
      toast.error('Failed to update setting');
    }
  };

  const updateNewOption = (index: number, text: string) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index].optionText = text;
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  const setNewCorrectOption = (index: number) => {
    const updatedOptions = newQuestion.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }));
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  // Inline edit helpers
  const updateDraftOption = (index: number, text: string) => {
    const updatedOptions = [...editDraft.options];
    updatedOptions[index].optionText = text;
    setEditDraft({ ...editDraft, options: updatedOptions });
  };

  const setDraftCorrectOption = (index: number) => {
    const updatedOptions = editDraft.options.map((opt: any, i: number) => ({
      ...opt,
      isCorrect: i === index
    }));
    setEditDraft({ ...editDraft, options: updatedOptions });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Quiz Builder: {moduleTitle}</DialogTitle>
              <DialogDescription>All changes are local until you hit "Save Quiz".</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {questions.length} Questions
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="manual">Add Question</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <form onSubmit={handleAddLocalQuestion} className="space-y-4 p-5 border rounded-2xl bg-muted/20 border-primary/10">
                <h3 className="font-bold text-xs uppercase tracking-widest text-primary">New Question</h3>
                <div className="space-y-2">
                  <Label htmlFor="q-text" className="text-xs">Question Text</Label>
                  <Input 
                    id="q-text" 
                    placeholder="Enter question here..." 
                    value={newQuestion.questionText}
                    onChange={(e) => setNewQuestion({...newQuestion, questionText: e.target.value})}
                    className="bg-background border-primary/10 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs">Options (Select the correct one)</Label>
                  <RadioGroup 
                    value={newQuestion.options.findIndex(o => o.isCorrect).toString()}
                    onValueChange={(val) => setNewCorrectOption(parseInt(val))}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                  >
                    {newQuestion.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3 bg-background p-2 rounded-xl border border-primary/5">
                        <RadioGroupItem value={i.toString()} id={`new-opt-${i}`} />
                        <Input 
                          placeholder={`Option ${i + 1}`} 
                          value={opt.optionText}
                          onChange={(e) => updateNewOption(i, e.target.value)}
                          className="h-8 text-sm border-none focus-visible:ring-0 p-0"
                        />
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" /> Add to List
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <Card className="border-dashed border-2 bg-muted/5 rounded-2xl">
                <CardContent className="pt-8 pb-8 space-y-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-2">
                      <FileSpreadsheet className="h-8 w-8" />
                    </div>
                    <h3 className="font-bold text-xl">CSV Batch Import</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Upload your spreadsheet to instantly populate the question list below.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button variant="outline" onClick={() => {
                        const headers = "Question,Option 1,Option 2,Option 3,Option 4,Correct Answer (1-4)\n";
                        const blob = new Blob([headers], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'quiz_template.csv';
                        a.click();
                      }} 
                      className="h-12 border-primary/20 hover:bg-primary/5"
                    >
                      <Download className="mr-2 h-4 w-4" /> Download Template
                    </Button>
                    
                    <div className="relative">
                      <Input 
                        type="file" 
                        accept=".csv"
                        onChange={handleCSVUpload}
                        className="h-12 pt-2.5 cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-5 border rounded-2xl bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="space-y-1">
                    <Label className="text-base font-bold">Shuffle Questions</Label>
                    <p className="text-sm text-muted-foreground">Random order for every user.</p>
                  </div>
                  <Switch 
                    checked={settings.shuffleQuestions} 
                    onCheckedChange={(val) => updateSetting('shuffleQuestions', val)}
                  />
                </div>
                <div className="flex items-center justify-between p-5 border rounded-2xl bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="space-y-1">
                    <Label className="text-base font-bold">Shuffle Options</Label>
                    <p className="text-sm text-muted-foreground">Random A/B/C/D order.</p>
                  </div>
                  <Switch 
                    checked={settings.shuffleOptions} 
                    onCheckedChange={(val) => updateSetting('shuffleOptions', val)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Existing Questions List */}
          <div className="space-y-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black tracking-tight">Question Pool</h3>
                <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none">
                  {questions.length} items
                </Badge>
              </div>
              {questions.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearAllLocal} className="text-destructive hover:bg-destructive/10">
                  <Trash className="h-3.5 w-3.5 mr-2" /> Clear Pool
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-40" />
                <p className="text-sm font-medium text-muted-foreground">Syncing pool...</p>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/5 border-muted-foreground/10">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h4 className="text-xl font-bold text-muted-foreground/60">Your quiz is empty</h4>
                <p className="text-sm text-muted-foreground/50 max-w-[240px] mx-auto mt-2">
                  Use the tabs above to populate your quiz pool.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pb-20">
                {questions.map((q, idx) => (
                  <div key={q.id} className={`group p-6 rounded-2xl border transition-all duration-300 ${
                    editingId === q.id 
                      ? 'border-primary ring-2 ring-primary/20 bg-background shadow-2xl scale-[1.02] z-10' 
                      : 'border-muted-foreground/10 bg-muted/5 hover:border-primary/30 hover:bg-background'
                  }`}>
                    {editingId === q.id ? (
                      // EDIT MODE
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-primary/10 text-primary border-none font-bold">INLINE EDITING</Badge>
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 text-muted-foreground hover:bg-muted">
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="default" onClick={handleConfirmEdit} className="h-8 w-8 bg-primary text-white shadow-lg shadow-primary/20">
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Input 
                          value={editDraft.questionText}
                          onChange={(e) => setEditDraft({...editDraft, questionText: e.target.value})}
                          className="text-lg font-bold h-12 focus-visible:ring-primary"
                        />
                        <RadioGroup 
                          value={editDraft.options.findIndex((o: any) => o.isCorrect).toString()}
                          onValueChange={(val) => setDraftCorrectOption(parseInt(val))}
                          className="grid grid-cols-1 md:grid-cols-2 gap-3"
                        >
                          {editDraft.options.map((opt: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 border rounded-xl focus-within:border-primary transition-colors">
                              <RadioGroupItem value={i.toString()} id={`edit-opt-${i}`} />
                              <Input 
                                value={opt.optionText}
                                onChange={(e) => updateDraftOption(i, e.target.value)}
                                className="h-8 text-sm border-none focus-visible:ring-0 p-0"
                              />
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    ) : (
                      // READ MODE
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <span className="font-bold text-lg tracking-tight leading-tight">
                            <span className="text-primary/40 mr-2 font-mono">#{idx + 1}</span>
                            {q.questionText}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-xl" onClick={() => handleStartEdit(q)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDeleteLocal(q.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((opt: any, oIdx: number) => (
                            <div 
                              key={oIdx} 
                              className={`text-xs p-4 rounded-xl border flex items-center justify-between transition-all ${
                                opt.isCorrect 
                                  ? 'bg-primary/5 border-primary/30 text-primary font-black ring-1 ring-primary/20' 
                                  : 'bg-muted/10 border-transparent text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="opacity-30 font-mono text-[10px]">{String.fromCharCode(65 + oIdx)}</span>
                                {opt.optionText}
                              </div>
                              {opt.isCorrect && <Check className="h-3 w-3" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="p-6 bg-muted/10 border-t flex flex-row items-center justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Discard Changes</Button>
          <div className="flex items-center gap-3">
            <Button 
              className="h-11 px-8 bg-primary hover:bg-primary/90 text-white font-bold shadow-xl shadow-primary/20"
              onClick={handleSaveQuiz}
              disabled={isSaving || isLoading || questions.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Persisting...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Quiz
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
