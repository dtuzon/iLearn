import React, { useState, useEffect } from 'react';
import { evaluationsApi } from '../../api/evaluations.api';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Loader2, ClipboardCheck, ArrowRight, UserCheck, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const KASH_MODULES = [
  "Company Orientation",
  "Work Attitude and Values Enhancement",
  "Customer Experience",
  "Product Orientation",
  "Regulatory Compliance"
];

export const TeamEvaluations: React.FC = () => {
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [moduleRatings, setModuleRatings] = useState<Record<string, { before: number, after: number, explanation: string }>>(
    KASH_MODULES.reduce((acc, mod) => ({
      ...acc,
      [mod]: { before: 0, after: 0, explanation: '' }
    }), {})
  );
  const [overallImpact, setOverallImpact] = useState('');

  const fetchPending = async () => {
    setIsLoading(true);
    try {
      const data = await evaluationsApi.getPendingTeam();
      setPendingEvaluations(data);
    } catch (error) {
      toast.error('Failed to load pending evaluations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const openEvaluation = (evalItem: any) => {
    setSelectedEvaluation(evalItem);
    setModuleRatings(
      KASH_MODULES.reduce((acc, mod) => ({
        ...acc,
        [mod]: { before: 0, after: 0, explanation: '' }
      }), {})
    );
    setOverallImpact('');
    setIsEvalModalOpen(true);
  };

  const handleRatingChange = (module: string, type: 'before' | 'after', value: string) => {
    setModuleRatings(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [type]: parseInt(value)
      }
    }));
  };

  const handleExplanationChange = (module: string, value: string) => {
    setModuleRatings(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        explanation: value
      }
    }));
  };

  const isFormValid = () => {
    const allRatingsFilled = KASH_MODULES.every(mod => 
      moduleRatings[mod].before > 0 && moduleRatings[mod].after > 0
    );
    return allRatingsFilled && overallImpact.trim().length > 0;
  };

  const handleSubmit = async () => {
    if (!selectedEvaluation) return;
    setIsSubmitting(true);
    try {
      const payload = {
        employeeId: selectedEvaluation.employeeId,
        courseId: selectedEvaluation.courseId,
        moduleRatings: KASH_MODULES.map(mod => ({
          moduleName: mod,
          beforeRating: moduleRatings[mod].before,
          afterRating: moduleRatings[mod].after,
          explanation: moduleRatings[mod].explanation
        })),
        overallImpact
      };

      await evaluationsApi.submitBehavioralEvaluation(payload);
      toast.success('Behavioral impact study submitted successfully');
      setIsEvalModalOpen(false);
      fetchPending();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-extrabold tracking-tight text-primary flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8" /> Team Impact Evaluations
        </h2>
        <p className="text-muted-foreground text-lg">
          K.A.S.H. Behavioral Change Scale (180-Day Post-Training Review)
        </p>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-xl flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" /> Pending Reviews
          </CardTitle>
          <CardDescription>
            Direct reports who have completed K.A.S.H. modules and require a behavioral impact study.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-6 font-bold uppercase text-xs tracking-wider">Employee Name</TableHead>
                <TableHead className="px-6 font-bold uppercase text-xs tracking-wider">Course Name</TableHead>
                <TableHead className="px-6 font-bold uppercase text-xs tracking-wider">Completion Date</TableHead>
                <TableHead className="px-6 text-right font-bold uppercase text-xs tracking-wider">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : pendingEvaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-10 w-10 opacity-20" />
                      <p className="text-lg font-medium">All caught up!</p>
                      <p className="text-sm">No pending behavioral evaluations for your team.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pendingEvaluations.map((evalItem) => (
                  <TableRow key={evalItem.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-6 font-semibold">{evalItem.employeeName}</TableCell>
                    <TableCell className="px-6">
                       <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {evalItem.courseName}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 text-sm text-muted-foreground">
                      {new Date(evalItem.completionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <Button onClick={() => openEvaluation(evalItem)} size="sm" className="shadow-sm">
                        Evaluate Impact <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEvalModalOpen} onOpenChange={setIsEvalModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <DialogHeader className="p-8 bg-primary text-primary-foreground">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <ClipboardCheck className="h-8 w-8" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">Behavioral Change Scale</DialogTitle>
                <DialogDescription className="text-primary-foreground/80 font-medium">
                  Evaluating {selectedEvaluation?.employeeName} for {selectedEvaluation?.courseName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-12 bg-background">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm">
              <Info className="h-5 w-5 shrink-0" />
              <p>
                <strong>Rating Scale:</strong> 1 - Poor, 2 - Fair, 3 - Satisfactory, 4 - Very Satisfactory, 5 - Excellent. 
                Please compare the employee's behavior <strong>BEFORE</strong> the program and <strong>AFTER</strong> the program.
              </p>
            </div>

            {KASH_MODULES.map((moduleName) => (
              <div key={moduleName} className="space-y-6 pb-8 border-b last:border-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xl font-bold text-primary">{moduleName}</h4>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">BEFORE the Program</Label>
                    <RadioGroup 
                      value={moduleRatings[moduleName].before.toString()} 
                      onValueChange={(val) => handleRatingChange(moduleName, 'before', val)}
                      className="flex justify-between gap-2"
                    >
                      {[1, 2, 3, 4, 5].map((num) => (
                        <div key={num} className="flex-1">
                          <RadioGroupItem value={num.toString()} id={`before-${moduleName}-${num}`} className="peer sr-only" />
                          <Label 
                            htmlFor={`before-${moduleName}-${num}`}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50",
                              "hover:bg-muted/50"
                            )}
                          >
                            <span className="text-lg font-bold">{num}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">AFTER the Program</Label>
                    <RadioGroup 
                      value={moduleRatings[moduleName].after.toString()} 
                      onValueChange={(val) => handleRatingChange(moduleName, 'after', val)}
                      className="flex justify-between gap-2"
                    >
                      {[1, 2, 3, 4, 5].map((num) => (
                        <div key={num} className="flex-1">
                          <RadioGroupItem value={num.toString()} id={`after-${moduleName}-${num}`} className="peer sr-only" />
                          <Label 
                            htmlFor={`after-${moduleName}-${num}`}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-50",
                              "hover:bg-muted/50"
                            )}
                          >
                            <span className="text-lg font-bold">{num}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Explanation / Specific Instances of Behavioral Change</Label>
                  <Textarea 
                    placeholder={`Describe how ${selectedEvaluation?.employeeName} improved in ${moduleName}...`}
                    value={moduleRatings[moduleName].explanation}
                    onChange={(e) => handleExplanationChange(moduleName, e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            ))}

            <div className="space-y-4 pt-4">
              <h4 className="text-xl font-bold text-primary">Final Assessment</h4>
              <div className="space-y-2">
                <Label className="text-sm font-bold">
                  Did the program impact you or your team in any other way? In what other ways was it beneficial for your team?
                </Label>
                <Textarea 
                  placeholder="Summarize the overall impact of the training on team performance..."
                  className="min-h-[120px] border-2 focus:border-primary"
                  value={overallImpact}
                  onChange={(e) => setOverallImpact(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/30 border-t sticky bottom-0">
            <Button variant="ghost" onClick={() => setIsEvalModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !isFormValid()}
              className="px-8 font-bold"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Impact Study
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
