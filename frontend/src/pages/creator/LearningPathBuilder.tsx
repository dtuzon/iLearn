import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { learningPathsApi } from '../../api/learning-paths.api';
import type { LearningPath, LearningPathCourse } from '../../api/learning-paths.api';
import { coursesApi } from '../../api/courses.api';
import type { Course } from '../../api/courses.api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Label } from '../../components/ui/label';
import { CertificateBuilder } from '../../components/creator/CertificateBuilder';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '../../components/ui/dialog';

import { 
  Loader2, 
  ArrowLeft, 
  Plus, 
  GripVertical, 
  Trash2, 
  Save, 
  Search, 
  ChevronDown, 
  CheckCircle2, 
  CheckCircle,
  Route, 
  Award, 
  Layers,
  Settings,
  EyeOff,
  Image as ImageIcon,
  History as HistoryIcon,
  Timer
} from 'lucide-react';

import { toast } from 'sonner';
import { Textarea } from '../../components/ui/textarea';
import { MultiSelect } from '../../components/ui/multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { departmentsApi, type Department } from '../../api/departments.api';

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

interface SortableCourseItemProps {
  item: LearningPathCourse;
  index: number;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
  isReadonly: boolean;
}

const SortableCourseItem: React.FC<SortableCourseItemProps> = ({ 
  item, 
  index, 
  onRemove, 
  isReadonly
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group pl-12">
      {/* Vertical Track Connector */}
      <div className="absolute left-4 top-0 bottom-0 flex flex-col items-center">
        <div className="w-[2px] h-full bg-amber-100 group-last:h-1/2"></div>
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-amber-400 bg-white shadow-sm flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </div>

      <div className="absolute left-10 top-1/2 -translate-y-1/2 -rotate-90 origin-center whitespace-nowrap">
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Step {index + 1}</span>
      </div>

      <Card className={`mb-4 border-none shadow-sm transition-all hover:shadow-md bg-white ${isReadonly ? 'cursor-default' : 'cursor-grab'}`}>
        <CardContent className="p-5 flex items-center gap-6">
          {!isReadonly && (
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-50 rounded transition-colors">
              <GripVertical className="h-4 w-4 text-slate-300" />
            </div>
          )}
          
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0">
            <Route className="h-6 w-6 text-amber-600" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
              {item.course.title}
            </h4>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
              {item.course.description || 'Enterprise course module in this learning sequence.'}
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end">
              <Badge variant="outline" className="text-[10px] font-mono px-2 py-0 bg-slate-50 border-slate-100 text-slate-500">
                {(item.course as any)._count?.modules || 0} Components
              </Badge>
              <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                {item.course.passingGrade}% Pass Req.
              </span>
            </div>

            {!isReadonly && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onRemove(item.id)}
                  className="h-8 w-8 rounded-lg text-slate-300 hover:text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


interface VersionTimelineItemProps {
  v: LearningPath;
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

export const LearningPathBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [lineagePaths, setLineagePaths] = useState<LearningPath[]>([]);
  
  const [approvalDialog, setApprovalDialog] = useState({
    isOpen: false,
    versionTagDraft: '',
    changeSummary: '',
    isGeneratingDiff: false,
    isSubmitting: false
  });

  const isReadonly = path?.status === 'PUBLISHED' || path?.status === 'ARCHIVED';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [pathData, coursesData, deptsData, versionsData] = await Promise.all([
        learningPathsApi.getById(id),
        coursesApi.getAll(),
        departmentsApi.getAll(),
        learningPathsApi.getVersions(id)
      ]);
      setPath(pathData);
      setDepartments(deptsData);
      setLineagePaths(versionsData);
      setIdentityForm({
        title: pathData.title,
        description: pathData.description || '',
        targetAudience: pathData.targetAudience || 'GENERAL',
        targetDepartments: pathData.targetDepartments || [],
        thumbnailUrl: pathData.thumbnailUrl || ''
      });

      // Only show published courses that aren't already in the path
      const published = coursesData.filter(c => c.status === 'PUBLISHED');

      setAllCourses(published);
    } catch (error) {
      toast.error('Failed to load builder data');
    } finally {
      setIsLoading(false);
    }
  };

  const [identityForm, setIdentityForm] = useState({
    title: '',
    description: '',
    targetAudience: 'GENERAL',
    targetDepartments: [] as string[],
    thumbnailUrl: ''
  });

  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setIsUploadingThumbnail(true);
    try {
      const { thumbnailUrl } = await learningPathsApi.uploadThumbnail(id, file);
      setIdentityForm(prev => ({ ...prev, thumbnailUrl }));
      toast.success('Thumbnail uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload thumbnail');
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleUpdateStatus = async (status: string, versionTag?: string, changeSummary?: string) => {
    if (!id) return;
    try {
      await learningPathsApi.updateStatus(id, status, versionTag, changeSummary);
      toast.success(`Path status updated to ${status}`);
      fetchData();
      setApprovalDialog(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const generateSmartDiff = () => {
    if (!path) return '';
    
    // Find the previous published version
    const prev = lineagePaths.find(p => p.status === 'PUBLISHED' && p.id !== path.id);
    if (!prev) return 'Initial path configuration and sequence definition.';

    const changes: string[] = [];

    // 1. Metadata check
    if (path.title !== prev.title) changes.push(`Renamed path from "${prev.title}" to "${path.title}"`);
    if (path.description !== prev.description) changes.push(`Updated path description and objectives`);
    if (path.targetAudience !== prev.targetAudience) changes.push(`Changed target audience to ${path.targetAudience}`);
    
    // 2. Sequence check
    const currentCourseIds = path.pathCourses.map(pc => pc.courseId);
    const prevCourseIds = prev.pathCourses.map(pc => pc.courseId);

    const added = currentCourseIds.filter(cid => !prevCourseIds.includes(cid));
    const removed = prevCourseIds.filter(cid => !currentCourseIds.includes(cid));

    if (added.length > 0) changes.push(`Added ${added.length} new course(s) to the sequence`);
    if (removed.length > 0) changes.push(`Removed ${removed.length} course(s) from the sequence`);
    
    // Check if order changed for existing courses
    const intersection = currentCourseIds.filter(cid => prevCourseIds.includes(cid));
    const currentOrder = intersection;
    const prevOrder = prevCourseIds.filter(cid => currentCourseIds.includes(cid));
    
    if (JSON.stringify(currentOrder) !== JSON.stringify(prevOrder)) {
      changes.push(`Restructured the course sequence and learning flow`);
    }

    if (path.hasCertificate !== prev.hasCertificate) {
      changes.push(path.hasCertificate ? 'Enabled automated certification' : 'Disabled automated certification');
    }

    return changes.length > 0 
      ? changes.map(c => `• ${c}`).join('\n') 
      : '';
  };

  const handleInitiatePublish = () => {
    if (!path) return;
    
    const diff = generateSmartDiff();
    
    // If v1 or has changes, show prompt
    if (path.version === 1 || diff) {
      setApprovalDialog({
        isOpen: true,
        versionTagDraft: path.versionTag || '',
        changeSummary: diff || 'Standard maintenance and sequence validation.',
        isGeneratingDiff: false,
        isSubmitting: false
      });
    } else {
      // Automatic publish if no changes detected
      handleUpdateStatus('PUBLISHED');
    }
  };

  const handleFinalPublish = async () => {
    setApprovalDialog(prev => ({ ...prev, isSubmitting: true }));
    try {
      await handleUpdateStatus('PUBLISHED', approvalDialog.versionTagDraft, approvalDialog.changeSummary);
    } finally {
      setApprovalDialog(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleUpdateIdentity = async () => {
    if (!id || isReadonly) return;
    try {
      await learningPathsApi.update(id, {
        ...identityForm,
        versionTag: path?.versionTag,
        changeSummary: path?.changeSummary
      });
      toast.success('Path settings updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const handleCreateVersion = async () => {
    if (!id) return;
    setIsCreatingVersion(true);
    try {
      const newVersion = await learningPathsApi.createVersion(id);
      toast.success(`New draft version (v${newVersion.version}) created`);
      navigate(`/creator/learning-paths/${newVersion.id}`);
    } catch (error) {
      toast.error('Failed to create new version');
    } finally {
      setIsCreatingVersion(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (isReadonly) return;
    const { active, over } = event;
    if (path && over && active.id !== over.id) {
      const oldIndex = path.pathCourses.findIndex((i) => i.id === active.id);
      const newIndex = path.pathCourses.findIndex((i) => i.id === over.id);
      
      const newPathCourses = arrayMove(path.pathCourses, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        order: idx + 1
      }));
      
      setPath({ ...path, pathCourses: newPathCourses });
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (!path) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= path.pathCourses.length) return;
    
    const newPathCourses = arrayMove(path.pathCourses, index, newIndex).map((item, idx) => ({
      ...item,
      order: idx + 1
    }));
    
    setPath({ ...path, pathCourses: newPathCourses });
  };

  const addToPath = (course: Course) => {
    if (!path) return;
    if (path.pathCourses.some(pc => pc.courseId === course.id)) {
      toast.warning('Course already in path');
      return;
    }

    const newPathCourse: LearningPathCourse = {
      id: `temp-${Date.now()}`,
      learningPathId: path.id,
      courseId: course.id,
      order: path.pathCourses.length + 1,
      course: course
    };

    setPath({
      ...path,
      pathCourses: [...path.pathCourses, newPathCourse]
    });
    toast.success(`Added ${course.title}`);
  };

  const removeStep = (id: string) => {
    if (!path) return;
    const filtered = path.pathCourses.filter(pc => pc.id !== id).map((pc, idx) => ({
      ...pc,
      order: idx + 1
    }));
    setPath({ ...path, pathCourses: filtered });
  };

  const handleSave = async () => {
    if (!path || isReadonly) return;
    setIsSaving(true);
    try {
      const syncData = path.pathCourses.map(pc => ({
        courseId: pc.courseId,
        order: pc.order
      }));
      await learningPathsApi.syncCourses(path.id, syncData);
      toast.success('Path sequence saved successfully');
      fetchData(); // Refresh to get real IDs instead of temp ones
    } catch (error: any) {
      toast.error('Failed to save path sequence');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCourses = allCourses.filter(c => 
    c.title.toLowerCase().includes(courseSearch.toLowerCase()) &&
    !path?.pathCourses.some(pc => pc.courseId === c.id)
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!path) return <div>Path not found</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-6 gap-4">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/creator/learning-paths')} 
            className="rounded-full hover:bg-amber-50 text-amber-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-amber-600 uppercase">
                {path.title} {path.status === 'DRAFT' && <span className="text-amber-500/50 font-medium ml-1 lowercase">({path.status.toLowerCase()})</span>}
              </h1>
              <Badge variant="outline" className="font-mono text-[10px] py-0 px-2 bg-white border-slate-200">v{path.version}</Badge>
              <div className="flex items-center gap-2 px-3 py-1 bg-white border border-blue-100 rounded-full shadow-sm text-[10px] font-bold text-slate-700 uppercase tracking-tighter">
                <CheckCircle2 className="h-3 w-3 text-blue-500" />
                {path.status}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Layers className="h-3.5 w-3.5 text-amber-600/60" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/60">
                Authoring Studio &bull; {path.pathCourses?.length || 0} Components
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isReadonly && (
            <Button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="h-10 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Sequence
            </Button>
          )}

          {path.status === 'DRAFT' && (
            <Button 
              onClick={handleInitiatePublish}
              className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-100 transition-all active:scale-95"
            >
              <Timer className="mr-2 h-4 w-4" /> Publish Path
            </Button>
          )}

          {path.status === 'PUBLISHED' && (
            <>
              <Button 
                variant="outline"
                onClick={() => handleUpdateStatus('DRAFT')}
                className="h-11 px-6 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 font-bold"
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Unpublish
              </Button>

              <Button 
                onClick={handleCreateVersion}
                disabled={isCreatingVersion}
                variant="outline"
                className="h-11 px-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold"
              >
                {isCreatingVersion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                New Version
              </Button>
            </>
          )}
        </div>
      </div>


      <Tabs defaultValue="curriculum" className="w-full">
        <TabsList className="bg-muted/10 p-1 rounded-xl mb-8 flex justify-start w-fit">
          <TabsTrigger value="curriculum" className="rounded-lg px-6 gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-white transition-all">
            <Layers className="h-4 w-4" />
            Curriculum Loop
          </TabsTrigger>
          <TabsTrigger value="certificate" className="rounded-lg px-6 gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-white transition-all">
            <Award className="h-4 w-4" />
            Certificate Builder
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg px-6 gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-white transition-all">
            <Settings className="h-4 w-4" />
            Course Config
          </TabsTrigger>
        </TabsList>


        <TabsContent value="curriculum" className="space-y-6 animate-in slide-in-from-left-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 h-[calc(100vh-360px)] min-h-[500px]">
            {/* Left Side: The Path Sequence */}
            <div className={`${isReadonly ? 'lg:col-span-5' : 'lg:col-span-3'} flex flex-col gap-6`}>
              <Card className="flex-1 flex flex-col border-none shadow-xl bg-background/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Route className="h-5 w-5 text-primary" />
                        Path Sequence
                      </CardTitle>
                      <CardDescription>
                        {isReadonly ? "This published path's sequence is locked to preserve the learner journey." : "Drag and drop or use controls to define the learner's journey."}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="font-bold">{path.pathCourses.length} Courses</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                  {path.pathCourses.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-50 border-2 border-dashed rounded-3xl">
                      <Plus className="h-12 w-12 mb-4" />
                      <h3 className="text-lg font-medium italic">Your path is empty</h3>
                      <p className="text-sm">Select courses from the library on the right to start building the sequence.</p>
                    </div>
                  ) : (
                    <div className="relative pl-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-primary before:via-primary/50 before:to-transparent">
                      <DndContext 
                        sensors={sensors} 
                        collisionDetection={closestCenter} 
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext 
                          items={path.pathCourses.map(pc => pc.id)} 
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-4">
                            {path.pathCourses.map((pc, index) => (
                              <div key={pc.id} className="relative">
                                {/* Step Indicator Dot */}
                                <div className="absolute -left-[30px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background z-10" />
                                <SortableCourseItem 
                                  item={pc} 
                                  index={index}
                                  onRemove={removeStep}
                                  onMoveUp={(idx) => moveStep(idx, 'up')}
                                  onMoveDown={(idx) => moveStep(idx, 'down')}
                                  isFirst={index === 0}
                                  isLast={index === path.pathCourses.length - 1}
                                  isReadonly={isReadonly}
                                />
                              </div>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side: Course Library - Hidden if Readonly */}
            {!isReadonly && (
              <div className="lg:col-span-2 flex flex-col gap-6">
                <Card className="border-none shadow-xl bg-primary/5 sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-lg">Add Course</CardTitle>
                    <CardDescription>Expand the path sequence.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Filter published courses..." 
                        className="pl-10 h-10 bg-background/50"
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-500px)] pr-2 custom-scrollbar">
                      {filteredCourses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-xs italic">
                          No matching courses found.
                        </div>
                      ) : (
                        filteredCourses.map(course => (
                          <div 
                            key={course.id} 
                            onClick={() => addToPath(course)}
                            className="group p-4 bg-background rounded-xl border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex flex-col gap-2">
                              <h4 className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition-colors leading-tight">{course.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-slate-50 text-slate-500">{course.passingGrade}% Pass</Badge>
                                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-slate-50 text-slate-500">{(course as any)._count?.modules || 0} Components</Badge>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="certificate" className="animate-in slide-in-from-right-4 duration-500">
          <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm p-8">
            <CertificateBuilder 
              learningPathId={path.id}
              initialData={{
                backgroundUrl: path.certificateTemplate?.backgroundImageUrl,
                designConfig: path.certificateTemplate?.designConfig
              }}
              isEnabled={path.hasCertificate}
              onToggleEnabled={async (checked) => {
                if (isReadonly) return;
                try {
                  await learningPathsApi.update(path.id, { hasCertificate: checked });
                  setPath({ ...path, hasCertificate: checked });
                  toast.success(checked ? 'Certificate enabled' : 'Certificate disabled');
                } catch (error) {
                  toast.error('Failed to update certificate status');
                }
              }}
              readonly={path.status === 'PUBLISHED' || path.status === 'ARCHIVED' || path.status === 'RETIRED'}
            />
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="animate-in slide-in-from-right-4 duration-500">
          <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm p-8">
            <div className="flex items-center gap-4 mb-8 border-b pb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Path Identity & Branding</h2>
                <p className="text-sm text-muted-foreground">Configure the metadata and visual assets for this learning journey.</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Thumbnail Section */}
              <div className="space-y-3">
                <Label className="text-sm font-bold uppercase tracking-widest text-primary">Path Thumbnail</Label>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-full md:w-64 h-36 rounded-2xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center bg-muted/5 overflow-hidden relative group">
                    {identityForm.thumbnailUrl ? (
                      <>
                        <img src={identityForm.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Label htmlFor="thumb-upload" className="cursor-pointer text-white text-xs font-bold uppercase tracking-widest bg-primary/80 px-4 py-2 rounded-full">Change Image</Label>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-[10px] font-black uppercase">No Image</span>
                      </div>
                    )}
                    {!identityForm.thumbnailUrl && (
                      <Label htmlFor="thumb-upload" className="absolute inset-0 cursor-pointer" />
                    )}
                    <input 
                      id="thumb-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleThumbnailUpload} 
                      disabled={isUploadingThumbnail}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-bold text-muted-foreground">Recommendation</p>
                    <ul className="text-xs text-muted-foreground/60 space-y-1 list-disc pl-4">
                      <li>16:9 Aspect Ratio (e.g., 1280x720)</li>
                      <li>Vibrant imagery that represents the path theme</li>
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
                    <Label htmlFor="p-title">Path Title</Label>
                    <Input 
                      id="p-title" 
                      value={identityForm.title}
                      onChange={(e) => setIdentityForm({...identityForm, title: e.target.value})}
                      placeholder="e.g. Executive Leadership Academy"
                      className="h-11 rounded-xl"
                      disabled={isReadonly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select 
                      value={identityForm.targetAudience} 
                      onValueChange={(val) => setIdentityForm({...identityForm, targetAudience: val})}
                      disabled={isReadonly}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="GENERAL">General Audience</SelectItem>
                        <SelectItem value="PHASE_1_NEW_HIRE">Phase 1: Newly Hired</SelectItem>
                        <SelectItem value="PHASE_2_REGULARIZED">Phase 2: Newly Regularized</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Departments</Label>
                  <MultiSelect 
                    placeholder="Limit visibility to specific departments..."
                    options={departments.map(d => ({ label: d.name, value: d.name }))}
                    selected={identityForm.targetDepartments}
                    onChange={(selected) => setIdentityForm({ ...identityForm, targetDepartments: selected })}
                    disabled={isReadonly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="p-desc">Path Description / Objectives</Label>
                  <Textarea 
                    id="p-desc" 
                    value={identityForm.description}
                    onChange={(e) => setIdentityForm({...identityForm, description: e.target.value})}
                    className="min-h-[120px] rounded-xl"
                    placeholder="Summarize the core impact of this learning journey..."
                    disabled={isReadonly}
                  />
                </div>

                {!isReadonly && (
                  <Button onClick={handleUpdateIdentity} className="h-12 px-8 font-black uppercase tracking-widest shadow-lg shadow-primary/20 rounded-xl">
                    Update Path Identity
                  </Button>
                )}

                {/* Version Governance Section */}
                <div className="pt-12 mt-12 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                        <HistoryIcon className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Version Governance</h2>
                        <p className="text-sm text-slate-500">Audit lineage and version history for this learning journey.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {lineagePaths.length} Snapshots Captured
                    </div>
                  </div>

                  <div className="w-full">
                    {/* Lineage Timeline */}
                    <div className="flex flex-col">
                      <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-[400px] max-h-[600px]">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                          <h3 className="font-black text-sm uppercase tracking-widest text-slate-400">Audit Stream</h3>
                          <Badge variant="outline" className="bg-slate-100/50 border-slate-200 text-[10px] font-bold">LATEST: v{path.version}</Badge>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                          <div className="relative">
                            {/* Vertical Track */}
                            <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-slate-200"></div>

                            <div className="relative pl-10 space-y-8">
                              {lineagePaths.map((v) => (
                                <VersionTimelineItem 
                                  key={v.id} 
                                  v={v} 
                                  isCurrent={v.id === path.id} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-slate-200/50 shrink-0">
                          <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest italic">End of Audit Stream</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

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
              <Label className="flex items-center gap-2 font-bold">
                <span className="font-mono text-xs px-1.5 py-0.5 bg-foreground text-background rounded">
                  v{path?.version}
                </span>
                Version Tag
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                value={approvalDialog.versionTagDraft}
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, versionTagDraft: e.target.value }))}
                placeholder='e.g. "2025 Q1 Compliance Refresh"'
                className="font-mono"
                disabled={approvalDialog.isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                This becomes the permanent label for this version in the path history.
              </p>
            </div>

            {/* Change summary */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="font-bold">
                  What changed in this version?
                </Label>
                {approvalDialog.changeSummary && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" /> Smart Diff Ready
                  </div>
                )}
              </div>
              <Textarea
                value={approvalDialog.changeSummary}
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, changeSummary: e.target.value }))}
                placeholder="• Bullet points of changes..."
                className="min-h-[140px] font-mono text-sm bg-slate-50 border-slate-200"
                disabled={approvalDialog.isSubmitting}
              />
              <p className="text-[10px] text-muted-foreground italic text-center">
                Review and polish the auto-generated notes above.
              </p>
            </div>

            {/* Preview pill */}
            {approvalDialog.versionTagDraft.trim() && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed animate-in fade-in duration-200">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-full border text-xs font-mono">
                  <span className="font-bold text-foreground">v{path?.version}</span>
                  <span className="text-muted-foreground">&middot; &ldquo;{approvalDialog.versionTagDraft}&rdquo;</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setApprovalDialog(prev => ({ ...prev, isOpen: false }))}
              className="font-bold text-slate-500"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFinalPublish}
              disabled={approvalDialog.isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              {approvalDialog.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Confirm & Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

