import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coursesApi } from '../../api/courses.api';
import type { Course } from '../../api/courses.api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { 
  Loader2, 
  Plus, 
  Settings2, 
  BookOpen, 
  Layers, 
  FileText,
  LayoutDashboard,
  MoreVertical,
  Trash2,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { cn } from '../../lib/utils';

export const CourseManagement: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    passingScore: 80,
    targetAudience: 'GENERAL'
  });

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const data = await coursesApi.getAll();
      setCourses(data);
    } catch (error) {
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await coursesApi.create(newCourse);
      toast.success('Course created successfully');
      setIsCreateOpen(false);
      setNewCourse({ title: '', description: '', passingScore: 80, targetAudience: 'GENERAL' });
      fetchCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setIsCreating(false);
    }
  };

  const totalModules = courses.reduce((acc, c) => acc + (c.modules?.length || 0), 0);
  const draftCourses = courses.filter(c => !c.isPublished).length;

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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Course Studio</h1>
          <p className="text-muted-foreground text-lg italic">Design, build, and deploy premium corporate learning experiences.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300">
              <Plus className="mr-2 h-5 w-5" /> Create Masterpiece
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>New Course Blueprint</DialogTitle>
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
                    <Label htmlFor="passingScore">Threshold (%) *</Label>
                    <Input 
                      id="passingScore" 
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={newCourse.passingScore}
                      onChange={(e) => setNewCourse({...newCourse, passingScore: parseInt(e.target.value) || 0})}
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
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Discard</Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Initialize Studio
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
            <CardTitle className="text-sm font-medium">Drafting Phase</CardTitle>
            <FileText className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCourses}</div>
            <p className="text-xs text-muted-foreground">Courses pending publication</p>
          </CardContent>
        </Card>
      </div>

      {/* Course List Table */}
      <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Active Inventory
          </CardTitle>
          <CardDescription>Manage your course assets and builder configurations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden bg-background">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[40%]">Course Identity</TableHead>
                  <TableHead>Complexity</TableHead>
                  <TableHead>Launch Status</TableHead>
                  <TableHead>Target Score</TableHead>
                  <TableHead className="text-right px-6">Actions</TableHead>
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
                        index % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}
                      onClick={() => navigate(`/creator/courses/${course.id}`)}
                    >
                      <TableCell>
                        <div className="font-semibold text-base group-hover:text-primary transition-colors">{course.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{course.description || 'No description provided.'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-bold">{course.modules?.length || 0} Components</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {course.isPublished ? (
                          <Badge variant="success" className="px-3 py-1">LIVE</Badge>
                        ) : (
                          <Badge variant="warning" className="px-3 py-1 text-[10px]">DRAFTING</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-primary">{course.passingScore}%</span>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-primary/90 hover:bg-primary shadow-sm group-hover:translate-x-1 transition-transform"
                          >
                            <Settings2 className="mr-2 h-4 w-4" />
                            Author
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Course Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/creator/courses/${course.id}`)}>
                                <Edit3 className="mr-2 h-4 w-4" /> Edit Blueprint
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Retire Course
                              </DropdownMenuItem>
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
    </div>
  );
};

