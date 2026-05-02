import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesApi, type Course } from '../../api/courses.api';
import { departmentsApi, type Department } from '../../api/departments.api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '../../components/ui/dialog';
import { 
  Plus, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  BookOpen, 
  Layers, 
  Loader2, 
  Settings2,
  Clock, 
  AlertCircle, 
  CopyPlus, 
  History, 
  RefreshCw, 
  Eye 
} from 'lucide-react';

import { 
  Tabs as ShadcnTabs, 
  TabsList as ShadcnTabsList, 
  TabsTrigger as ShadcnTabsTrigger 
} from '../../components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Checkbox } from '../../components/ui/checkbox';
import { useAuth } from '../../context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

export const CourseManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  // Versioning State
  const [courseToVersion, setCourseToVersion] = useState<Course | null>(null);
  const [isVersioning, setIsVersioning] = useState(false);

  // History State
  const [historyCourse, setHistoryCourse] = useState<Course | null>(null);
  const [versions, setVersions] = useState<Course[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Create Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    passingGrade: 70,
    targetAudience: 'GENERAL',
    targetDepartments: [] as string[]
  });

  useEffect(() => {
    fetchCourses(activeTab);
    fetchDepartments();
  }, [activeTab]);

  const fetchCourses = async (tab: string = activeTab) => {
    setIsLoading(true);
    try {
      const data = await coursesApi.getAll(tab);
      setCourses(data);
    } catch (error) {
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const course = await coursesApi.create(newCourse);
      toast.success('Course identity registered in the studio');
      setIsCreateOpen(false);
      navigate(`/creator/courses/${course.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setIsCreating(false);
    }
  };

  const triggerDraftCreation = (course: Course) => {
    setCourseToVersion(course);
  };


  const handleCreateDraftVersion = async () => {
    if (!courseToVersion) return;
    setIsVersioning(true);
    try {
      const newDraft = await coursesApi.createDraftVersion(courseToVersion.id);
      toast.success('Deep clone successful. Redirecting to new draft...');
      navigate(`/creator/courses/${newDraft.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create new version');
    } finally {
      setIsVersioning(false);
      setCourseToVersion(null);
    }
  };

  const handleFetchVersions = async (course: Course) => {
    setHistoryCourse(course);
    setIsHistoryLoading(true);
    try {
      const pId = course.parentId || course.id;
      const data = await coursesApi.getVersions(pId);
      setVersions(data);
    } catch (error) {
      toast.error('Failed to load version history');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      const newDraft = await coursesApi.restoreVersion(versionId);
      toast.success('Version restored to a new draft');
      navigate(`/creator/courses/${newDraft.id}`);
    } catch (error) {
      toast.error('Failed to restore version');
    }
  };

  const handleRetire = async (courseId: string) => {
    try {
      await coursesApi.updateStatus(courseId, 'RETIRED');
      toast.success('Course retired successfully');
      fetchCourses();
    } catch (error) {
      toast.error('Failed to retire course');
    }
  };

  const handleUnretire = async (courseId: string) => {
    try {
      await coursesApi.unretire(courseId);
      toast.success('Course restored to Draft');
      fetchCourses();
    } catch (error) {
      toast.error('Failed to unretire course');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return <Badge className="bg-success/10 text-success border-none px-3 py-1">LIVE</Badge>;
      case 'PENDING_APPROVAL': return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-none px-3 py-1 animate-pulse">PENDING</Badge>;
      case 'DRAFT': return <Badge variant="outline" className="text-muted-foreground border-dashed px-3 py-1">DRAFT</Badge>;
      case 'ARCHIVED': return <Badge variant="outline" className="bg-muted text-muted-foreground border-none px-3 py-1">ARCHIVED</Badge>;
      case 'RETIRED': return <Badge variant="destructive" className="px-3 py-1">RETIRED</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isAdminOrManager = user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER';
  const totalModules = courses.reduce((acc, course) => acc + (course.modules?.length || 0), 0);
  const pendingApprovals = courses.filter(c => c.status === 'PENDING_APPROVAL');

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Entering Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Course Studio</h1>
          <p className="text-muted-foreground text-lg italic">Design, build, and deploy premium corporate learning experiences.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <ShadcnTabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
            <ShadcnTabsList className="grid w-full grid-cols-2 h-11 bg-muted/50 p-1">
              <ShadcnTabsTrigger value="active" className="font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Active Courses</ShadcnTabsTrigger>
              <ShadcnTabsTrigger value="retired" className="font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Retired Inventory</ShadcnTabsTrigger>
            </ShadcnTabsList>
          </ShadcnTabs>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-11 shadow-lg hover:shadow-xl transition-all duration-300">
                <Plus className="mr-2 h-5 w-5" /> Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>New Course Configuration</DialogTitle>
                  <DialogDescription>Set the foundation for your new educational content.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Course Title *</Label>
                    <Input 
                      id="title" 
                      required
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                      placeholder="e.g. Masterclass: Advanced Insurance Underwriting"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Executive Summary</Label>
                    <Textarea 
                      id="description" 
                      value={newCourse.description}
                      onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                      placeholder="A brief overview of the course objectives..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="passingGrade">Passing Grade (%) *</Label>
                      <Input 
                        id="passingGrade" 
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={newCourse.passingGrade}
                        onChange={(e) => setNewCourse({...newCourse, passingGrade: parseInt(e.target.value) || 0})}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Select 
                        value={newCourse.targetAudience} 
                        onValueChange={(val) => setNewCourse({...newCourse, targetAudience: val})}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select Audience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GENERAL">General</SelectItem>
                          <SelectItem value="PHASE_1_NEW_HIRE">Phase 1: Newly Hired</SelectItem>
                          <SelectItem value="PHASE_2_REGULARIZED">Phase 2: Newly Regularized</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Target Departments</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/5 max-h-[120px] overflow-y-auto">
                      {departments.map((dept) => (
                        <div key={dept.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`new-dept-${dept.id}`}
                            checked={newCourse.targetDepartments.includes(dept.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewCourse({
                                  ...newCourse,
                                  targetDepartments: [...newCourse.targetDepartments, dept.name]
                                });
                              } else {
                                setNewCourse({
                                  ...newCourse,
                                  targetDepartments: newCourse.targetDepartments.filter(d => d !== dept.name)
                                });
                              }
                            }}
                          />
                          <Label 
                            htmlFor={`new-dept-${dept.id}`}
                            className="text-xs font-medium leading-none cursor-pointer"
                          >
                            {dept.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Course
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Curriculum</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">Active course structures</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Components</CardTitle>
            <Layers className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalModules}</div>
            <p className="text-xs text-muted-foreground">Modules across all courses</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/5 to-transparent border-yellow-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals.length}</div>
            <p className="text-xs text-muted-foreground">Courses awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Section for Admins/Managers */}
      {isAdminOrManager && pendingApprovals.length > 0 && (
        <Card className="border-none shadow-2xl bg-yellow-50/50 backdrop-blur-sm border-l-4 border-yellow-400 overflow-hidden">
          <CardHeader className="bg-yellow-100/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-400 rounded-lg text-white">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Action Required: Pending Approvals</CardTitle>
                  <CardDescription>The following courses have been submitted for final review and publication.</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-yellow-400 text-white border-none">{pendingApprovals.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                {pendingApprovals.map(course => (
                  <TableRow key={course.id} className="hover:bg-yellow-100/20 border-yellow-100">
                    <TableCell>
                      <div className="font-bold">{course.title}</div>
                      <div className="text-xs text-muted-foreground">Submitted by {course.lecturer?.firstName} {course.lecturer?.lastName}</div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl border-yellow-200 hover:bg-yellow-100"
                          onClick={() => navigate(`/creator/courses/${course.id}`)}
                        >
                          Review Content
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-background/50 backdrop-blur-md">
        <CardContent className="p-0">
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[10px] font-black uppercase tracking-widest">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="py-4">Course Identity & Version</TableHead>
                  <TableHead>Composition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Standards</TableHead>
                  <TableHead className="text-right px-6">Intelligence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <BookOpen className="h-12 w-12 mb-2" />
                        <p className="text-lg font-medium">The studio is currently empty.</p>
                        <p className="text-sm italic">Initiate a blueprint to begin authoring.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  courses.map((course, index) => (
                    <TableRow 
                      key={course.id} 
                      className={cn(
                        "hover:bg-primary/5 transition-colors cursor-pointer group",
                        index % 2 === 0 ? "bg-background" : "bg-muted/10",
                        course.status === 'ARCHIVED' && "opacity-60"
                      )}
                      onClick={() => navigate(`/creator/courses/${course.id}`)}
                    >

                      <TableCell>
                        <div className="font-semibold text-base group-hover:text-primary transition-colors flex items-center gap-2">
                          {course.title}
                          <Badge variant="outline" className="text-[10px] h-4 px-1 font-mono opacity-60">v{course.version}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{course.description || 'No description provided.'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-bold">{(course._count?.modules ?? course.modules?.length ?? 0)} Components</Badge>
                        </div>
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(course.status)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-primary">{course.passingGrade}%</span>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            className={cn(
                              "shadow-sm group-hover:translate-x-1 transition-transform",
                              (course.status === 'PUBLISHED' || course.status === 'ARCHIVED') ? "bg-secondary hover:bg-secondary/90" : "bg-primary/90 hover:bg-primary text-white"
                            )}
                          >
                            {(course.status === 'PUBLISHED' || course.status === 'ARCHIVED') ? (
                              <><Eye className="mr-2 h-4 w-4" /> View Blueprint</>
                            ) : (
                              <><Settings2 className="mr-2 h-4 w-4" /> Author</>
                            )}
                          </Button>

                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Intelligence & Control</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              {course.status === 'PUBLISHED' && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/creator/courses/${course.id}`);
                                }}>
                                  <Eye className="mr-2 h-4 w-4" /> View Blueprint (Live)
                                </DropdownMenuItem>
                              )}

                              {(course.status === 'DRAFT' || course.status === 'PENDING_APPROVAL') && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/creator/courses/${course.id}`);
                                }}>
                                  <Edit3 className="mr-2 h-4 w-4" /> Author/Edit Blueprint
                                </DropdownMenuItem>
                              )}

                              {course.status === 'PUBLISHED' && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  triggerDraftCreation(course);
                                }}>
                                  <CopyPlus className="mr-2 h-4 w-4" /> Create New Draft Version
                                </DropdownMenuItem>
                              )}


                              {course.status !== 'RETIRED' && course.version > 1 && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleFetchVersions(course);
                                }}>
                                  <History className="mr-2 h-4 w-4" /> Version History
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {course.status !== 'RETIRED' && (
                                <DropdownMenuItem className="text-destructive" onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetire(course.id);
                                }}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Retire Course
                                </DropdownMenuItem>
                              )}

                              {course.status === 'RETIRED' && (
                                <DropdownMenuItem className="text-primary font-bold" onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnretire(course.id);
                                }}>
                                  <RefreshCw className="mr-2 h-4 w-4" /> Unretire / Restore to Draft
                                </DropdownMenuItem>
                              )}

                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Deep Clone Confirmation */}
      <AlertDialog open={!!courseToVersion} onOpenChange={(open) => !open && setCourseToVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CopyPlus className="h-5 w-5 text-primary" />
              Edit Published Course?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This course is currently live. To protect active learner progress, we will create a new **Draft version (v{(courseToVersion?.version || 0) + 1})** for you to edit. 
              <br /><br />
              The live version will remain unchanged until your new draft is approved and published.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCreateDraftVersion}
              disabled={isVersioning}
              className="bg-primary hover:bg-primary/90"
            >
              {isVersioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create Draft Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Version History Modal */}
      <Dialog open={!!historyCourse} onOpenChange={(open) => !open && setHistoryCourse(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Version History: {historyCourse?.title}
            </DialogTitle>
            <DialogDescription>
              Inspect and restore historical versions of this course curriculum.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isHistoryLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-muted/50 text-[10px] font-black uppercase tracking-widest">
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Edited By</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="text-right px-6">Actions</TableHead>
                    </TableRow>

                  </TableHeader>
                  <TableBody>
                    {versions.map((v) => (
                      <TableRow key={v.id} className={cn(v.status === 'PUBLISHED' && "bg-success/5 font-bold")}>
                        <TableCell className="font-mono">v{v.version}</TableCell>
                        <TableCell>{getStatusBadge(v.status)}</TableCell>
                        <TableCell className="text-xs">
                          {v.lecturer ? `${v.lecturer.firstName} ${v.lecturer.lastName}` : 'System'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {v.approvedBy ? `${v.approvedBy.firstName} ${v.approvedBy.lastName}` : (v.status === 'PUBLISHED' || v.status === 'ARCHIVED' ? 'System' : '---')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(v.updatedAt).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="text-right px-6">
                          {v.status === 'ARCHIVED' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-xs font-bold"
                              onClick={() => handleRestore(v.id)}
                            >
                              <RefreshCw className="mr-2 h-3 w-3" /> Restore
                            </Button>
                          )}
                          {v.status === 'PUBLISHED' && (
                            <Badge variant="success">Active Live Version</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryCourse(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
