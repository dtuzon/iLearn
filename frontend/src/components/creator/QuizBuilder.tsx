import React, { useState, useEffect } from 'react';
import { quizzesApi } from '../../api/quizzes.api';
import type { QuizQuestion } from '../../api/quizzes.api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quiz Builder: {moduleTitle}</DialogTitle>
          <DialogDescription>Add and manage multiple choice questions for this quiz module.</DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
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
                        <div key={opt.id} className={`text-xs p-2 rounded ${opt.isCorrect ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-muted'}`}>
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
