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
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Trash2,
  GripVertical,
  Pencil,
  Save,
  Video as VideoIcon,
  Eye,
  EyeOff,
  CopyPlus,
  Image as ImageIcon,
  RefreshCw,
  History as HistoryIcon,
  ChevronDown
} from 'lucide-react';




import 'react-quill-new/dist/quill.snow.css';








import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Textarea } from '../../components/ui/textarea';
import { QuizBuilder } from '../../components/creator/QuizBuilder';
import { CertificateBuilder } from '../../components/creator/CertificateBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../context/AuthContext';


import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
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
import { RichTextModuleBuilder } from '../../components/creator/RichTextModuleBuilder';
import { LiveSessionBuilder } from '../../components/creator/LiveSessionBuilder';



interface SortableModuleItemProps {
  module: any;
  index: number;
  getModuleIcon: (type: string) => React.ReactNode;
  setQuizBuilderState: (state: any) => void;
  setVideoModalState: (state: { isOpen: boolean, moduleId: string }) => void;
  setWorkshopModalState: (state: { isOpen: boolean, moduleId: string }) => void;
  setEvaluationModalState: (state: { isOpen: boolean, moduleId: string, category: TemplateCategory }) => void;
  setRichTextModalState: (state: { isOpen: boolean, moduleId: string }) => void;
  setLiveSessionModalState: (state: { isOpen: boolean, moduleId: string }) => void;
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
  setRichTextModalState,
  setLiveSessionModalState,
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

                  {(module.type === 'INTRODUCTION' || module.type === 'CLOSING') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="font-bold border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => setRichTextModalState({
                        isOpen: true,
                        moduleId: module.id
                      })}
                    >
                      <FileText className="mr-2 h-3.5 w-3.5" /> Manage Content
                    </Button>
                  )}

                  {module.type === 'LIVE_SESSION' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="font-bold border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => setLiveSessionModalState({
                        isOpen: true,
                        moduleId: module.id
                      })}
                    >
                      <VideoIcon className="mr-2 h-3.5 w-3.5" /> Manage Session
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

export 
interface VersionTimelineItemProps {
  v: Course;
  isCurrent: boolean;
}

const VersionTimelineItem: React.FC<VersionTimelineItemProps> = ({ v, isCurrent }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="relative group animate-in fade-in duration-500">
      {/* The node */}
      <div className={`absolute -left-[30px] top-1 h-[20px] w-[20px] rounded-full border-4 bg-white z-10 transition-all ${isCurrent ? 'border-primary shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-slate-300 group-hover:border-slate-400'}`}></div>
      
      <div 
        className={`space-y-2 p-3 rounded-2xl transition-all cursor-pointer ${isCurrent ? 'bg-primary/5 border border-primary/10' : 'hover:bg-white hover:shadow-sm hover:border-slate-100 border border-transparent'}`}
        onClick={() => !isCurrent && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded ${isCurrent ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>
              v{v.version}
            </span>
            {isCurrent && <span className="text-[9px] font-black text-primary uppercase animate-pulse">Active</span>}
          </div>
          <span className="text-[9px] text-slate-400 font-bold tabular-nums">
            {v.updatedAt ? new Date(v.updatedAt).toLocaleDateString() : '---'}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-bold tracking-tight truncate ${isCurrent ? 'text-slate-900' : 'text-slate-600'}`}>
            {v.versionTag || 'Unlabeled Release'}
          </p>
          {!isCurrent && v.changeSummary && (
            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          )}
        </div>

        {/* Expanded Release Notes */}
        {(isCurrent || (isExpanded && v.changeSummary)) && (
          <div className={`animate-in slide-in-from-top-1 duration-300 overflow-hidden`}>
            <div className={`p-3 rounded-xl font-mono text-[11px] leading-relaxed italic ${isCurrent ? 'bg-white/60 text-slate-600' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
              &ldquo;{v.changeSummary || 'No release notes provided.'}&rdquo;
            </div>
          </div>
        )}
      </div>
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
                    course?.status === 'PENDING_APPROVAL' ||
                    course?.status === 'ARCHIVED' || 
                    course?.status === 'RETIRED' || 
                    (user?.role === 'COURSE_CREATOR' && course?.lecturerId !== user?.id);



  const [identityForm, setIdentityForm] = useState({
    title: '',
    description: '',
    passingGrade: 70,
    targetAudience: 'GENERAL',
    targetDepartments: [] as string[],
    introContent: '',
    closingContent: '',
    thumbnailUrl: '',
    versionTag: '' as string,
    changeSummary: '' as string
  });



  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [isProcessingModule, setIsProcessingModule] = useState(false);
  const [lineageVersions, setLineageVersions] = useState<Course[]>([]);

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

  const fetchCourse = async (silent = false) => {
    if (!courseId) return;
    if (!silent) setIsLoading(true);
    try {
      const data = await coursesApi.getById(courseId);
      setCourse(data);
      setIdentityForm({
        title: data.title,
        description: data.description || '',
        passingGrade: data.passingGrade,
        targetAudience: data.targetAudience,
        targetDepartments: data.targetDepartments,
        introContent: data.introContent || '',
        closingContent: data.closingContent || '',
        thumbnailUrl: data.thumbnailUrl || '',
        versionTag: data.versionTag || '',
        changeSummary: data.changeSummary || ''
      });

      // Fetch version lineage
      try {
        const pId = data.parentId || data.id;
        const vData = await coursesApi.getVersions(pId);
        setLineageVersions(vData);
      } catch (err) {
        console.error("Failed to fetch version lineage", err);
      }

    } catch (error) {
      toast.error('Failed to load course details');
    } finally {
      if (!silent) setIsLoading(false);
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

  const [isUnpublishDialogOpen, setIsUnpublishDialogOpen] = useState(false);

  const [approvalDialog, setApprovalDialog] = useState({
    isOpen: false,
    versionTagDraft: '',
    changeSummary: '',
    isSubmitting: false,
    isGeneratingDiff: false
  });

  const generateAutoDiff = (current: Course, parent: Course) => {
    const changes: string[] = [];

    // 1. Curriculum Changes
    const currentModules = current.modules || [];
    const parentModules = parent.modules || [];

    const currentTitles = currentModules.map(m => m.title);
    const parentTitles = parentModules.map(m => m.title);

    // Added
    const added = currentTitles.filter(t => !parentTitles.includes(t));
    added.forEach(t => changes.push(`• Added module: "${t}"`));

    // Removed (Crossed out)
    const removed = parentTitles.filter(t => !currentTitles.includes(t));
    removed.forEach(t => changes.push(`• Removed module: ~~"${t}"~~`));

    // Edited / Sequence
    currentModules.forEach((m) => {
      const parentM = parentModules.find(pm => pm.title === m.title);
      if (parentM) {
        if (parentM.sequenceOrder !== m.sequenceOrder) {
          changes.push(`• Re-sequenced: "${m.title}" (Moved to Step ${m.sequenceOrder + 1})`);
        }
        // Simplified content check
        if (parentM.type !== m.type || parentM.contentUrlOrText !== m.contentUrlOrText) {
          changes.push(`• Updated content: "${m.title}"`);
        }
      }
    });

    // 2. Configuration Changes
    if (current.passingGrade !== parent.passingGrade) {
      changes.push(`• Updated Passing Grade: ${parent.passingGrade}% → ${current.passingGrade}%`);
    }
    if (current.targetAudience !== parent.targetAudience) {
      changes.push(`• Changed Target Audience to ${current.targetAudience.replace(/_/g, ' ')}`);
    }

    // 3. Certificate Changes
    if (current.hasCertificate !== parent.hasCertificate) {
      changes.push(current.hasCertificate ? '• Enabled Digital Certificate' : '• Disabled Digital Certificate');
    }

    return changes.length > 0 ? changes.join('\n') : '• Minor internal adjustments and polishing.';
  };

  const handleOpenApprovalDialog = async () => {
    if (!course) return;
    
    let autoSummary = '';
    
    // If it's a versioned course and doesn't have a summary yet, generate one
    if (course.parentId && !identityForm.changeSummary) {
      setApprovalDialog(prev => ({ ...prev, isOpen: true, isGeneratingDiff: true }));
      try {
        const parentCourse = await coursesApi.getById(course.parentId);
        autoSummary = generateAutoDiff(course, parentCourse);
      } catch (err) {
        console.error("Failed to generate auto-diff", err);
      }
    }

    setApprovalDialog(prev => ({
      ...prev,
      isOpen: true,
      isGeneratingDiff: false,
      versionTagDraft: identityForm.versionTag || '',
      changeSummary: identityForm.changeSummary || autoSummary
    }));
  };

  const handleSubmitForApproval = async () => {
    if (!courseId) return;
    setApprovalDialog(prev => ({ ...prev, isSubmitting: true }));
    try {
      // Step 1: Save versionTag and changeSummary together
      const patchPayload: Record<string, string> = {};
      if (approvalDialog.versionTagDraft.trim()) {
        patchPayload.versionTag = approvalDialog.versionTagDraft.trim();
      }
      if (approvalDialog.changeSummary.trim()) {
        patchPayload.changeSummary = approvalDialog.changeSummary.trim();
      }
      if (Object.keys(patchPayload).length > 0) {
        await coursesApi.partialUpdate(courseId, patchPayload);
        setCourse(prev => prev ? { ...prev, ...patchPayload } : null);
        setIdentityForm(prev => ({ ...prev, versionTag: patchPayload.versionTag || prev.versionTag }));
      }
      // Step 2: Transition to PENDING_APPROVAL
      await coursesApi.updateStatus(courseId, 'PENDING_APPROVAL');
      toast.success('Version submitted for approval', {
        description: approvalDialog.versionTagDraft.trim()
          ? `Tagged as "${approvalDialog.versionTagDraft.trim()}"`
          : 'A Learning Manager will review your changes.'
      });
      setApprovalDialog(prev => ({ ...prev, isOpen: false }));
      fetchCourse();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit for approval');
    } finally {
      setApprovalDialog(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!courseId) return;
    try {
      await coursesApi.updateStatus(courseId, status);
      toast.success(`Course status updated to ${status}`);
      fetchCourse();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to update status';
      // Surface the enrollment guard error with a destructive toast
      toast.error(msg, {
        description: msg.includes('active learner')
          ? 'Use the \'Create New Draft Version\' button below to safely iterate on this course.'
          : undefined,
        duration: 8000
      });
    }
  };

  const handleConfirmUnpublish = async () => {
    setIsUnpublishDialogOpen(false);
    await handleUpdateStatus('DRAFT');
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
  const [richTextModalState, setRichTextModalState] = useState<{ isOpen: boolean, moduleId: string }>({
    isOpen: false,
    moduleId: ''
  });
  const [liveSessionModalState, setLiveSessionModalState] = useState<{ isOpen: boolean, moduleId: string }>({
    isOpen: false,
    moduleId: ''
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

  const handleToggleCertificate = async (enabled: boolean) => {
    if (!courseId || !course) return;
    try {
      await coursesApi.partialUpdate(courseId, { hasCertificate: enabled });
      setCourse({ ...course, hasCertificate: enabled });
      toast.success(enabled ? 'Certificates enabled for this course' : 'Certificates disabled');
    } catch (error) {
      toast.error('Failed to update certificate settings');
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

  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId) return;
    setIsUploadingThumbnail(true);
    try {
      const { thumbnailUrl } = await coursesApi.uploadThumbnail(courseId, file);
      setIdentityForm(prev => ({ ...prev, thumbnailUrl }));
      toast.success('Thumbnail uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload thumbnail');
    } finally {
      setIsUploadingThumbnail(false);
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
      case 'INTRODUCTION': return <Play className="h-6 w-6 text-primary" />;
      case 'CLOSING': return <CheckCircle2 className="h-6 w-6 text-success" />;
      case 'LIVE_SESSION': return <VideoIcon className="h-6 w-6 text-orange-500" />;
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
  const isDirty = course && JSON.stringify({
    title: course.title,
    description: course.description || '',
    passingGrade: course.passingGrade,
    targetAudience: course.targetAudience,
    targetDepartments: course.targetDepartments,
    thumbnailUrl: course.thumbnailUrl || '',
    versionTag: course.versionTag || '',
    changeSummary: course.changeSummary || ''
  }) !== JSON.stringify({
    title: identityForm.title,
    description: identityForm.description,
    passingGrade: identityForm.passingGrade,
    targetAudience: identityForm.targetAudience,
    targetDepartments: identityForm.targetDepartments,
    thumbnailUrl: identityForm.thumbnailUrl,
    versionTag: identityForm.versionTag,
    changeSummary: identityForm.changeSummary
  });

  const handleDiscardChanges = () => {
    if (course) {
      setIdentityForm({
        title: course.title,
        description: course.description || '',
        passingGrade: course.passingGrade,
        targetAudience: course.targetAudience,
        targetDepartments: course.targetDepartments,
        introContent: course.introContent || '',
        closingContent: course.closingContent || '',
        thumbnailUrl: course.thumbnailUrl || '',
        versionTag: course.versionTag || '',
        changeSummary: course.changeSummary || ''
      });
      toast.info('Changes discarded');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-4 duration-500 relative">
      {isDirty && !isReadonly && (
        <div className="sticky top-4 z-50 bg-background/80 backdrop-blur-md border border-primary/20 shadow-2xl rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-8 duration-500 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Save className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-primary">Unsaved Changes</p>
              <p className="text-xs text-muted-foreground">You have modified the course configuration. Save as draft?</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscardChanges} className="font-bold">
              Discard
            </Button>
            <Button size="sm" onClick={handleUpdateIdentity} disabled={isSavingIdentity} className="font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20">
              {isSavingIdentity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-primary/5" onClick={() => navigate('/creator/courses')}>
            <ArrowLeft className="h-6 w-6 text-primary" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold tracking-tight text-primary">
                {course.title}
              </h1>
              {/* Version tag pill — GitHub release style */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full border text-xs font-mono text-muted-foreground shrink-0">
                <span className="font-bold text-foreground">v{course.version}</span>
                {course.versionTag && (
                  <span>&middot; &ldquo;{course.versionTag}&rdquo;</span>
                )}
              </div>
              {course.status === 'PUBLISHED' && <Badge variant="success" className="text-[10px] font-black uppercase px-2 py-0">PUBLISHED</Badge>}
              {course.status === 'PENDING_APPROVAL' && <Badge variant="warning" className="text-[10px] font-black uppercase px-2 py-0 animate-pulse">PENDING</Badge>}
              {course.status === 'DRAFT' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-white border border-blue-100 rounded-full shadow-sm text-sm font-bold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  Draft
                </div>
              )}
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
                <div className="flex gap-2">
                   <Button 
                    variant="outline"
                    className="h-10 px-4 bg-orange-500 text-white hover:bg-orange-600 border-none font-bold shadow-md shadow-orange-500/20"
                    onClick={() => toast.info('Sequence saved to local memory.')}
                  >
                    <Save className="mr-2 h-4 w-4" /> Save Sequence
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-10 px-4 shadow-lg shadow-primary/20"
                    onClick={handleOpenApprovalDialog}
                  >
                    <Clock className="mr-2 h-4 w-4" /> Request Approval
                  </Button>
                </div>
              )}

              {course.status === 'PENDING_APPROVAL' && (
                <Badge variant="secondary" className="h-10 px-4 flex items-center bg-yellow-500/10 text-yellow-600 border-yellow-200 animate-pulse">
                  <Clock className="mr-2 h-4 w-4" /> Under Review
                </Badge>
              )}
            </>
          )}

          {course.status === 'PUBLISHED' && (
            <div className="flex gap-2">
              <Badge variant="success" className="h-10 px-4 flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" /> Published &amp; Live
              </Badge>
              {(user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
                <>
                  {/* Step 4: Always show Create New Draft for Admin/LM on published courses */}
                  <Button
                    size="sm"
                    onClick={handleCreateDraftVersion}
                    disabled={isVersioning}
                    className="h-10 px-4 font-bold shadow-lg shadow-primary/20"
                  >
                    {isVersioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CopyPlus className="mr-2 h-4 w-4" />}
                    New Version
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 px-4 border-dashed border-muted-foreground/30 text-muted-foreground hover:text-destructive hover:border-destructive/50"
                    onClick={() => setIsUnpublishDialogOpen(true)}
                  >
                    <EyeOff className="mr-2 h-4 w-4" /> Unpublish Course
                  </Button>
                </>
              )}
            </div>
          )}
          {isReadonly && course.status !== 'PUBLISHED' && (
             <Badge variant="outline" className="h-10 px-4 flex items-center gap-2 text-sm bg-muted text-muted-foreground border-none">
                <Eye className="h-4 w-4" /> Read Only Mode
             </Badge>
          )}
        </div>

      </div>

      {/* Unpublish Confirmation Dialog */}
      <AlertDialog open={isUnpublishDialogOpen} onOpenChange={setIsUnpublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-destructive" />
              Unpublish This Course?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This will immediately remove the course from the live catalog and prevent new enrollments.
              </span>
              <span className="block p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-medium">
                ⚠️ <strong>Data Risk:</strong> If you intend to make significant edits, we <strong>highly recommend</strong> using <em>"New Version"</em> instead. Unpublishing then deleting modules can corrupt progress records for active learners.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel — Keep Published</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnpublish}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Yes, Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Release Notes / Request Approval Dialog ── */}
      <Dialog open={approvalDialog.isOpen} onOpenChange={(open) => setApprovalDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <HistoryIcon className="h-4 w-4 text-primary" />
              </div>
              Submit Version for Approval
            </DialogTitle>
            <DialogDescription>
              <span className="block mt-1">
                Like a GitHub release — give this version a tag and describe what changed. The Learning Manager will see this when reviewing.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Version tag */}
            <div className="space-y-2">
              <Label htmlFor="approval-tag" className="flex items-center gap-2 font-bold">
                <span className="font-mono text-xs px-1.5 py-0.5 bg-foreground text-background rounded">
                  v{course?.version}
                </span>
                Version Tag
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                id="approval-tag"
                value={approvalDialog.versionTagDraft}
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, versionTagDraft: e.target.value }))}
                placeholder='e.g. "2025 Compliance Refresh", "Workshop Module Rewrite"'
                className="font-mono"
                disabled={approvalDialog.isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                This becomes the permanent label for this version in the course history.
              </p>
            </div>

            {/* Change summary */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="approval-summary" className="font-bold">
                  What changed in this version?
                </Label>
                {approvalDialog.isGeneratingDiff && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Analyzing blueprints...
                  </div>
                )}
                {!approvalDialog.isGeneratingDiff && approvalDialog.changeSummary && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" /> Smart Diff Ready
                  </div>
                )}
              </div>
              <Textarea
                id="approval-summary"
                value={approvalDialog.changeSummary}
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, changeSummary: e.target.value }))}
                placeholder="• Bullet points of changes..."
                className="min-h-[140px] font-mono text-sm bg-slate-50 border-slate-200"
                disabled={approvalDialog.isSubmitting || approvalDialog.isGeneratingDiff}
              />
              <p className="text-[10px] text-muted-foreground italic">
                {approvalDialog.isGeneratingDiff ? "Stand by while we compare versions..." : "Review and polish the auto-generated notes above."}
              </p>
            </div>

            {/* Preview pill */}
            {approvalDialog.versionTagDraft.trim() && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed animate-in fade-in duration-200">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-full border text-xs font-mono">
                  <span className="font-bold text-foreground">v{course?.version}</span>
                  <span className="text-muted-foreground">&middot; &ldquo;{approvalDialog.versionTagDraft}&rdquo;</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setApprovalDialog(prev => ({ ...prev, isOpen: false }))}
              disabled={approvalDialog.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitForApproval}
              disabled={approvalDialog.isSubmitting}
              className="shadow-lg shadow-primary/20 font-bold"
            >
              {approvalDialog.isSubmitting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Clock className="mr-2 h-4 w-4" />}
              {approvalDialog.isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approver Review Command Center ── visible to Admin/LM when course is pending */}
      {course.status === 'PENDING_APPROVAL' && (user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
        <div className="mb-10 rounded-[2.5rem] bg-white/70 backdrop-blur-3xl border-2 border-primary/10 shadow-[0_32px_64px_-12px_rgba(234,179,8,0.12)] overflow-hidden animate-in fade-in zoom-in-95 duration-700">
          <div className="p-8">
            {/* Header: Identity & Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-sm shadow-primary/5">
                  <Clock className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Governance Protocol</span>
                    <Badge variant="outline" className="bg-primary text-white border-none text-[10px] font-black py-0 px-2 rounded-full">Review Required</Badge>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {course.title.replace(/\s*\(Draft\)$/i, '')}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <Button
                  variant="outline"
                  className="flex-1 lg:flex-none h-14 px-8 border-slate-200 text-slate-500 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 font-bold rounded-2xl transition-all"
                  onClick={() => handleUpdateStatus('DRAFT')}
                >
                  <XCircle className="mr-2 h-5 w-5" /> Reject Version
                </Button>
                <Button
                  className="flex-1 lg:flex-none h-14 px-10 bg-success hover:bg-success/90 text-white font-black rounded-2xl shadow-xl shadow-success/20 border-none transition-all hover:scale-[1.02] active:scale-95"
                  onClick={() => handleUpdateStatus('PUBLISHED')}
                >
                  <CheckCircle className="mr-2 h-6 w-6" /> Approve &amp; Publish
                </Button>
              </div>
            </div>

            {/* Grid: Metadata & Release Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Stats Bar */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-1 group hover:bg-primary/10 transition-colors">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Version</p>
                    <p className="text-xl font-mono font-black text-slate-900">v{course.version}</p>
                    <p className="text-[10px] text-slate-500 truncate font-medium">{course.versionTag || 'Unlabeled Release'}</p>
                  </div>
                  <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-1 group hover:bg-primary/10 transition-colors">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Blueprint</p>
                    <p className="text-xl font-black text-slate-900">{(course._count?.modules ?? course.modules?.length ?? 0)}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Components</p>
                  </div>
                </div>
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-xs font-black text-primary uppercase border-2 border-primary/20 shadow-sm">
                    {course.lecturer?.firstName?.charAt(0)}{course.lecturer?.lastName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted By</p>
                    <p className="text-base font-bold text-slate-800">{course.lecturer ? `${course.lecturer.firstName} ${course.lecturer.lastName}` : '---'}</p>
                  </div>
                </div>
              </div>

              {/* Release Notes */}
              <div className="lg:col-span-8">
                <div className="h-full rounded-3xl bg-white border border-slate-100 p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-primary/20"></div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="h-3 w-3" /> Smart Diff / Release Notes
                  </p>
                  <div className="max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                    <pre className="text-sm text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                      {course.changeSummary || 'The system detected no significant structural changes for this version.'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending notice for non-approvers (the creator themselves) ── */}
      {course.status === 'PENDING_APPROVAL' && user?.role === 'COURSE_CREATOR' && (
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-200 animate-in fade-in duration-500">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-800">Version Submitted for Review</p>
            <p className="text-sm text-amber-700">
              {course.versionTag ? `v${course.version} · "${course.versionTag}" is` : `v${course.version} is`} awaiting approval from a Learning Manager. This course is locked until a decision is made.
            </p>
          </div>
          {course.versionTag && (
            <div className="px-3 py-1.5 bg-amber-200 text-amber-800 rounded-full text-xs font-bold font-mono shrink-0">
              &ldquo;{course.versionTag}&rdquo;
            </div>
          )}
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
                          setRichTextModalState={setRichTextModalState}
                          setLiveSessionModalState={setLiveSessionModalState}
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
                            <SelectItem value="INTRODUCTION" className="font-bold">Course Introduction</SelectItem>
                            <SelectItem value="CLOSING" className="font-bold">Course Wrap-up</SelectItem>
                            <SelectItem value="PRE_QUIZ" className="font-bold">Assessment: Pre-Quiz</SelectItem>
                            <SelectItem value="POST_QUIZ" className="font-bold">Assessment: Post-Quiz</SelectItem>
                            <SelectItem value="WORKSHOP" className="font-bold">Workshop/Activity</SelectItem>
                            <SelectItem value="EVALUATION" className="font-bold">Quality Survey</SelectItem>
                            <SelectItem value="ONLINE_EVALUATION" className="font-bold">K.A.S.H. Assessment</SelectItem>
                            <SelectItem value="LIVE_SESSION" className="font-bold">Blended: Live Session</SelectItem>
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
            isEnabled={course.hasCertificate}
            onToggleEnabled={handleToggleCertificate}
            readonly={isReadonly}
          />
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-8">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Course Branding & Config</CardTitle>
                <CardDescription>Update the visual identity and metadata for this learning experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Thumbnail Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-widest text-primary">Course Thumbnail</Label>
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-64 h-36 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center bg-muted/5 overflow-hidden relative group">
                      {identityForm.thumbnailUrl ? (
                        <>
                          <img src={identityForm.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                          {!isReadonly && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Label htmlFor="thumb-upload" className="cursor-pointer text-white text-xs font-bold uppercase tracking-widest bg-primary/80 px-4 py-2 rounded-full">Change Image</Label>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-[10px] font-black uppercase">No Image</span>
                        </div>
                      )}
                      {!isReadonly && !identityForm.thumbnailUrl && (
                        <Label htmlFor="thumb-upload" className="absolute inset-0 cursor-pointer" />
                      )}
                      <input 
                        id="thumb-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={isReadonly || isUploadingThumbnail}
                        onChange={handleThumbnailUpload} 
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-bold text-muted-foreground">Recommendation</p>
                      <ul className="text-xs text-muted-foreground/60 space-y-1 list-disc pl-4">
                        <li>16:9 Aspect Ratio (e.g., 1280x720)</li>
                        <li>High contrast imagery works best</li>
                        <li>Max file size: 2MB</li>
                      </ul>
                      {isUploadingThumbnail && (
                        <div className="flex items-center gap-2 text-primary font-bold text-xs animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading branding assets...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="space-y-2">
                    <Label htmlFor="c-title" className="flex items-center gap-2">
                      Course Title
                      {course.parentId && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Locked</span>
                      )}
                    </Label>
                    <Input 
                      id="c-title" 
                      disabled={isReadonly || !!course.parentId}
                      value={identityForm.title}
                      onChange={(e) => setIdentityForm({...identityForm, title: e.target.value})}
                    />
                    {course.parentId && (
                      <p className="text-xs text-muted-foreground">The course title is the canonical name for this lineage and cannot be changed per-version.</p>
                    )}
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


                <div className="h-px bg-slate-100 my-4" />

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
                    Update Draft
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

            {/* Version Governance & History */}
            {course.parentId && (
              <div className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                    <HistoryIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Version Governance</h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Blueprint Lineage & Audit Trail</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                  {/* Left: Editor */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-black text-slate-700 text-xs uppercase tracking-widest flex items-center gap-3">
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                          Active Version Metadata
                        </Label>
                        <Badge variant="outline" className="font-mono text-[10px] py-0 px-2 bg-white">v{course.version}</Badge>
                      </div>
                      
                      <div className="p-1 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <Input 
                          placeholder="Release Name (e.g. 2025 Compliance Refresh)"
                          value={identityForm.versionTag}
                          onChange={(e) => setIdentityForm({...identityForm, versionTag: e.target.value})}
                          className="h-12 border-none bg-transparent font-mono text-sm focus-visible:ring-0 px-4"
                          disabled={isReadonly && course.status !== 'PENDING_APPROVAL'}
                        />
                        <div className="h-px bg-slate-100 mx-4" />
                        <Textarea 
                          placeholder="What changed in this version? Detailed release notes..."
                          value={identityForm.changeSummary}
                          onChange={(e) => setIdentityForm({...identityForm, changeSummary: e.target.value})}
                          className="min-h-[160px] border-none bg-transparent font-mono text-sm focus-visible:ring-0 p-4 resize-none"
                          disabled={isReadonly && course.status !== 'PENDING_APPROVAL'}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 italic px-2">
                        * These metadata fields can be refined even while the course is in "Pending Approval" state.
                      </p>
                    </div>
                  </div>

                      {/* Right: Lineage Timeline */}
                      <div className="lg:col-span-5 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2">
                            <Layers className="h-3 w-3 text-slate-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Release Timeline</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-mono bg-slate-100/50 border-slate-200">
                            {lineageVersions.length} {lineageVersions.length === 1 ? 'Snapshot' : 'Snapshots'}
                          </Badge>
                        </div>

                        <div className="relative flex-1 max-h-[520px] overflow-y-auto pr-4 custom-scrollbar">
                          {/* The Track */}
                          <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-slate-200"></div>

                          <div className="relative pl-10 space-y-6">
                            {lineageVersions.map((v) => (
                              <VersionTimelineItem 
                                key={v.id} 
                                v={v} 
                                isCurrent={v.id === course.id} 
                              />
                            ))}
                          </div>
                        </div>

                        {lineageVersions.length > 5 && (
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">End of Audit Stream</p>
                          </div>
                        )}
                      </div>
                </div>
              </div>
            )}
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
                    <SelectItem value="VIDEO">Video Production</SelectItem>
                    <SelectItem value="INTRODUCTION">Course Introduction</SelectItem>
                    <SelectItem value="CLOSING">Course Wrap-up</SelectItem>
                    <SelectItem value="PRE_QUIZ">Pre-Quiz</SelectItem>
                    <SelectItem value="WORKSHOP">Workshop / Activity</SelectItem>
                    <SelectItem value="POST_QUIZ">Post-Quiz Assessment</SelectItem>
                    <SelectItem value="EVALUATION">Quality Evaluation</SelectItem>
                    <SelectItem value="ONLINE_EVALUATION">Online Evaluation (K.A.S.H.)</SelectItem>
                    <SelectItem value="LIVE_SESSION">Live Session / Webinar</SelectItem>
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
        onUpdate={() => fetchCourse(true)}
      />


      <EvaluationTemplatePicker 
        courseId={courseId!}
        moduleId={evaluationModalState.moduleId}
        category={evaluationModalState.category}
        isOpen={evaluationModalState.isOpen}
        onClose={() => setEvaluationModalState({ ...evaluationModalState, isOpen: false })}
        onUpdate={() => fetchCourse(true)}
      />


      <RichTextModuleBuilder 
        courseId={courseId!}
        moduleId={richTextModalState.moduleId}
        isOpen={richTextModalState.isOpen}
        onClose={() => setRichTextModalState({ ...richTextModalState, isOpen: false })}
        onUpdate={() => fetchCourse(true)}
      />

      <LiveSessionBuilder 
        courseId={courseId!}
        moduleId={liveSessionModalState.moduleId}
        isOpen={liveSessionModalState.isOpen}
        onClose={() => setLiveSessionModalState({ ...liveSessionModalState, isOpen: false })}
        onUpdate={() => fetchCourse(true)}
      />


    </div>
  );
};
