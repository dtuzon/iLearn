import React, { useState, useEffect } from 'react';
import { quizzesApi } from '../../api/quizzes.api';
import { coursesApi } from '../../api/courses.api';
import type { QuizQuestion } from '../../api/quizzes.api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Loader2, Plus, Download, FileSpreadsheet, Pencil, Trash2, Settings as SettingsIcon, Trash, AlertCircle } from 'lucide-react';
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
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  
  // Settings state
  const [settings, setSettings] = useState({
    shuffleQuestions: false,
    shuffleOptions: false
  });

  // Edit state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // New/Editing Question State
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

  const handleAddOrUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuestion.questionText) {
      toast.error('Question text is required');
      return;
    }
    if (newQuestion.options.some(opt => !opt.optionText)) {
      toast.error('All 4 options must have text');
      return;
    }

    setIsSaving(true);
    try {
      if (editingQuestionId) {
        await quizzesApi.updateQuestion(editingQuestionId, newQuestion);
        toast.success('Question updated');
        setEditingQuestionId(null);
      } else {
        await quizzesApi.addQuestion(moduleId, newQuestion);
        toast.success('Question added');
      }
      
      setNewQuestion({
        questionText: '',
        options: [
          { optionText: '', isCorrect: true },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
          { optionText: '', isCorrect: false },
        ]
      });
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (q: QuizQuestion) => {
    setEditingQuestionId(q.id);
    setNewQuestion({
      questionText: q.questionText,
      options: q.options.map(o => ({ optionText: o.optionText, isCorrect: o.isCorrect }))
    });
    setActiveTab('manual');
  };

  const handleDelete = async (questionId: string) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await quizzesApi.deleteQuestion(questionId);
      toast.success('Question deleted');
      fetchQuestions();
    } catch (err) {
      toast.error('Failed to delete question');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('CRITICAL: This will wipe ALL questions in this quiz. Proceed?')) return;
    try {
      await quizzesApi.clearQuestions(moduleId);
      toast.success('Quiz cleared');
      fetchQuestions();
    } catch (err) {
      toast.error('Failed to clear quiz');
    }
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

  const updateOption = (index: number, text: string) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[index].optionText = text;
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  const setCorrectOption = (index: number) => {
    const updatedOptions = newQuestion.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }));
    setNewQuestion({ ...newQuestion, options: updatedOptions });
  };

  const handleDownloadTemplate = () => {
    const headers = "Question,Option 1,Option 2,Option 3,Option 4,Correct Answer (1-4)\n";
    const sampleRow1 = '"What is the core value of Standard Insurance?","Integrity","Laziness","Apathy","Greed","1"\n';
    const sampleRow2 = '"Which department handles claims?","HR","IT","Claims","Sales","3"';
    const csvContent = headers + sampleRow1 + sampleRow2;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'quiz_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const questionsToImport: any[] = [];
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

          questionsToImport.push({
            questionText,
            options: [
              { optionText: opt1, isCorrect: correctIndex === 0 },
              { optionText: opt2, isCorrect: correctIndex === 1 },
              { optionText: opt3, isCorrect: correctIndex === 2 },
              { optionText: opt4, isCorrect: correctIndex === 3 },
            ]
          });
        }

        if (questionsToImport.length > 0) {
          try {
            await quizzesApi.addQuestions(moduleId, questionsToImport);
            toast.success(`Successfully imported ${questionsToImport.length} questions!${skipCount > 0 ? ` (${skipCount} skipped)` : ''}`);
            fetchQuestions();
          } catch (err) {
            toast.error("Failed to import questions. Please check your CSV format.");
          }
        } else if (skipCount > 0) {
          toast.warning("No valid questions found in CSV.");
        }

        setIsSaving(false);
        e.target.value = '';
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setIsSaving(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Quiz Builder: {moduleTitle}</DialogTitle>
              <DialogDescription>Add and manage multiple choice questions for this quiz module.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <SettingsIcon className="h-3 w-3" /> Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 animate-in fade-in duration-300">
              <form onSubmit={handleAddOrUpdateQuestion} className="space-y-4 p-4 border rounded-lg bg-muted/30 relative">
                {editingQuestionId && (
                  <Badge className="absolute -top-2 -right-2 px-3 py-1 shadow-md" variant="default">
                    EDITING MODE
                  </Badge>
                )}
                <h3 className="font-semibold text-sm">{editingQuestionId ? 'Update Question' : 'Add New Question'}</h3>
                <div className="space-y-2">
                  <Label htmlFor="q-text">Question Text</Label>
                  <Input 
                    id="q-text" 
                    placeholder="Enter question here..." 
                    value={newQuestion.questionText}
                    onChange={(e) => setNewQuestion({...newQuestion, questionText: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Options (Select the correct one)</Label>
                  <RadioGroup 
                    value={newQuestion.options.findIndex(o => o.isCorrect).toString()}
                    onValueChange={(val) => setCorrectOption(parseInt(val))}
                  >
                    {newQuestion.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <RadioGroupItem value={i.toString()} id={`opt-${i}`} />
                        <Input 
                          placeholder={`Option ${i + 1}`} 
                          value={opt.optionText}
                          onChange={(e) => updateOption(i, e.target.value)}
                        />
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="flex gap-2">
                  {editingQuestionId && (
                    <Button type="button" variant="outline" className="flex-1" onClick={() => {
                      setEditingQuestionId(null);
                      setNewQuestion({
                        questionText: '',
                        options: Array(4).fill(0).map((_, i) => ({ optionText: '', isCorrect: i === 0 }))
                      });
                    }}>
                      Cancel Edit
                    </Button>
                  )}
                  <Button type="submit" className={editingQuestionId ? 'flex-[2]' : 'w-full'} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {editingQuestionId ? 'Update Question' : 'Add to Quiz'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4 animate-in fade-in duration-300">
              <Card className="border-dashed border-2 bg-muted/5">
                <CardContent className="pt-6 space-y-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-lg">Bulk Import Questions</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Upload a CSV file to populate this quiz instantly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <Button variant="outline" onClick={handleDownloadTemplate} className="w-full h-11 border-primary/20">
                      <Download className="mr-2 h-4 w-4" /> Download CSV Template
                    </Button>
                    
                    <div className="space-y-2">
                      <Label htmlFor="csv-upload" className="text-xs font-bold uppercase text-muted-foreground">Upload Filled Template</Label>
                      <div className="relative">
                        <Input 
                          id="csv-upload" 
                          type="file" 
                          accept=".csv"
                          onChange={handleCSVUpload}
                          disabled={isSaving}
                          className="h-12 pt-2.5 cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        {isSaving && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                            <span className="text-sm font-medium">Processing Batch...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                  <div className="space-y-1">
                    <Label className="text-base font-bold">Shuffle Questions Order</Label>
                    <p className="text-sm text-muted-foreground">Randomizes the sequence of questions for every learner.</p>
                  </div>
                  <Switch 
                    checked={settings.shuffleQuestions} 
                    onCheckedChange={(val) => updateSetting('shuffleQuestions', val)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                  <div className="space-y-1">
                    <Label className="text-base font-bold">Shuffle Options Order</Label>
                    <p className="text-sm text-muted-foreground">Randomizes the A/B/C/D order within each question.</p>
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
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold flex items-center gap-2">
                Existing Questions 
                <Badge variant="secondary" className="rounded-full px-2">{questions.length}</Badge>
              </h3>
              {questions.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                  onClick={handleClearAll}
                >
                  <Trash className="h-3.5 w-3.5" /> Clear All
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-20" /></div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/5">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground text-sm font-medium">No questions in this quiz yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 border rounded-xl space-y-3 bg-background shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start gap-4">
                      <span className="font-bold text-sm leading-tight">
                        <span className="text-primary mr-2 font-mono">{idx + 1}.</span>
                        {q.questionText}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleEdit(q)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(q.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {q.options.map((opt, oIdx) => (
                        <div 
                          key={opt.id} 
                          className={`text-xs p-3 rounded-lg border flex items-center justify-between ${
                            opt.isCorrect 
                              ? 'bg-primary/5 border-primary/20 text-primary font-bold shadow-sm' 
                              : 'bg-muted/30 border-transparent text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="opacity-40 font-mono">{String.fromCharCode(65 + oIdx)}.</span>
                            {opt.optionText}
                          </div>
                          {opt.isCorrect && <Badge variant="default" className="h-4 px-1 text-[8px] bg-primary">CORRECT</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="bg-muted/20 -mx-6 -mb-6 p-4 mt-4">
          <Button variant="outline" onClick={onClose} className="w-full md:w-auto">Finish & Close Builder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
