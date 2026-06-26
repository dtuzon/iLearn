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
import { departmentsApi, type Department } from '../../api/departments.api';
import { useAuth } from '../../context/AuthContext';
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
    isDragging
  } = useSortable({ id: item.id });

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

      <Card className={`ml-4 border-none shadow-sm transition-all duration-300 hover:shadow-md ${isDragging ? 'shadow-xl' : isReadonly ? 'cursor-default' : 'group-hover:translate-x-1 cursor-grab'}`}>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {!isReadonly && (
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded-md shrink-0">
                  <GripVertical className="h-5 w-5 text-muted-foreground/30" />
                </div>
              )}
              <div className="text-xs font-black text-muted-foreground/30 font-mono min-w-[50px] shrink-0">STEP {index + 1}</div>

              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Route className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0">
                <div className="font-bold text-lg truncate">{item.course.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {item.course.description || 'Enterprise course module in this learning sequence.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="flex flex-col items-end">
                <Badge variant="secondary" className="text-[10px] font-bold tracking-tighter uppercase">
                  {(item.course as any)._count?.modules || item.course.modules?.length || 0} Modules
                </Badge>
                <span className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">
                  {item.course.passingGrade}% Pass Req.
                </span>
              </div>

              {!isReadonly && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(item.id)}
                  className="h-8 w-8 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
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
      <div className={`absolute -left-[30px] top-1 h-[20px] w-[20px] rounded-full border-4 bg-background z-10 transition-all ${isCurrent ? 'border-primary shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-border group-hover:border-muted-foreground/30'}`}></div>

      <div
        className={`space-y-2 p-3 rounded-2xl transition-all cursor-pointer ${isCurrent ? 'bg-primary/5 border border-primary/10' : 'hover:bg-muted/50 hover:shadow-sm hover:border-border border border-transparent'}`}
        onClick={() => !isCurrent && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded ${isCurrent ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
              v{v.version}
            </span>
            {isCurrent && <span className="text-[9px] font-black text-primary uppercase animate-pulse">Active</span>}
          </div>
          <span className="text-[9px] text-muted-foreground font-bold tabular-nums">
            {v.updatedAt ? new Date(v.updatedAt).toLocaleDateString() : '---'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-bold tracking-tight truncate ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
            {v.versionTag || 'Unlabeled Release'}
          </p>
          {!isCurrent && v.changeSummary && (
            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          )}
        </div>

        {/* Expanded Release Notes */}
        {(isCurrent || (isExpanded && v.changeSummary)) && (
          <div className={`animate-in slide-in-from-top-1 duration-300 overflow-hidden`}>
            <div className={`p-3 rounded-xl font-mono text-[11px] leading-relaxed italic ${isCurrent ? 'bg-background/60 text-muted-foreground' : 'bg-muted/30 text-muted-foreground border border-border/50'}`}>
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
  const [isSequenceDirty, setIsSequenceDirty] = useState(false);
  const { user } = useAuth();

  const [approvalDialog, setApprovalDialog] = useState({
    isOpen: false,
    versionTagDraft: '',
    changeSummary: '',
    isGeneratingDiff: false,
    isSubmitting: false
  });
  
  const [isDiscarding, setIsDiscarding] = useState(false);

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
      setIsSequenceDirty(false);
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

    // Find the most recently published version in the lineage for comparison
    // lineagePaths may not have full pathCourses detail — we compare the live `path` vs
    // a previously published snapshot. If no published sibling exists, it's v1.
    const prevPublished = lineagePaths.find(p => p.status === 'PUBLISHED' && p.id !== path.id);

    if (!prevPublished || !prevPublished.pathCourses) {
      // First version or no comparable published version — generate an initial summary
      const lines: string[] = [];
      const currentTitle = identityForm.title || path.title;
      lines.push(`• Initial configuration: "${currentTitle}"`);
      if (path.pathCourses?.length > 0) {
        lines.push(`• Defined sequence of ${path.pathCourses.length} course(s)`);
        path.pathCourses
          .sort((a, b) => a.order - b.order)
          .forEach((pc, i) => lines.push(`  ${i + 1}. ${pc.course?.title || pc.courseId}`));
      }
      return lines.join('\n');
    }

    const changes: string[] = [];

    // 1. Metadata changes — compare form (unsaved) vs published parent
    const currentTitle = identityForm.title || path.title;
    if (currentTitle !== prevPublished.title) {
      changes.push(`Renamed path: "${prevPublished.title}" → "${currentTitle}"`);
    }
    const currentDesc = identityForm.description || path.description || '';
    if (currentDesc !== (prevPublished.description || '')) {
      changes.push('Updated path description and learning objectives');
    }
    const currentAudience = identityForm.targetAudience || path.targetAudience;
    if (currentAudience !== prevPublished.targetAudience) {
      changes.push(`Changed target audience: ${prevPublished.targetAudience?.replace(/_/g, ' ')} → ${currentAudience?.replace(/_/g, ' ')}`);
    }

    // 2. Sequence changes
    const currentCourses = path.pathCourses || [];
    const prevCourses = prevPublished.pathCourses || [];

    const currentIds = new Set(currentCourses.map(pc => pc.courseId));
    const prevIds = new Set(prevCourses.map(pc => pc.courseId));

    // Added
    const added = currentCourses.filter(pc => !prevIds.has(pc.courseId));
    added.forEach(pc => changes.push(`Added course: "${pc.course?.title || pc.courseId}"`)  );

    // Removed
    const removed = prevCourses.filter(pc => !currentIds.has(pc.courseId));
    removed.forEach(pc => changes.push(`Removed course: "${pc.course?.title || pc.courseId}"`)  );

    // Reordering — only for courses present in both
    const sharedCurrent = currentCourses
      .filter(pc => prevIds.has(pc.courseId))
      .sort((a, b) => a.order - b.order)
      .map(pc => pc.courseId);
    const sharedPrev = prevCourses
      .filter(pc => currentIds.has(pc.courseId))
      .sort((a, b) => a.order - b.order)
      .map(pc => pc.courseId);
    if (JSON.stringify(sharedCurrent) !== JSON.stringify(sharedPrev)) {
      changes.push('Restructured the course sequence and learning flow');
    }

    // 3. Certificate
    if (path.hasCertificate !== prevPublished.hasCertificate) {
      changes.push(path.hasCertificate ? 'Enabled path completion certificate' : 'Disabled path completion certificate');
    }

    return changes.length > 0
      ? changes.map(c => `• ${c}`).join('\n')
      : '• Minor adjustments and path polishing.';
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

  const isIdentityDirty = path && JSON.stringify({
    title: path.title,
    description: path.description || '',
    targetAudience: path.targetAudience || 'GENERAL',
    targetDepartments: path.targetDepartments || [],
    thumbnailUrl: path.thumbnailUrl || ''
  }) !== JSON.stringify({
    title: identityForm.title,
    description: identityForm.description,
    targetAudience: identityForm.targetAudience,
    targetDepartments: identityForm.targetDepartments,
    thumbnailUrl: identityForm.thumbnailUrl
  });

  const isDirty = isSequenceDirty || isIdentityDirty;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isReadonly) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isReadonly]);

  const handleBack = () => {
    if (isDirty && !isReadonly) {
      if (window.confirm("You have unsaved changes. Are you sure you want to discard them and leave?")) {
        navigate('/creator/learning-paths');
      }
    } else {
      navigate('/creator/learning-paths');
    }
  };

  const handleSave = async () => {
    if (!id || !path || isReadonly) return;
    setIsSaving(true);
    try {
      if (isIdentityDirty) {
        await learningPathsApi.update(id, {
          ...identityForm,
          versionTag: path?.versionTag,
          changeSummary: path?.changeSummary
        });
      }
      if (isSequenceDirty) {
        const syncData = path.pathCourses.map(pc => ({
          courseId: pc.courseId,
          order: pc.order
        }));
        await learningPathsApi.syncCourses(path.id, syncData);
      }
      toast.success('Path saved successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to save path');
    } finally {
      setIsSaving(false);
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

  const handleDiscardDraft = async () => {
    if (!id || !window.confirm('Are you sure you want to discard this draft? This will permanently delete this version.')) return;
    setIsDiscarding(true);
    try {
      await learningPathsApi.discardDraft(id);
      toast.success('Draft discarded successfully');
      navigate('/creator/learning-paths');
    } catch (error) {
      toast.error('Failed to discard draft');
    } finally {
      setIsDiscarding(false);
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
      setIsSequenceDirty(true);
    }
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
    setIsSequenceDirty(true);
    toast.success(`Added ${course.title}`);
  };

  const removeStep = (id: string) => {
    if (!path) return;
    const filtered = path.pathCourses.filter(pc => pc.id !== id).map((pc, idx) => ({
      ...pc,
      order: idx + 1
    }));
    setPath({ ...path, pathCourses: filtered });
    setIsSequenceDirty(true);
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
            onClick={handleBack}
            className="rounded-full hover:bg-primary/5 text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-primary">
                {path.title.replace(/\s*\(Draft\)$/i, '')} {path.status === 'DRAFT' && <span className="text-primary/60 font-medium">(Draft)</span>}
              </h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full border text-xs font-mono text-muted-foreground shrink-0">
                <span className="font-bold text-foreground">v{path.version}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-muted border border-border rounded-full shadow-sm text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                {path.status}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Layers className="h-4 w-4 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                Learning Path Studio &bull; {path.pathCourses?.length || 0} Courses
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isReadonly && (
            <Button
              onClick={handleSave}
              disabled={isSaving || (!isDirty && path.status === 'DRAFT')}
              className="h-10 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 border-none"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Path
            </Button>
          )}

          {path.status === 'DRAFT' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDiscardDraft}
                disabled={isDiscarding}
                className="h-10 px-4 border-destructive/20 text-destructive hover:bg-destructive/5 font-bold"
              >
                {isDiscarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Discard Draft
              </Button>
              <Button
                onClick={handleInitiatePublish}
                className="h-10 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 font-bold"
              >
                <Timer className="mr-2 h-4 w-4" /> Publish Path
              </Button>
            </div>
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
        <TabsList className="bg-muted/50 p-1 h-12 mb-6">
          <TabsTrigger value="curriculum" className="h-10 px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Learning Path Loop
          </TabsTrigger>
          <TabsTrigger value="certificate" className="h-10 px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Award className="mr-2 h-4 w-4" /> Certificate Builder
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-10 px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Settings className="mr-2 h-4 w-4" /> Path Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum" className="space-y-8 animate-in slide-in-from-left-4 duration-500">
          {!isReadonly && (
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="p-2 rounded-xl bg-primary/10 shrink-0 mt-0.5">
                <GripVertical className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-primary">Sequence Blueprint</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag and drop the sequence items using the handle icon to reorder your learning path loop.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Side: The Path Sequence */}
            <div className="lg:col-span-3 space-y-6">
              <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-primary before:via-primary/50 before:to-transparent">
                {path.pathCourses.length === 0 ? (
                  <div className="ml-4 p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                    <Layers className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-xl font-bold">No courses added yet.</p>
                    <p className="text-sm">Start building your sequence by adding your first course.</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={path.pathCourses.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                      disabled={isReadonly}
                    >
                      {path.pathCourses.map((item, index) => (
                        <SortableCourseItem
                          key={item.id}
                          item={item}
                          index={index}
                          onRemove={removeStep}
                          isReadonly={isReadonly}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>

            {/* Right Side: Course Library - Hidden if Readonly */}
            {!isReadonly && (
              <div className="space-y-6">
                <Card className="border-none shadow-xl bg-primary/5 sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-lg">Add Course</CardTitle>
                    <CardDescription>Expand the sequence.</CardDescription>
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
                            className="group p-4 bg-background rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex flex-col gap-2">
                              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{course.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] font-bold tracking-tighter uppercase">{course.passingGrade}% Pass Req.</Badge>
                                <span className="text-[10px] text-muted-foreground">{(course as any)._count?.modules || course.modules?.length || 0} Modules</span>
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
                backgroundUrl: path.certificateTemplate?.backgroundImageUrl || undefined,
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

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="p-title">Path Title</Label>
                  <Input
                    id="p-title"
                    value={identityForm.title}
                    onChange={(e) => setIdentityForm({ ...identityForm, title: e.target.value })}
                    placeholder="e.g. Executive Leadership Academy"
                    className="h-11 rounded-xl"
                    disabled={isReadonly || (!!path?.parentId && user?.role !== 'ADMINISTRATOR')}
                  />
                  {path?.parentId && user?.role !== 'ADMINISTRATOR' && (
                    <p className="text-xs text-muted-foreground mt-2">The path title is the canonical name for this lineage and cannot be changed per-version.</p>
                  )}
                  {path?.parentId && user?.role === 'ADMINISTRATOR' && (
                    <p className="text-xs text-amber-500 font-bold mt-2">ADMIN MODE: You are modifying the canonical name for this version.</p>
                  )}
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
                  onChange={(e) => setIdentityForm({ ...identityForm, description: e.target.value })}
                  className="min-h-[120px] rounded-xl"
                  placeholder="Summarize the core impact of this learning journey..."
                  disabled={isReadonly}
                />
              </div>

              {!isReadonly && (
                <div className="h-4" />
              )}

              {/* Version Governance Section */}
              <div className="pt-12 mt-12 border-t border-border">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                      <HistoryIcon className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Version Governance</h2>
                      <p className="text-sm text-muted-foreground">Audit lineage and version history for this learning journey.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {lineagePaths.length} Snapshots Captured
                  </div>
                </div>

                <div className="w-full">
                  {/* Lineage Timeline */}
                  <div className="flex flex-col">
                    <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-[400px] max-h-[600px]">
                      <div className="flex items-center justify-between mb-8 shrink-0">
                        <h3 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Audit Stream</h3>
                        <Badge variant="outline" className="bg-muted border-border text-[10px] font-bold">LATEST: v{path.version}</Badge>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        <div className="relative">
                          {/* Vertical Track */}
                          <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-border"></div>

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

                      <div className="mt-8 pt-6 border-t border-border shrink-0">
                        <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest italic">End of Audit Stream</p>
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
                className="min-h-[140px] font-mono text-sm bg-muted/30 border-border"
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
              className="font-bold text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleFinalPublish}
              disabled={approvalDialog.isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
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

