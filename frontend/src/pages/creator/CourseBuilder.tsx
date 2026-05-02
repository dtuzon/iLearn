import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesApi } from '../../api/courses.api';
import { departmentsApi } from '../../api/departments.api';
import type { Department } from '../../api/departments.api';
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
  FileText,
  ClipboardCheck, 
  Settings, 
  Award, 
  Layers, 
  Play, 
  CheckCircle2,
  Trash2,
  GripVertical,
  Pencil,
  Save,
  Video as VideoIcon,
  Eye,
  CopyPlus
} from 'lucide-react';





import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { QuizBuilder } from '../../components/creator/QuizBuilder';
import { CertificateBuilder } from '../../components/creator/CertificateBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../context/AuthContext';
import { Clock, XCircle, CheckCircle, BookOpen } from 'lucide-react';


import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from '../../components/ui/dialog';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MultiSelect } from '../../components/ui/multi-select';
import { VideoUploadModal } from '../../components/creator/VideoUploadModal';
import { WorkshopActivityBuilder } from '../../components/creator/WorkshopActivityBuilder';
import { EvaluationTemplatePicker } from '../../components/creator/EvaluationTemplatePicker';
import { TemplateCategory } from '../../api/evaluations.api';

interface SortableModuleItemProps {
  module: any;
  index: number;
  getModuleIcon: (type: string) => React.ReactNode;
  setQuizBuilderState: (state: any) => void;
  setVideoModalState: (state: { isOpen: boolean, moduleId: string }) => void;
  setWorkshopModalState: (state: { isOpen: boolean, moduleId: string }) => void;
  setEvaluationModalState: (state: { isOpen: boolean, moduleId: string, category: TemplateCategory }) => void;
  setEditingModule: (module: any) => void;
  handleDeleteModule: (moduleId: string) => void;
  readonly?: boolean;
}

const SortableModuleItem: React.FC<SortableModuleItemProps> = ({ 
  module, 
  index, 
  getModuleIcon, 
  setQuizBuilderState, 
  setVideoModalState,
  setWorkshopModalState,
  setEvaluationModalState,
  setEditingModule, 
  handleDeleteModule,
  readonly
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Timeline Dot */}
      <div className="absolute -left-[33px] top-5 h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm z-10 group-hover:scale-125 transition-transform" />
      
      <Card className={`ml-4 border-none shadow-sm hover:shadow-md transition-all duration-300 ${isDragging ? 'shadow-xl' : 'group-hover:translate-x-1'}`}>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4">
            <div className="flex items-center gap-4">
              {!readonly && (
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded-md">
                  <GripVertical className="h-5 w-5 text-muted-foreground/30" />
                </div>
              )}
              <div className="text-xs font-black text-muted-foreground/30 font-mono min-w-[50px]">STEP {index + 1}</div>
              {getModuleIcon(module.type)}
              <div>
                <div className="font-bold text-lg">{module.title}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-bold tracking-tighter uppercase">
                    {module.type.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!readonly ? (
                <>
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
                  
                  {module.type === 'VIDEO' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="font-bold border-secondary/20 hover:border-secondary/50 hover:bg-secondary/5"
                      onClick={() => setVideoModalState({
                        isOpen: true,
                        moduleId: module.id
                      })}
                    >
                      <VideoIcon className="mr-2 h-3.5 w-3.5" /> Manage Video
                    </Button>
                  )}

                  {module.type === 'WORKSHOP' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="font-bold border-green-500/20 hover:border-green-500/50 hover:bg-green-500/5"
                      onClick={() => setWorkshopModalState({
                        isOpen: true,
                        moduleId: module.id
                      })}
                    >
                      <BookOpen className="mr-2 h-3.5 w-3.5" /> Manage Activity
                    </Button>
                  )}

                  {module.type === 'EVALUATION' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="font-bold border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/5"
                      onClick={() => setEvaluationModalState({
                        isOpen: true,
                        moduleId: module.id,
                        category: TemplateCategory.COURSE_QUALITY
                      })}
                    >
                      <ClipboardCheck className="mr-2 h-3.5 w-3.5" /> Manage Evaluation
                    </Button>
                  )}

                  {module.type === 'ONLINE_EVALUATION' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="font-bold border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/5"
                      onClick={() => setEvaluationModalState({
                        isOpen: true,
                        moduleId: module.id,
                        category: TemplateCategory.KASH_EVALUATION
                      })}
                    >
                      <Award className="mr-2 h-3.5 w-3.5" /> Manage K.A.S.H.
                    </Button>
                  )}

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => setEditingModule(module)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteModule(module.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">Read Only Mode</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const CourseBuilder: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isReadonly = course?.status === 'PUBLISHED' || 
                    course?.status === 'ARCHIVED' || 
                    course?.status === 'RETIRED' || 
                    (user?.role === 'COURSE_CREATOR' && course?.lecturerId !== user?.userId);


  const [identityForm, setIdentityForm] = useState({
    title: '',
    description: '',
    passingGrade: 70,
    targetAudience: 'GENERAL',
    targetDepartments: [] as string[]
  });

  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [isProcessingModule, setIsProcessingModule] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCourse();
    fetchDepartments();
  }, [courseId]);

  const fetchCourse = async () => {
    if (!courseId) return;
    try {
      const data = await coursesApi.getById(courseId);
      setCourse(data);
      setIdentityForm({
        title: data.title,
        description: data.description || '',
        passingGrade: data.passingGrade,
        targetAudience: data.targetAudience,
        targetDepartments: data.targetDepartments
      });
    } catch (error) {
      toast.error('Failed to load course details');
    } finally {
      setIsLoading(false);
    }
  };

  const [isVersioning, setIsVersioning] = useState(false);

  const handleCreateDraftVersion = async () => {
    if (!courseId) return;
    setIsVersioning(true);
    try {
      const newDraft = await coursesApi.createDraftVersion(courseId);
      toast.success('Deep clone successful. Redirecting to new draft...');
      navigate(`/creator/courses/${newDraft.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create new version');
    } finally {
      setIsVersioning(false);
    }
  };

  const fetchDepartments = async () => {

    try {
      const data = await departmentsApi.getAll();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!courseId) return;
    try {
      await coursesApi.updateStatus(courseId, status);
      toast.success(`Course status updated to ${status}`);
      fetchCourse();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModule, setNewModule] = useState<{title: string, type: string, facilitators: string[]}>({
    title: '',
    type: 'VIDEO',
    facilitators: []
  });

  const [quizBuilderState, setQuizBuilderState] = useState<{ isOpen: boolean, moduleId: string, moduleTitle: string }>({
    isOpen: false,
    moduleId: '',
    moduleTitle: ''
  });

  const [videoModalState, setVideoModalState] = useState<{ isOpen: boolean, moduleId: string }>({
    isOpen: false,
    moduleId: ''
  });

  const [workshopModalState, setWorkshopModalState] = useState<{ isOpen: boolean, moduleId: string }>({
    isOpen: false,
    moduleId: ''
  });

  const [evaluationModalState, setEvaluationModalState] = useState<{ isOpen: boolean, moduleId: string, category: TemplateCategory }>({
    isOpen: false,
    moduleId: '',
    category: TemplateCategory.COURSE_QUALITY
  });

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setIsAddingModule(true);
    try {
      await coursesApi.addModule(courseId, {
        ...newModule,
        sequenceOrder: (course?.modules?.length || 0) + 1
      });
      toast.success('Module added to curriculum loop');
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

  const handleUpdateIdentity = async () => {
    if (!courseId) return;
    setIsSavingIdentity(true);
    try {
      await coursesApi.partialUpdate(courseId, identityForm);
      setCourse(prev => prev ? { ...prev, ...identityForm } : null);
      toast.success('Course configuration updated');
    } catch (error) {
      toast.error('Failed to update course configuration');
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!course || !course.modules || !over || active.id === over.id) return;

    const oldIndex = course.modules.findIndex((m) => m.id === active.id);
    const newIndex = course.modules.findIndex((m) => m.id === over.id);

    const newModules = arrayMove(course.modules, oldIndex, newIndex);
    setCourse({ ...course, modules: newModules });

    try {
      await Promise.all(
        newModules.map((m, idx) => 
          coursesApi.updateModule(courseId!, m.id, { sequenceOrder: idx + 1 })
        )
      );
      toast.success('Sequence updated');
    } catch (err) {
      toast.error('Failed to update sequence');
      fetchCourse();
    }
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !editingModule) return;
    setIsProcessingModule(true);
    try {
      await coursesApi.updateModule(courseId, editingModule.id, {
        title: editingModule.title,
        type: editingModule.type
      });
      toast.success('Module updated');
      setEditingModule(null);
      fetchCourse();
    } catch (error) {
      toast.error('Failed to update module');
    } finally {
      setIsProcessingModule(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!courseId || !window.confirm('Retire this module from the curriculum?')) return;
    try {
      await coursesApi.deleteModule(courseId, moduleId);
      toast.success('Module retired');
      fetchCourse();
    } catch (error) {
      toast.error('Failed to retire module');
    }
  };

  const handleVideoUploadSuccess = async (url: string) => {
    if (!courseId || !videoModalState.moduleId) return;
    try {
      await coursesApi.updateModule(courseId, videoModalState.moduleId, { contentUrlOrText: url });
      toast.success('Video content production complete');
      setVideoModalState({ isOpen: false, moduleId: '' });
      fetchCourse();
    } catch (error) {
      toast.error('Failed to link video content');
    }
  };

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'PRE_QUIZ': return <ClipboardCheck className="h-6 w-6 text-primary" />;
      case 'VIDEO': return <Play className="h-6 w-6 text-secondary" />;
      case 'WORKSHOP': return <BookOpen className="h-6 w-6 text-green-500" />;
      case 'POST_QUIZ': return <Award className="h-6 w-6 text-primary" />;
      case 'EVALUATION': return <FileText className="h-6 w-6 text-blue-500" />;
      case 'ONLINE_EVALUATION': return <Award className="h-6 w-6 text-purple-500" />;
      default: return <FileText className="h-6 w-6 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
        <p className="text-muted-foreground font-medium animate-pulse">Syncing with Digital Twin...</p>
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-primary">
                {course.title}
                <span className="ml-2 text-sm font-mono opacity-40">v{course.version}</span>
              </h1>
              {course.status === 'PUBLISHED' && <Badge variant="success" className="text-[10px] font-black uppercase px-2 py-0">PUBLISHED</Badge>}
              {course.status === 'PENDING_APPROVAL' && <Badge variant="warning" className="text-[10px] font-black uppercase px-2 py-0 animate-pulse">PENDING</Badge>}
              {course.status === 'DRAFT' && <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0 text-muted-foreground border-dashed">DRAFT</Badge>}
              {course.status === 'ARCHIVED' && <Badge variant="outline" className="text-[10px] font-black uppercase px-2 py-0 bg-muted text-muted-foreground border-none">ARCHIVED</Badge>}
              {course.status === 'RETIRED' && <Badge variant="destructive" className="text-[10px] font-black uppercase px-2 py-0">RETIRED</Badge>}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span className="text-sm font-bold text-primary uppercase tracking-widest">{isReadonly ? 'Blueprint View' : 'Authoring Studio'}</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-sm font-bold text-primary uppercase tracking-widest">{(course._count?.modules ?? course.modules?.length ?? 0)} Components</span>
            </div>

          </div>
        </div>

        <div className="flex gap-2">
          {!isReadonly && (
            <>
              {course.status === 'DRAFT' && (

                <Button 
                  size="sm" 
                  className="h-10 px-4 shadow-lg shadow-primary/20"
                  onClick={() => handleUpdateStatus('PENDING_APPROVAL')}
                >
                  <Clock className="mr-2 h-4 w-4" /> Request Approval
                </Button>
              )}

              {course.status === 'PENDING_APPROVAL' && (
                <div className="flex gap-2">
                  <Badge variant="secondary" className="h-10 px-4 flex items-center bg-yellow-500/10 text-yellow-600 border-none animate-pulse">
                    <Clock className="mr-2 h-4 w-4" /> Pending Approval
                  </Badge>
                  {(user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
                    <>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="h-10 px-4 shadow-lg shadow-destructive/20"
                        onClick={() => handleUpdateStatus('DRAFT')}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-10 px-4 shadow-lg shadow-success/20 bg-success hover:bg-success/90"
                        onClick={() => handleUpdateStatus('PUBLISHED')}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Approve & Publish
                      </Button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {course.status === 'PUBLISHED' && (
            <Badge variant="success" className="h-10 px-4 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4" /> Published & Live
            </Badge>
          )}
          {isReadonly && course.status !== 'PUBLISHED' && (
             <Badge variant="outline" className="h-10 px-4 flex items-center gap-2 text-sm bg-muted text-muted-foreground border-none">
                <Eye className="h-4 w-4" /> Read Only Mode
             </Badge>
          )}
        </div>
      </div>

      {isReadonly && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-primary">Read-Only Blueprint View</h3>
              <p className="text-sm text-muted-foreground">This is a live or archived version. To make changes, you must create a new draft version.</p>
            </div>
          </div>
          <Button 
            onClick={handleCreateDraftVersion} 
            disabled={isVersioning}
            className="bg-primary hover:bg-primary/90 text-white font-bold px-6 shadow-lg hover:shadow-xl transition-all"
          >
            {isVersioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CopyPlus className="mr-2 h-4 w-4" />}
            Create New Draft Version
          </Button>
        </div>
      )}


      <Tabs defaultValue="curriculum" className="w-full">
        <TabsList className="bg-muted/50 p-1 h-12 mb-6">
          <TabsTrigger value="curriculum" className="h-10 px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Curriculum Loop
          </TabsTrigger>
          <TabsTrigger value="certificate" className="h-10 px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Award className="mr-2 h-4 w-4" /> Certificate Builder
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-10 px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings className="mr-2 h-4 w-4" /> Course Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-primary before:via-primary/50 before:to-transparent">
                {course.modules?.length === 0 ? (
                  <div className="ml-4 p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                    <Layers className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-xl font-bold">No modules added yet.</p>
                    <p className="text-sm">Start building your curriculum loop by adding your first component.</p>
                  </div>
                ) : (
                  <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={(course.modules || []).map(m => m.id)} 
                      strategy={verticalListSortingStrategy}
                      disabled={isReadonly}
                    >
                      {(course.modules || []).map((module, index) => (
                        <SortableModuleItem 
                          key={module.id} 
                          module={module} 
                          index={index}
                          getModuleIcon={getModuleIcon}
                          setQuizBuilderState={setQuizBuilderState}
                          setVideoModalState={setVideoModalState}
                          setWorkshopModalState={setWorkshopModalState}
                          setEvaluationModalState={setEvaluationModalState}
                          setEditingModule={setEditingModule}
                          handleDeleteModule={handleDeleteModule}
                          readonly={isReadonly}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>

            {!isReadonly && (
              <div className="space-y-6">
                <Card className="border-none shadow-xl bg-primary/5 sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-lg">Add Module</CardTitle>
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
                          placeholder="e.g. Introduction to Policy"
                          className="h-10 bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Component Type</Label>
                        <Select value={newModule.type} onValueChange={(val) => setNewModule({...newModule, type: val})}>
                          <SelectTrigger className="h-10 bg-background/50 font-bold">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIDEO" className="font-bold">Interactive Video</SelectItem>
                            <SelectItem value="PRE_QUIZ" className="font-bold">Assessment: Pre-Quiz</SelectItem>
                            <SelectItem value="POST_QUIZ" className="font-bold">Assessment: Post-Quiz</SelectItem>
                            <SelectItem value="WORKSHOP" className="font-bold">Workshop/Activity</SelectItem>
                            <SelectItem value="EVALUATION" className="font-bold">Quality Survey</SelectItem>
                            <SelectItem value="ONLINE_EVALUATION" className="font-bold">K.A.S.H. Assessment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-10 font-bold shadow-lg shadow-primary/20"
                        disabled={isAddingModule}
                      >
                        {isAddingModule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Inject Module
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="certificate">
          <CertificateBuilder 
            courseId={courseId!} 
            initialData={{
              backgroundUrl: (course as any).certificateBackgroundUrl,
              designConfig: (course as any).certificateDesignConfig
            }}
          />
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-8">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Course Configuration</CardTitle>
                <CardDescription>Update the primary metadata for this learning experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="c-title">Course Title</Label>
                    <Input 
                      id="c-title" 
                      disabled={isReadonly}
                      value={identityForm.title}
                      onChange={(e) => setIdentityForm({...identityForm, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select 
                      disabled={isReadonly}
                      value={identityForm.targetAudience} 
                      onValueChange={(val) => setIdentityForm({...identityForm, targetAudience: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PHASE_1_NEW_HIRE">Phase 1: Newly Hired</SelectItem>
                        <SelectItem value="PHASE_2_REGULARIZED">Phase 2: Newly Regularized</SelectItem>
                        <SelectItem value="GENERAL">General Audience</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold">Target Departments</Label>
                  <p className="text-xs text-muted-foreground mb-2">Limit course visibility to specific departments. Select none to keep visible to all.</p>
                  <MultiSelect 
                    placeholder="Search and select departments..."
                    options={departments.map(d => ({ label: d.name, value: d.name }))}
                    selected={identityForm.targetDepartments}
                    onChange={(selected) => setIdentityForm({ ...identityForm, targetDepartments: selected })}
                    disabled={isReadonly}
                  />


                </div>

                <div className="space-y-2">
                  <Label htmlFor="c-desc">Executive Summary / Description</Label>
                  <Textarea 
                    id="c-desc" 
                    disabled={isReadonly}
                    value={identityForm.description}
                    onChange={(e) => setIdentityForm({...identityForm, description: e.target.value})}
                    className="min-h-[100px]"
                  />
                </div>
                {!isReadonly && (
                  <Button onClick={handleUpdateIdentity} disabled={isSavingIdentity} className="h-11 shadow-lg shadow-primary/10 font-bold">
                    {isSavingIdentity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Configuration
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Course Lifecycle Configuration</CardTitle>
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
                    disabled={isReadonly}
                    checked={course.requires180DayEval} 
                    onCheckedChange={handleToggleEval}
                  />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl bg-muted/20 gap-4 mt-4">
                  <div className="space-y-1">
                    <Label className="text-base font-bold">Global Passing Grade (%)</Label>
                    <p className="text-sm text-muted-foreground">
                      Set the minimum percentage required to pass quizzes in this course.
                    </p>
                  </div>
                  <div className="w-full md:w-32">
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      disabled={isReadonly}
                      value={identityForm.passingGrade}
                      onChange={(e) => setIdentityForm({...identityForm, passingGrade: parseInt(e.target.value) || 0})}
                      className="bg-background font-bold text-center h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <QuizBuilder 
        courseId={course.id}
        moduleId={quizBuilderState.moduleId}
        moduleTitle={quizBuilderState.moduleTitle}
        isOpen={quizBuilderState.isOpen}
        onClose={() => setQuizBuilderState({ ...quizBuilderState, isOpen: false })}
      />

      <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUpdateModule}>
            <DialogHeader>
              <DialogTitle>Edit Component</DialogTitle>
              <DialogDescription>Modify the details of this module in the learning loop.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input 
                  id="edit-title" 
                  required 
                  value={editingModule?.title || ''} 
                  onChange={(e) => setEditingModule({...editingModule, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Module Type</Label>
                <Select 
                  value={editingModule?.type} 
                  onValueChange={(val) => setEditingModule({...editingModule, type: val})}
                >
                  <SelectTrigger>
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingModule(null)}>Cancel</Button>
              <Button type="submit" disabled={isProcessingModule}>
                {isProcessingModule && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Component
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <VideoUploadModal 
        isOpen={videoModalState.isOpen}
        onClose={() => setVideoModalState({ ...videoModalState, isOpen: false })}
        onUploadSuccess={handleVideoUploadSuccess}
      />

      <WorkshopActivityBuilder 
        courseId={courseId!}
        moduleId={workshopModalState.moduleId}
        isOpen={workshopModalState.isOpen}
        onClose={() => setWorkshopModalState({ ...workshopModalState, isOpen: false })}
        onUpdate={fetchCourse}
      />

      <EvaluationTemplatePicker 
        courseId={courseId!}
        moduleId={evaluationModalState.moduleId}
        category={evaluationModalState.category}
        isOpen={evaluationModalState.isOpen}
        onClose={() => setEvaluationModalState({ ...evaluationModalState, isOpen: false })}
        onUpdate={fetchCourse}
      />
    </div>
  );
};
