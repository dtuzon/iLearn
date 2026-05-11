import React, { useState, useEffect } from 'react';
import { batchesApi } from '../../api/batches.api';
import type { Batch } from '../../api/batches.api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Plus,
  Calendar,
  Users,
  MoreVertical,
  Trash2,
  Edit2,
  BookOpen,
  Clock,
  Loader2,
  LayoutGrid,
  Search,
  Filter,
  ArrowUpRight,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { BatchWizard } from './BatchWizard';
import {
  Tabs,
  TabsList,
  TabsTrigger
} from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription
} from '../../components/ui/sheet';
import { cn } from '../../lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '../../components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';
import { ScrollArea } from '../../components/ui/scroll-area';

export const ManageBatches: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('ACTIVE');

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const data = await batchesApi.getAll();
      setBatches(data);
    } catch (error) {
      toast.error('Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this batch? All enrollment links will be removed.')) return;
    try {
      await batchesApi.delete(id);
      toast.success('Batch deleted successfully');
      fetchBatches();
    } catch (error) {
      toast.error('Failed to delete batch');
    }
  };

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' ||
      (typeFilter === 'COURSE' && batch.courseId) ||
      (typeFilter === 'PATH' && batch.learningPathId);

    // Lifecycle status logic
    const now = new Date();
    const start = new Date(batch.startDate);
    const end = new Date(batch.endDate);

    let status = 'UPCOMING';
    if (now > end) status = 'COMPLETED';
    else if (now >= start) status = 'ACTIVE';

    const matchesTab = activeTab === status;

    return matchesSearch && matchesType && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">ACTIVE</Badge>;
      case 'COMPLETED': return <Badge variant="secondary" className="opacity-70 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">COMPLETED</Badge>;
      default: return <Badge variant="outline" className="text-orange-500 border-orange-500/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">UPCOMING</Badge>;
    }
  };

  const handleViewDetails = async (batch: Batch) => {
    try {
      // Fetch full details including rosters
      const fullBatch = await batchesApi.getById(batch.id);
      setViewingBatch(fullBatch);
      setIsDetailsOpen(true);
    } catch (error) {
      toast.error('Failed to load batch details');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-primary flex items-center gap-3 italic uppercase">
            <LayoutGrid className="h-10 w-10 text-primary" />
            Batch Command Center
          </h1>
          <p className="text-muted-foreground text-lg font-medium">Lifecycle management for scheduled batch training.</p>
        </div>
        <Button
          onClick={() => {
            setSelectedBatchId(null);
            setIsWizardOpen(true);
          }}
          className="h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 gap-3 font-black italic uppercase tracking-wider transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground"
        >
          <Plus className="h-6 w-6" />
          Initialize New Batch
        </Button>
      </div>

      {/* Control Toolbar */}
      <Card className="border-none shadow-xl rounded-[2rem] bg-background/40 backdrop-blur-md overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
            <Input
              placeholder="Search by batch name..."
              className="h-14 pl-12 rounded-2xl border-primary/5 bg-muted/20 text-lg font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px] h-14 rounded-2xl border-primary/5 bg-muted/20 font-bold">
                <Filter className="h-4 w-4 mr-2 opacity-50" />
                <SelectValue placeholder="All Content" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ALL">All Content Types</SelectItem>
                <SelectItem value="COURSE">Individual Courses</SelectItem>
                <SelectItem value="PATH">Learning Paths</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="px-4 pb-0 border-t border-primary/5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-auto p-0 gap-8">
              <TabsTrigger value="ACTIVE" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 pb-4 pt-4 text-sm font-black italic uppercase tracking-widest transition-all">
                Active Batches
              </TabsTrigger>
              <TabsTrigger value="UPCOMING" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 pb-4 pt-4 text-sm font-black italic uppercase tracking-widest transition-all">
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="COMPLETED" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 pb-4 pt-4 text-sm font-black italic uppercase tracking-widest transition-all">
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-muted-foreground font-bold animate-pulse italic">Syncing lifecycle data...</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <Card className="border-dashed border-2 py-32 flex flex-col items-center justify-center text-center bg-muted/5 rounded-[3rem] opacity-50">
          <div className="h-24 w-24 rounded-[2rem] bg-muted flex items-center justify-center mb-6">
            <LayoutGrid className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-3xl font-black italic uppercase text-muted-foreground">No Records Found</h3>
          <p className="text-muted-foreground max-w-sm mt-2 font-medium">Try adjusting your filters or initialize a new learning cohort.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBatches.map((batch) => (
            <Card key={batch.id} className="group relative overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] bg-background/50 backdrop-blur-md">
              <div className={cn(
                "h-2.5 w-full",
                activeTab === 'ACTIVE' ? "bg-emerald-500" : activeTab === 'UPCOMING' ? "bg-orange-500" : "bg-muted"
              )} />

              <CardHeader className="p-8 pb-4">
                <div className="flex justify-between items-start mb-6">
                  <Badge variant="outline" className="font-black text-[9px] uppercase tracking-[0.2em] border-primary/20 text-primary/60 px-3 py-1 rounded-lg">
                    {batch.courseId ? 'COURSE' : 'LEARNING PATH'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-2xl h-10 w-10 bg-muted/20 opacity-0 group-hover:opacity-100 transition-all">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-[1.5rem] p-2 shadow-2xl border-none bg-background/95 backdrop-blur-lg">
                      <DropdownMenuItem
                        className="gap-3 rounded-xl cursor-pointer p-3 font-bold"
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          setIsWizardOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4 text-primary" /> Edit Configuration
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-3 rounded-xl cursor-pointer p-3 font-bold text-destructive"
                        onClick={() => handleDelete(batch.id)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete Records
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[4rem]">
                    {batch.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest text-primary/40 italic">
                    <BookOpen className="h-3 w-3" />
                    {batch.course?.title || batch.learningPath?.title}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-8 pt-0 space-y-8">
                <div className="flex gap-4 p-4 bg-muted/30 rounded-3xl border border-primary/5">
                  <div className="flex-1 space-y-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" /> Start
                    </p>
                    <p className="text-xs font-black">{format(new Date(batch.startDate), 'MMM dd, yyyy')}</p>
                  </div>
                  <div className="w-px bg-border/50" />
                  <div className="flex-1 space-y-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> End
                    </p>
                    <p className="text-xs font-black">{format(new Date(batch.endDate), 'MMM dd, yyyy')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-3">
                    {batch.activityCheckers?.map((checker) => (
                      <Avatar key={checker.id} className="border-4 border-background h-10 w-10 ring-2 ring-primary/5 shadow-sm">
                        <AvatarImage src={checker.user?.thumbnailUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-black text-[10px]">
                          {checker.user?.firstName?.[0]}{checker.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {(!batch.activityCheckers || batch.activityCheckers.length === 0) && (
                      <div className="h-10 w-10 rounded-full bg-muted border-4 border-background flex items-center justify-center opacity-30">
                        <UserCheck className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Payload</p>
                    <p className="text-sm font-black text-primary italic">
                      {(batch._count?.enrollments || 0) + (batch._count?.learningPathEnrollments || 0)} Enrolled
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleViewDetails(batch)}
                  variant="outline"
                  className="w-full h-14 rounded-2xl border-primary/10 font-black italic uppercase tracking-wider group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 gap-2 shadow-sm"
                >
                  View Details
                  <ArrowUpRight className="h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Batch Details Side Panel */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="p-0 border-none sm:max-w-3xl overflow-hidden flex flex-col">
          {viewingBatch && (
            <>
              <div className="bg-primary p-10 text-primary-foreground relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(activeTab)}
                    <Badge variant="outline" className="text-primary-foreground border-primary-foreground/20 font-black tracking-[0.2em] text-[10px]">
                      {viewingBatch.courseId ? 'INDIVIDUAL COURSE' : 'LEARNING PATHWAY'}
                    </Badge>
                  </div>
                  <SheetTitle className="text-4xl font-black italic uppercase tracking-tighter text-white leading-tight">
                    {viewingBatch.name}
                  </SheetTitle>
                  <SheetDescription className="text-primary-foreground/70 text-lg font-medium flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {viewingBatch.course?.title || viewingBatch.learningPath?.title}
                  </SheetDescription>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 -skew-x-12 transform translate-x-32" />
              </div>

              <ScrollArea className="flex-1 p-10">
                <div className="space-y-12">
                  {/* Timeline Summary */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-muted p-6 rounded-[2rem] space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Global Start Date
                      </p>
                      <p className="text-2xl font-black">{format(new Date(viewingBatch.startDate), 'MMMM dd, yyyy')}</p>
                    </div>
                    <div className="bg-muted p-6 rounded-[2rem] space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Global Deadline
                      </p>
                      <p className="text-2xl font-black">{format(new Date(viewingBatch.endDate), 'MMMM dd, yyyy')}</p>
                    </div>
                  </div>

                  {/* STAFF ROSTER */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <UserCheck className="h-6 w-6 text-primary" />
                        Dedicated Staff Checkers
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {viewingBatch.activityCheckers?.map(checker => (
                        <div key={checker.id} className="flex items-center gap-3 p-3 pr-6 rounded-2xl border bg-background shadow-sm">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={checker.user?.thumbnailUrl || undefined} />
                            <AvatarFallback>{checker.user?.firstName?.[0]}{checker.user?.lastName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-black leading-none">{checker.user?.firstName} {checker.user?.lastName}</p>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">{checker.user?.role}</p>
                          </div>
                        </div>
                      ))}
                      {(!viewingBatch.activityCheckers || viewingBatch.activityCheckers.length === 0) && (
                        <p className="text-muted-foreground italic text-sm">No specific checkers assigned. Defaults to global workflow.</p>
                      )}
                    </div>
                  </div>

                  {/* LEARNER ROSTER */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <Users className="h-6 w-6 text-primary" />
                        Enrolled Payload
                      </h3>
                      <Badge variant="secondary" className="font-black h-8 rounded-xl px-4">
                        {(viewingBatch.enrollments?.length || 0) + (viewingBatch.learningPathEnrollments?.length || 0)} Learners
                      </Badge>
                    </div>

                    <div className="rounded-[2rem] border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Learner</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Department</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...(viewingBatch.enrollments || []), ...(viewingBatch.learningPathEnrollments || [])].map((enrollment: any) => (
                            <TableRow key={enrollment.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <p className="font-bold text-sm">{enrollment.user.firstName} {enrollment.user.lastName}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{enrollment.user.username}</p>
                              </TableCell>
                              <TableCell className="text-xs font-medium italic">
                                {enrollment.user.department?.name || 'GENERIC'}
                              </TableCell>
                              <TableCell className="text-right">
                                {enrollment.isCompleted ? (
                                  <Badge className="bg-emerald-500 rounded-lg text-[9px] font-black italic uppercase">GRADUATED</Badge>
                                ) : enrollment.moduleProgress?.length > 0 ? (
                                  <Badge className="bg-blue-500 rounded-lg text-[9px] font-black italic uppercase">ACTIVE</Badge>
                                ) : (
                                  <Badge variant="outline" className="rounded-lg text-[9px] font-black italic uppercase opacity-40">DORMANT</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* COURSE PACING (PATHS ONLY) */}
                  {viewingBatch.learningPathId && viewingBatch.learningPath?.pathCourses && viewingBatch.learningPath.pathCourses.length > 0 && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <ClipboardList className="h-6 w-6 text-primary" />
                        Learning Path Pacing
                      </h3>
                      <div className="space-y-4">
                        {viewingBatch.learningPath.pathCourses.map((pathCourse: any, _i: number) => {
                          const override = viewingBatch.courseSchedules?.find((s: any) => s.courseId === pathCourse.courseId);
                          return (
                            <div key={pathCourse.id} className="flex items-center gap-6 p-6 rounded-[2rem] bg-muted/30 border border-primary/5">
                              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg italic">
                                {_i + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-sm">{pathCourse.course.title}</p>
                                <div className="flex gap-4 mt-2">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground">Unlock:</span>
                                    <span className="text-[10px] font-bold">{override?.startDate ? format(new Date(override.startDate), 'MMM dd') : 'Batch Start'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground">Deadline:</span>
                                    <span className="text-[10px] font-bold">{override?.endDate ? format(new Date(override.endDate), 'MMM dd') : 'Batch End'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {isWizardOpen && (
        <BatchWizard
          batchId={selectedBatchId}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => {
            setIsWizardOpen(false);
            fetchBatches();
          }}
        />
      )}
    </div>
  );
};
