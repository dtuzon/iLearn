import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';

import { catalogApi } from '../../api/catalog.api';
import { learningPathsApi } from '../../api/learning-paths.api';
import { usersApi } from '../../api/users.api';
import { batchesApi } from '../../api/batches.api';
import { 
  Loader2, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  Building2, 
  ShieldCheck,
  Search,
  BookOpen,
  Layers,
  Clock,
  UserPlus,
  GripVertical,
  Bell
} from 'lucide-react';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { departmentsApi } from '../../api/departments.api';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../../components/ui/scroll-area';

const SortableCourseCard = ({ pc, index, formData, updateCourseSchedule }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pc.courseId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: isDragging ? 'relative' as const : 'static' as const
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-3 items-stretch">
      <div {...attributes} {...listeners} className="flex items-center justify-center p-3 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-primary/5 cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-primary transition-colors shrink-0 shadow-sm">
        <GripVertical className="h-5 w-5" />
      </div>
      <Card className={cn("flex-1 p-5 border-primary/10 shadow-sm rounded-2xl flex flex-col md:flex-row gap-4 md:items-center transition-shadow", isDragging && "shadow-lg border-primary/30 ring-2 ring-primary/20")}>
        <div className="flex items-center gap-4 flex-1">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">{index + 1}</div>
          <span className="font-bold text-sm">{pc.course.title}</span>
        </div>
        <div className="flex gap-2">
          <Input type="date" className="h-10 text-xs rounded-xl" placeholder="Unlock Date"
            value={formData.courseSchedules.find((s: any) => s.courseId === pc.courseId)?.startDate || ''}
            onChange={e => updateCourseSchedule(pc.courseId, 'startDate', e.target.value)}
          />
          <Input type="date" className="h-10 text-xs rounded-xl" placeholder="Deadline"
            value={formData.courseSchedules.find((s: any) => s.courseId === pc.courseId)?.endDate || ''}
            onChange={e => updateCourseSchedule(pc.courseId, 'endDate', e.target.value)}
          />
        </div>
      </Card>
    </div>
  );
};

interface BatchWizardProps {
  batchId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchWizard: React.FC<BatchWizardProps> = ({ batchId, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    contentType: 'COURSE' as 'COURSE' | 'PATH',
    contentId: '',
    status: 'UPCOMING',
    checkerIds: [] as string[],
    learnerIds: [] as string[],
    notifyScheduleChanges: false,
    courseSchedules: [] as { courseId: string; startDate: string; endDate: string; order?: number }[]
  });

  const [sortedCourses, setSortedCourses] = useState<any[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Resources
  const [courses, setCourses] = useState<any[]>([]);
  const [paths, setPaths] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchChecker, setSearchChecker] = useState('');
  const [searchLearner, setSearchLearner] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const [courseData, pathData, userData, deptData] = await Promise.all([
          catalogApi.getDiscovery({ type: 'courses' }),
          learningPathsApi.getAll(),
          usersApi.getAll(),
          departmentsApi.getAll()
        ]);
        setCourses(courseData);
        setPaths(pathData);
        setUsers(userData);
        setDepartments(deptData);

        if (batchId) {
          const batch = await batchesApi.getById(batchId);
          setFormData({
            name: batch.name,
            startDate: format(new Date(batch.startDate), 'yyyy-MM-dd'),
            endDate: format(new Date(batch.endDate), 'yyyy-MM-dd'),
            contentType: batch.courseId ? 'COURSE' : 'PATH',
            contentId: batch.courseId || batch.learningPathId || '',
            status: batch.status,
            checkerIds: batch.activityCheckers?.map((c: any) => c.userId) || [],
            learnerIds: [...(batch.enrollments?.map((e: any) => e.userId) || []), ...(batch.learningPathEnrollments?.map((e: any) => e.userId) || [])],
            courseSchedules: batch.courseSchedules?.map((s: any) => ({
              courseId: s.courseId,
              startDate: s.startDate ? format(new Date(s.startDate), 'yyyy-MM-dd') : '',
              endDate: s.endDate ? format(new Date(s.endDate), 'yyyy-MM-dd') : ''
            })) || [],
            notifyScheduleChanges: false
          });
          
          if (batch.learningPathId) {
             const lp = pathData.find(p => p.id === batch.learningPathId);
             if (lp && lp.pathCourses) {
               // Restore sorted order if available
               const scheduledCourses = [...lp.pathCourses].sort((a, b) => {
                 const orderA = batch.courseSchedules?.find((s: any) => s.courseId === a.courseId)?.order ?? 999;
                 const orderB = batch.courseSchedules?.find((s: any) => s.courseId === b.courseId)?.order ?? 999;
                 return orderA - orderB;
               });
               setSortedCourses(scheduledCourses);
             }
          }
        }
      } catch (error) {
        toast.error('Failed to load required data');
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [batchId]);

  const handleNext = () => {
    if (step === 1 && (!formData.name || !formData.startDate || !formData.endDate)) {
      return toast.error('Please fill in all basic details');
    }
    if (step === 2 && !formData.contentId) {
      return toast.error('Please select a course or learning path');
    }
    setStep(s => s + 1);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        courseId: formData.contentType === 'COURSE' && formData.contentId ? formData.contentId : null,
        learningPathId: formData.contentType === 'PATH' && formData.contentId ? formData.contentId : null,
        // Send the full ordered array
        courseSchedules: formData.contentType === 'PATH' ? sortedCourses.map((c: any) => {
          const existing = formData.courseSchedules.find(s => s.courseId === c.courseId);
          return {
            courseId: c.courseId,
            startDate: existing?.startDate || null,
            endDate: existing?.endDate || null
          };
        }) : formData.courseSchedules
      };

      if (batchId) {
        await batchesApi.update(batchId, payload);
        await batchesApi.assignLearners(batchId, formData.learnerIds);
        toast.success('Batch updated successfully');
      } else {
        const batch = await batchesApi.create(payload);
        await batchesApi.assignLearners(batch.id, formData.learnerIds);
        toast.success('Batch created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCheckers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.username}`.toLowerCase().includes(searchChecker.toLowerCase())
  );
  const filteredLearners = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.username}`.toLowerCase().includes(searchLearner.toLowerCase())
  );

  const toggleChecker = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      checkerIds: prev.checkerIds.includes(userId) 
        ? prev.checkerIds.filter(id => id !== userId) 
        : [...prev.checkerIds, userId]
    }));
  };

  const toggleLearner = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      learnerIds: prev.learnerIds.includes(userId) 
        ? prev.learnerIds.filter(id => id !== userId) 
        : [...prev.learnerIds, userId]
    }));
  };

  const updateCourseSchedule = (courseId: string, field: 'startDate' | 'endDate', value: string) => {
    setFormData(prev => {
      const existing = prev.courseSchedules.find(s => s.courseId === courseId);
      if (existing) {
        return {
          ...prev,
          courseSchedules: prev.courseSchedules.map(s => s.courseId === courseId ? { ...s, [field]: value } : s)
        };
      }
      return {
        ...prev,
        courseSchedules: [...prev.courseSchedules, { courseId, startDate: '', endDate: '', [field]: value }]
      };
    });
  };

  const addAllFromDept = (deptId: string) => {
    const deptUserIds = users.filter(u => u.departmentId === deptId && u.role === 'EMPLOYEE').map(u => u.id);
    setFormData(prev => ({
      ...prev,
      learnerIds: Array.from(new Set([...prev.learnerIds, ...deptUserIds]))
    }));
    toast.info(`Added ${deptUserIds.length} learners from department`);
  };

  const addAllFromRole = (role: string) => {
    const roleUserIds = users.filter(u => u.role === role).map(u => u.id);
    setFormData(prev => ({
      ...prev,
      learnerIds: Array.from(new Set([...prev.learnerIds, ...roleUserIds]))
    }));
    toast.info(`Added ${roleUserIds.length} learners with role ${role}`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl rounded-[2.5rem]">
        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
          <div className="relative z-10">
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter mb-2 flex items-center gap-3">
              {batchId ? 'Edit Cohort' : 'Configure New Batch'}
              <Badge variant="outline" className="text-primary-foreground border-primary-foreground/20 font-bold tracking-widest text-[10px]">
                STEP {step} / {formData.contentType === 'PATH' ? '5' : '4'}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 font-medium">
              Synchronize learning schedules and assign dedicated mentors.
            </DialogDescription>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-20" />
        </div>

        <ScrollArea className="flex-1 p-8">
          {isLoadingData ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
              <p className="text-muted-foreground font-bold animate-pulse">Initializing Setup Wizard...</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Step 1: Basic Details */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <ChevronRight className="h-4 w-4" /> Batch Identity
                    </Label>
                    <Input 
                      placeholder='e.g., "Standard Insurance Q3 Onboarding 2024"'
                      className="h-14 rounded-2xl border-primary/10 text-lg font-bold shadow-sm"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Start Date
                      </Label>
                      <Input 
                        type="date"
                        className="h-12 rounded-xl border-primary/10"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <Clock className="h-4 w-4" /> End Date
                      </Label>
                      <Input 
                        type="date"
                        className="h-12 rounded-xl border-primary/10"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Content Selection */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex gap-4 p-1.5 bg-muted rounded-2xl">
                    <Button 
                      variant={formData.contentType === 'COURSE' ? 'default' : 'ghost'}
                      className={cn("flex-1 h-12 rounded-xl gap-2 font-black", formData.contentType === 'COURSE' && "shadow-lg")}
                      onClick={() => setFormData({ ...formData, contentType: 'COURSE', contentId: '' })}
                    >
                      <BookOpen className="h-4 w-4" /> Individual Course
                    </Button>
                    <Button 
                      variant={formData.contentType === 'PATH' ? 'default' : 'ghost'}
                      className={cn("flex-1 h-12 rounded-xl gap-2 font-black", formData.contentType === 'PATH' && "shadow-lg")}
                      onClick={() => setFormData({ ...formData, contentType: 'PATH', contentId: '' })}
                    >
                      <Layers className="h-4 w-4" /> Learning Path
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(formData.contentType === 'COURSE' ? courses : paths).map((item) => (
                      <Card 
                        key={item.id}
                        onClick={() => {
                          setFormData({ ...formData, contentId: item.id });
                          if (formData.contentType === 'PATH') {
                            setSortedCourses([...(item.pathCourses || [])]);
                          }
                        }}
                        className={cn(
                          "p-4 cursor-pointer border-2 transition-all duration-300 rounded-[1.5rem] flex items-center gap-4 group",
                          formData.contentId === item.id 
                            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                            : "border-muted-foreground/10 hover:border-primary/50"
                        )}
                      >
                        <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                          {item.thumbnailUrl ? <img src={item.thumbnailUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><BookOpen /></div>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate leading-tight">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">
                            {formData.contentType === 'PATH' ? `${item.pathCourses?.length || 0} Modules` : 'Verified Content'}
                          </p>
                        </div>
                        {formData.contentId === item.id && <CheckCircle2 className="h-5 w-5 text-primary ml-auto flex-shrink-0" />}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Learner Assignment */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-black italic uppercase tracking-tighter">Assign Cohort Members</h3>
                    <Badge variant="secondary" className="font-black h-7 rounded-xl px-4 animate-in zoom-in">
                      {formData.learnerIds.length} Learners Selected
                    </Badge>
                  </div>

                  <Tabs defaultValue="individuals" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-muted/50 rounded-xl mb-6">
                      <TabsTrigger value="individuals" className="rounded-lg font-bold">By Individual</TabsTrigger>
                      <TabsTrigger value="groups" className="rounded-lg font-bold">By Group</TabsTrigger>
                    </TabsList>

                    <TabsContent value="individuals" className="space-y-6 animate-in fade-in duration-300">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search employees to add to this batch..."
                          className="pl-10 h-12 rounded-2xl border-primary/10"
                          value={searchLearner}
                          onChange={e => setSearchLearner(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredLearners.filter(u => u.role === 'EMPLOYEE').map(user => (
                          <div
                            key={user.id}
                            onClick={() => toggleLearner(user.id)}
                            className={cn(
                              "p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all",
                              formData.learnerIds.includes(user.id) ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-muted-foreground/10 hover:border-emerald-200"
                            )}
                          >
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs uppercase">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate leading-none">{user.firstName} {user.lastName}</p>
                              <p className="text-[10px] text-muted-foreground mt-1 uppercase font-black">{user.department?.name || 'No Department'}</p>
                            </div>
                            {formData.learnerIds.includes(user.id) && <UserPlus className="h-4 w-4 text-emerald-600" />}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="groups" className="space-y-8 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                            <Building2 className="h-4 w-4" /> By Department
                          </h4>
                          <div className="space-y-2">
                            {departments.map(dept => (
                              <div key={dept.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                                <span className="font-bold text-xs">{dept.name}</span>
                                <Button variant="ghost" size="sm" className="h-8 rounded-lg font-black text-[10px] uppercase hover:bg-primary hover:text-primary-foreground" onClick={() => addAllFromDept(dept.id)}>Add All</Button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                            <ShieldCheck className="h-4 w-4" /> By System Role
                          </h4>
                          <div className="space-y-2">
                            {['EMPLOYEE', 'SUPERVISOR', 'DEPARTMENT_HEAD', 'COURSE_CREATOR'].map(role => (
                              <div key={role} className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                                <span className="font-bold text-xs">{role.replace('_', ' ')}</span>
                                <Button variant="ghost" size="sm" className="h-8 rounded-lg font-black text-[10px] uppercase hover:bg-primary hover:text-primary-foreground" onClick={() => addAllFromRole(role)}>Add All</Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Step 4: Checkers Assignment */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 mb-2">
                    <h3 className="font-black italic uppercase text-primary text-sm">Assign Activity Checkers</h3>
                    <p className="text-xs text-muted-foreground mt-1">Select the trainers or supervisors who will grade activity submissions for this batch.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search trainers, supervisors, or department heads..."
                      className="pl-10 h-12 rounded-2xl border-primary/10"
                      value={searchChecker}
                      onChange={e => setSearchChecker(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredCheckers.filter(u => ['ADMINISTRATOR', 'LEARNING_MANAGER', 'SUPERVISOR', 'DEPARTMENT_HEAD', 'COURSE_CREATOR'].includes(u.role)).map(user => (
                      <div
                        key={user.id}
                        onClick={() => toggleChecker(user.id)}
                        className={cn(
                          "p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all",
                          formData.checkerIds.includes(user.id) ? "border-primary bg-primary/5 shadow-sm" : "border-muted-foreground/10 hover:border-primary/30"
                        )}
                      >
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs uppercase">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate leading-none">{user.firstName} {user.lastName}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 uppercase font-black">{user.role}</p>
                        </div>
                        {formData.checkerIds.includes(user.id) && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Granular Scheduling (Paths Only) */}
              {step === 5 && formData.contentType === 'PATH' && (
                <div className="space-y-6">
                  <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                    <h3 className="font-black italic uppercase text-primary flex items-center gap-2 mb-1">
                      <Clock className="h-5 w-5" /> Paced Roadmapping
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium italic">Define custom timelines for each course in this path. Leave blank to follow overall batch dates.</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-emerald-900">Notify learners of schedule changes</Label>
                        <p className="text-[11px] text-emerald-700/70 font-medium mt-0.5">Automated emails will be sent to the employee, their supervisor, and department head.</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.notifyScheduleChanges}
                      onCheckedChange={val => setFormData({ ...formData, notifyScheduleChanges: val })}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                  <div className="space-y-4">
                    <DndContext sensors={sensors} onDragEnd={(event: any) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        const oldIndex = sortedCourses.findIndex(s => s.courseId === active.id);
                        const newIndex = sortedCourses.findIndex(s => s.courseId === over.id);
                        setSortedCourses(arrayMove(sortedCourses, oldIndex, newIndex));
                      }
                    }}>
                      <SortableContext items={sortedCourses.map(c => c.courseId)} strategy={verticalListSortingStrategy}>
                        {sortedCourses.map((pc: any, i: number) => (
                          <SortableCourseCard key={pc.courseId} pc={pc} index={i} formData={formData} updateCourseSchedule={updateCourseSchedule} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              )}


            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-8 bg-muted/20 border-t flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            className="rounded-xl h-12 px-6 font-bold"
          >
            {step === 1 ? 'Cancel' : 'Go Back'}
          </Button>

          <div className="flex gap-3">
            {((formData.contentType === 'COURSE' && step < 4) || (formData.contentType === 'PATH' && step < 5)) ? (
              <Button onClick={handleNext} className="rounded-xl h-12 px-8 font-black gap-2 shadow-lg shadow-primary/20 group">
                Continue to Step {step + 1}
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                disabled={isSubmitting}
                className="rounded-xl h-12 px-10 font-black gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Finalize {batchId ? 'Update' : 'Creation'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
