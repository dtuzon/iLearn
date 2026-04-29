import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesApi } from '../../api/courses.api';
import type { Course } from '../../api/courses.api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  ArrowLeft, 
  Loader2, 
  Plus, 
  HelpCircle, 
  FileText,
  MessageSquare, 
  ClipboardCheck, 
  Settings, 
  Award, 
  Layers, 
  Play, 
  CheckCircle2,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { QuizBuilder } from '../../components/creator/QuizBuilder';
import { CertificateBuilder } from '../../components/creator/CertificateBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export const CourseBuilder: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // New Module State
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModule, setNewModule] = useState<{title: string, type: string, facilitators: string[]}>({
    title: '',
    type: 'VIDEO',
    facilitators: []
  });

  // Quiz Builder State
  const [quizBuilderState, setQuizBuilderState] = useState<{ isOpen: boolean, moduleId: string, moduleTitle: string }>({
    isOpen: false,
    moduleId: '',
    moduleTitle: ''
  });

  const fetchCourse = async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const data = await coursesApi.getById(courseId);
      // Sort modules by sequenceOrder
      if (data.modules) {
        data.modules.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      }
      setCourse(data);
    } catch (error) {
      toast.error('Failed to load course details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !course) return;

    setIsAddingModule(true);
    try {
      const nextOrder = course.modules && course.modules.length > 0 
        ? Math.max(...course.modules.map(m => m.sequenceOrder)) + 1 
        : 1;

      await coursesApi.addModule(courseId, {
        ...newModule,
        sequenceOrder: nextOrder
      });
      
      toast.success('Module added successfully');
      setNewModule({ title: '', type: 'VIDEO', facilitators: [] });
      fetchCourse();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add module');
    } finally {
      setIsAddingModule(false);
    }
  };

  const handleToggleEval = async (enabled: boolean) => {
    if (!courseId || !course) return;
    try {
      await coursesApi.partialUpdate(courseId, { requires180DayEval: enabled });
      setCourse({ ...course, requires180DayEval: enabled });
      toast.success(enabled ? '180-Day Evaluation enabled' : '180-Day Evaluation disabled');
    } catch (error) {
      toast.error('Failed to update evaluation settings');
    }
  };

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'PRE_QUIZ': return <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><HelpCircle className="h-5 w-5" /></div>;
      case 'POST_QUIZ': return <div className="p-2 rounded-lg bg-purple-100 text-purple-600"><HelpCircle className="h-5 w-5" /></div>;
      case 'VIDEO': return <div className="p-2 rounded-lg bg-red-100 text-red-600"><Play className="h-5 w-5" /></div>;
      case 'WORKSHOP': return <div className="p-2 rounded-lg bg-green-100 text-green-600"><FileText className="h-5 w-5" /></div>;
      case 'EVALUATION': return <div className="p-2 rounded-lg bg-orange-100 text-orange-600"><ClipboardCheck className="h-5 w-5" /></div>;
      case 'ONLINE_EVALUATION': return <div className="p-2 rounded-lg bg-cyan-100 text-cyan-600"><ClipboardCheck className="h-5 w-5" /></div>;
      default: return <div className="p-2 rounded-lg bg-muted text-muted-foreground"><MessageSquare className="h-5 w-5" /></div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return <div className="text-center p-8">Course not found.</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-primary/5" onClick={() => navigate('/creator/courses')}>
            <ArrowLeft className="h-6 w-6 text-primary" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{course.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span className="text-sm font-medium">Authoring Studio</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-sm font-bold text-primary uppercase tracking-widest">{course.modules?.length || 0} Components</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-10 px-4">
            <Settings className="mr-2 h-4 w-4" /> Course Config
          </Button>
          <Button size="sm" className="h-10 px-4 shadow-lg shadow-primary/20">
            <CheckCircle2 className="mr-2 h-4 w-4" /> Publish Studio Version
          </Button>
        </div>
      </div>

      <Tabs defaultValue="curriculum" className="w-full">
        <TabsList className="bg-muted/50 p-1 h-12 mb-6">
          <TabsTrigger value="curriculum" className="h-10 px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Curriculum Loop
          </TabsTrigger>
          <TabsTrigger value="certificate" className="h-10 px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Award className="mr-2 h-4 w-4" /> Certificate Builder
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-10 px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings className="mr-2 h-4 w-4" /> Studio Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Column: Visual Timeline */}
            <div className="lg:col-span-3 space-y-6">
              <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-primary before:via-primary/50 before:to-transparent">
                {course.modules?.length === 0 ? (
                  <div className="ml-4 p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                    <Layers className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium italic">No components in the loop yet.</p>
                    <p className="text-sm opacity-60">Begin by adding your first module from the right panel.</p>
                  </div>
                ) : (
                  course.modules?.map((module, index) => (
                    <div key={module.id} className="relative group">
                      {/* Timeline Dot */}
                      <div className="absolute -left-[33px] top-5 h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm z-10 group-hover:scale-125 transition-transform" />
                      
                      <Card className="ml-4 border-none shadow-sm hover:shadow-md transition-all duration-300 group-hover:translate-x-1">
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4">
                            <div className="flex items-center gap-4">
                              <div className="text-xs font-black text-muted-foreground/30 font-mono">STEP {index + 1}</div>
                              {getModuleIcon(module.type)}
                              <div>
                                <div className="font-bold text-lg">{module.title}</div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px] font-bold tracking-tighter uppercase">
                                    {module.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {(module.type === 'PRE_QUIZ' || module.type === 'POST_QUIZ') && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="font-bold border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                                  onClick={() => setQuizBuilderState({
                                    isOpen: true,
                                    moduleId: module.id,
                                    moduleTitle: module.title
                                  })}
                                >
                                  <Settings className="mr-2 h-3.5 w-3.5" /> Manage Quiz
                                </Button>
                              )}
                              
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                )}
                
                {/* Visual End Indicator */}
                {course.modules && course.modules.length > 0 && (
                  <div className="ml-4 pt-4 flex items-center gap-4 opacity-50">
                    <div className="absolute -left-[33px] h-4 w-4 rounded-full border-2 border-muted-foreground/30 bg-muted" />
                    <div className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground italic flex items-center gap-2">
                      <ChevronDown className="h-3 w-3" /> End of Learning Loop
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Component Adder */}
            <div className="space-y-6">
              <Card className="border-none shadow-xl bg-primary/5 sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">Add Component</CardTitle>
                  <CardDescription>Expand the sequence.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddModule} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="m-title" className="text-xs font-bold uppercase tracking-wider">Identity</Label>
                      <Input 
                        id="m-title" 
                        required 
                        value={newModule.title}
                        onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                        placeholder="Module Title"
                        className="bg-background border-none shadow-inner h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider">Type</Label>
                      <Select 
                        value={newModule.type} 
                        onValueChange={(val) => setNewModule({...newModule, type: val})}
                      >
                        <SelectTrigger className="bg-background border-none shadow-inner h-11">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRE_QUIZ">Pre-Quiz</SelectItem>
                          <SelectItem value="VIDEO">Video Production</SelectItem>
                          <SelectItem value="WORKSHOP">Workshop / Activity</SelectItem>
                          <SelectItem value="POST_QUIZ">Post-Quiz Assessment</SelectItem>
                          <SelectItem value="EVALUATION">Quality Evaluation</SelectItem>
                          <SelectItem value="ONLINE_EVALUATION">Online Evaluation (K.A.S.H.)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newModule.type === 'ONLINE_EVALUATION' && (
                      <div className="space-y-3 p-4 border rounded-xl bg-background/50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label className="text-xs font-bold uppercase tracking-wider text-primary">Facilitators / Speakers</Label>
                        <div className="space-y-2">
                          {newModule.facilitators.map((f, i) => (
                            <div key={i} className="flex gap-2">
                              <Input 
                                value={f} 
                                onChange={(e) => {
                                  const updated = [...newModule.facilitators];
                                  updated[i] = e.target.value;
                                  setNewModule({...newModule, facilitators: updated});
                                }}
                                placeholder="Facilitator Name"
                                className="h-9 text-sm"
                              />
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 text-destructive"
                                onClick={() => {
                                  const updated = newModule.facilitators.filter((_, idx) => idx !== i);
                                  setNewModule({...newModule, facilitators: updated});
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="w-full h-9 border-dashed"
                            onClick={() => setNewModule({...newModule, facilitators: [...newModule.facilitators, '']})}
                          >
                            <Plus className="mr-2 h-3 w-3" /> Add Speaker
                          </Button>
                        </div>
                      </div>
                    )}

                    <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/10 font-bold" disabled={isAddingModule}>
                      {isAddingModule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Inject to Loop
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="certificate">
          <CertificateBuilder 
            courseId={courseId!} 
            initialData={{
              // These would ideally come from the backend if we add these fields to Course
              nameX: 500,
              nameY: 450,
              dateX: 500,
              dateY: 600
          }}
        />
      </TabsContent>
      <TabsContent value="settings">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Course Configuration</CardTitle>
              <CardDescription>Adjust high-level settings for this course's lifecycle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-base font-bold">180-Day Behavioral Change Evaluation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically trigger a follow-up evaluation 6 months after course completion to measure K.A.S.H. impact.
                  </p>
                </div>
                <Switch 
                  checked={course.requires180DayEval} 
                  onCheckedChange={handleToggleEval}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <QuizBuilder 
        moduleId={quizBuilderState.moduleId}
        moduleTitle={quizBuilderState.moduleTitle}
        isOpen={quizBuilderState.isOpen}
        onClose={() => setQuizBuilderState({ ...quizBuilderState, isOpen: false })}
      />
    </div>
  );
};

