import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  LayoutList, 
  ChevronRight, 
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  evaluationsApi, 
  TemplateCategory, 
  KashDomain, 
  EvalQuestionType 
} from '../../api/evaluations.api';
import type { EvaluationTemplate, EvaluationQuestion } from '../../api/evaluations.api';

export const EvaluationTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New Template State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory | ''>('');
  const [questions, setQuestions] = useState<Omit<EvaluationQuestion, 'id'>[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await evaluationsApi.getTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      text: '',
      type: EvalQuestionType.RATING_1_TO_5,
      order: questions.length + 1
    }]);
  };

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Reorder
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i + 1 })));
  };

  const handleQuestionChange = (index: number, field: keyof EvaluationQuestion, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    if (!name || !category || questions.length === 0) {
      toast.error('Please fill in all required fields and add at least one question');
      return;
    }

    // Validation for KASH
    if (category === TemplateCategory.KASH_EVALUATION) {
      const missingDomain = questions.some(q => !q.kashDomain);
      if (missingDomain) {
        toast.error('K.A.S.H. templates require a domain for every question');
        return;
      }
    }

    setIsSaving(true);
    try {
      await evaluationsApi.createTemplate({
        name,
        description,
        category,
        questions
      });
      toast.success('Template created successfully');
      setIsCreating(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setQuestions([]);
  };

  const getCategoryBadge = (cat: TemplateCategory) => {
    switch (cat) {
      case TemplateCategory.COURSE_QUALITY:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Quality Survey</Badge>;
      case TemplateCategory.KASH_EVALUATION:
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">K.A.S.H.</Badge>;
      case TemplateCategory.BEHAVIORAL_180_DAY:
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">180-Day Assessment</Badge>;
      default:
        return <Badge variant="secondary">{cat}</Badge>;
    }
  };

  if (isCreating) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Global Template</h1>
            <p className="text-muted-foreground mt-1">Design a unified evaluation framework for the organization.</p>
          </div>
          <Button variant="ghost" onClick={() => { setIsCreating(false); resetForm(); }}>Cancel</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Template Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input 
                    placeholder="e.g. Annual Quality Survey" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-muted/30 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={category} 
                    onValueChange={(val: any) => {
                      setCategory(val);
                      // If switching to KASH, ensure domains are reset or initialized
                      setQuestions(questions.map(q => ({ ...q, kashDomain: undefined })));
                    }}
                  >
                    <SelectTrigger className="bg-muted/30 border-none">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TemplateCategory.COURSE_QUALITY}>Course Quality Survey</SelectItem>
                      <SelectItem value={TemplateCategory.KASH_EVALUATION}>K.A.S.H. Evaluation</SelectItem>
                      <SelectItem value={TemplateCategory.BEHAVIORAL_180_DAY}>180-Day Behavioral Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea 
                    placeholder="Provide context for this template..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-muted/30 border-none resize-none"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-primary">Senior Engineering Tip</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Global templates allow for standardized reporting across departments. Ensure questions are clear and objective.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Questions Builder</CardTitle>
                  <CardDescription>Add and configure the evaluation criteria.</CardDescription>
                </div>
                <Button onClick={handleAddQuestion} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Add Question
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl bg-muted/20">
                    <LayoutList className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium">No questions added yet.</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mt-1">
                      Click the "Add Question" button to start building your evaluation criteria.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((q, index) => (
                      <div key={index} className="group p-4 border rounded-xl bg-muted/10 hover:bg-muted/20 transition-all duration-200 relative">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-1 flex items-center justify-center">
                            <span className="text-xs font-bold text-muted-foreground/50">#{q.order}</span>
                          </div>
                          <div className="md:col-span-6 space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Question Text</Label>
                            <Input 
                              placeholder="Enter question text..."
                              value={q.text}
                              onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                              className="bg-background border-none shadow-sm"
                            />
                          </div>
                          <div className="md:col-span-3 space-y-2">
                            <Label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Type</Label>
                            <Select 
                              value={q.type}
                              onValueChange={(val: any) => handleQuestionChange(index, 'type', val)}
                            >
                              <SelectTrigger className="bg-background border-none shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={EvalQuestionType.RATING_1_TO_5}>1-5 Rating</SelectItem>
                                <SelectItem value={EvalQuestionType.TEXT_RESPONSE}>Text Response</SelectItem>
                                <SelectItem value={EvalQuestionType.YES_NO}>Yes / No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="md:col-span-2 flex items-end justify-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveQuestion(index)}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {category === TemplateCategory.KASH_EVALUATION && (
                          <div className="mt-4 pt-4 border-t border-dashed flex items-center gap-4 animate-in fade-in slide-in-from-top-1">
                            <Label className="text-[10px] uppercase font-bold tracking-wider text-purple-600">K.A.S.H. Domain</Label>
                            <div className="flex flex-wrap gap-2">
                              {Object.values(KashDomain).map(domain => (
                                <Button
                                  key={domain}
                                  type="button"
                                  variant={q.kashDomain === domain ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handleQuestionChange(index, 'kashDomain', domain)}
                                  className={`h-7 px-3 text-[10px] rounded-full transition-all ${
                                    q.kashDomain === domain 
                                      ? 'bg-purple-600 hover:bg-purple-700 shadow-md scale-105' 
                                      : 'hover:border-purple-300'
                                  }`}
                                >
                                  {domain}
                                </Button>
                              ))}
                            </div>
                            {!q.kashDomain && (
                              <span className="text-[10px] text-destructive flex items-center gap-1 italic">
                                <AlertCircle className="h-3 w-3" /> Selection Required
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-6 bg-muted/5 rounded-b-xl">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || questions.length === 0}
                  className="w-full h-11 gap-2 text-md font-semibold shadow-lg shadow-primary/20"
                >
                  {isSaving ? 'Creating...' : (
                    <>
                      <Save className="h-5 w-5" /> Save Global Template
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Evaluation Templates</h1>
          <p className="text-muted-foreground mt-1">Standardized measurement frameworks for enterprise performance.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2 h-11 px-6 shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" /> Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Quality Surveys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.filter(t => t.category === TemplateCategory.COURSE_QUALITY).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active global frameworks</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-gradient-to-br from-purple-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">K.A.S.H. Engine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.filter(t => t.category === TemplateCategory.KASH_EVALUATION).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Competency assessment models</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-gradient-to-br from-orange-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Behavioral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.filter(t => t.category === TemplateCategory.BEHAVIORAL_180_DAY).length}</div>
            <p className="text-xs text-muted-foreground mt-1">180-Day follow-up assets</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Active Templates Registry</span>
            </div>
          </div>
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground animate-pulse">Syncing with Unified Engine...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <div>
                <p className="font-semibold">No Templates Found</p>
                <p className="text-sm text-muted-foreground">Start by creating your first global evaluation framework.</p>
              </div>
              <Button variant="outline" onClick={() => setIsCreating(true)}>Create Template</Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/5">
                <TableRow>
                  <TableHead className="w-[300px]">Template Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-muted/5 transition-colors">
                    <TableCell className="font-semibold">
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        {template.description && <span className="text-xs font-normal text-muted-foreground truncate max-w-[250px]">{template.description}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(template.category)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="rounded-full px-2">{template.questions.length}</Badge>
                        <span className="text-xs text-muted-foreground">Items</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.isActive ? (
                        <div className="flex items-center gap-1.5 text-success text-xs font-bold uppercase tracking-wider">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                          <AlertCircle className="h-3 w-3" /> Inactive
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1">
                        View <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
