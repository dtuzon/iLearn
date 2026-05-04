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
  Loader2, 
  ArrowLeft, 
  Plus, 
  GripVertical, 
  Trash2, 
  Save, 
  Search, 
  BookOpen, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  Route, 
  Award, 
  Layers,
  Settings,
  EyeOff,
  Image as ImageIcon
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
}

const SortableCourseItem: React.FC<SortableCourseItemProps> = ({ 
  item, 
  index, 
  onRemove, 
  onMoveUp, 
  onMoveDown,
  isFirst,
  isLast
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
    <div 
      ref={setNodeRef} 
      style={style} 
      className="group relative flex items-center gap-4 p-4 bg-background border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-primary">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono text-xs">Step {index + 1}</Badge>
          <h4 className="font-bold truncate">{item.course.title}</h4>
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.course.description || 'No description'}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => onMoveUp(index)}
          disabled={isFirst}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => onMoveDown(index)}
          disabled={isLast}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
      const [pathData, coursesData, deptsData] = await Promise.all([
        learningPathsApi.getById(id),
        coursesApi.getAll(),
        departmentsApi.getAll()
      ]);
      setPath(pathData);
      setDepartments(deptsData);
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

  const handleUpdateStatus = async (status: string) => {
    if (!id) return;
    try {
      await learningPathsApi.updateStatus(id, status);
      toast.success(`Path status updated to ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdateIdentity = async () => {
    if (!id) return;
    try {
      await learningPathsApi.update(id, identityForm);
      toast.success('Path settings updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDragEnd = (event: DragEndEvent) => {
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
    if (!path) return;
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-background/50 backdrop-blur-md p-6 rounded-3xl border shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/creator/learning-paths')} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 font-black">BUILDER</Badge>
              <h1 className="text-2xl font-black tracking-tight">{path.title}</h1>
              {path.status === 'PUBLISHED' ? (
                <Badge className="bg-success hover:bg-success/90 border-none px-3 py-1">LIVE</Badge>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-white border border-blue-100 rounded-full shadow-sm text-xs font-bold text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  Draft
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-medium">{path.description || 'Enterprise Learning Path'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {path.status === 'DRAFT' ? (
            <Button 
              onClick={() => handleUpdateStatus('PUBLISHED')}
              className="rounded-xl bg-success hover:bg-success/90 shadow-lg shadow-success/20 font-bold"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Publish Path
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={() => handleUpdateStatus('DRAFT')}
              className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 font-bold"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Unpublish
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="rounded-xl shadow-lg shadow-primary/20 font-bold">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Sequence
          </Button>
        </div>
      </div>


      <Tabs defaultValue="curriculum" className="w-full">

        <TabsList className="bg-background/50 backdrop-blur-md p-1 rounded-2xl border mb-6">
          <TabsTrigger value="curriculum" className="rounded-xl px-6 gap-2">
            <Layers className="h-4 w-4" />
            Curriculum Sequence
          </TabsTrigger>
          <TabsTrigger value="certificate" className="rounded-xl px-6 gap-2">
            <Award className="h-4 w-4" />
            Macro-Credential Settings
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl px-6 gap-2">
            <Settings className="h-4 w-4" />
            Path Settings
          </TabsTrigger>
        </TabsList>


        <TabsContent value="curriculum" className="space-y-6 animate-in slide-in-from-left-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 h-[calc(100vh-360px)] min-h-[500px]">
            {/* Left Side: The Path Sequence */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <Card className="flex-1 flex flex-col border-none shadow-xl bg-background/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Route className="h-5 w-5 text-primary" />
                        Path Sequence
                      </CardTitle>
                      <CardDescription>Drag and drop or use controls to define the learner's journey.</CardDescription>
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

            {/* Right Side: Course Library */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card className="flex-1 flex flex-col border-none shadow-xl bg-background/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/10">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Course Library
                  </CardTitle>
                  <CardDescription>Only published courses are available for paths.</CardDescription>
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Filter published courses..." 
                      className="pl-9 bg-background/50 border-primary/10 h-10"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {filteredCourses.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground opacity-50 italic">
                        {courseSearch ? 'No matching courses found.' : 'No available courses to add.'}
                      </div>
                    ) : (
                      filteredCourses.map(course => (
                        <div 
                          key={course.id} 
                          className="p-4 rounded-2xl border bg-background hover:border-primary/50 transition-all group flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm truncate">{course.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1 h-4">{course.passingGrade}% Pass</Badge>
                              <Badge variant="outline" className="text-[10px] px-1 h-4">{(course as any)._count?.modules || 0} Modules</Badge>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => addToPath(course)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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
                try {
                  await learningPathsApi.update(path.id, { hasCertificate: checked });
                  setPath({ ...path, hasCertificate: checked });
                  toast.success(checked ? 'Certificate enabled' : 'Certificate disabled');
                } catch (error) {
                  toast.error('Failed to update certificate status');
                }
              }}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select 
                    value={identityForm.targetAudience} 
                    onValueChange={(val) => setIdentityForm({...identityForm, targetAudience: val})}
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
                />
              </div>

              <Button onClick={handleUpdateIdentity} className="h-12 px-8 font-black uppercase tracking-widest shadow-lg shadow-primary/20 rounded-xl">
                Update Path Identity
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
};

