import React, { useState, useEffect } from 'react';
import { quizzesApi } from '../../api/quizzes.api';
import type { QuizQuestion } from '../../api/quizzes.api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Loader2, Plus, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent } from '../ui/card';

interface QuizBuilderProps {
  moduleId: string;
  moduleTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ moduleId, moduleTitle, isOpen, onClose }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New Question State
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

  useEffect(() => {
    if (isOpen && moduleId) {
      fetchQuestions();
    }
  }, [isOpen, moduleId]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
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
      await quizzesApi.addQuestion(moduleId, newQuestion);
      toast.success('Question added');
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
      toast.error(error.response?.data?.message || 'Failed to add question');
    } finally {
      setIsSaving(false);
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
        // Clear input
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
          <DialogTitle>Quiz Builder: {moduleTitle}</DialogTitle>
          <DialogDescription>Add and manage multiple choice questions for this quiz module.</DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="bulk">Bulk CSV Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 animate-in fade-in duration-300">
              {/* Add Question Form */}
              <form onSubmit={handleAddQuestion} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm">Add New Question</h3>
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

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add to Quiz
                </Button>
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
                      Upload a CSV file with questions and options to populate this quiz instantly.
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

                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Plus className="h-3 w-3" /> Important Note
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Ensure the <strong>Correct Answer (1-4)</strong> column contains only digits 1, 2, 3, or 4. Any rows with invalid data will be automatically skipped during processing.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Existing Questions List */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">Existing Questions ({questions.length})</h3>
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : questions.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No questions yet.</p>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">Q{idx + 1}: {q.questionText}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {q.options.map(opt => (
                        <div key={opt.id} className={`text-xs p-2 rounded ${opt.isCorrect ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-muted'}`}>
                          {opt.optionText}
                          {opt.isCorrect && <span className="ml-2 font-bold">(Correct)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
