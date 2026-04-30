import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningPathsApi } from '../../api/learning-paths.api';
import type { LearningPath } from '../../api/learning-paths.api';
import { departmentsApi } from '../../api/departments.api';
import type { Department } from '../../api/departments.api';
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
  Route, 
  Layers, 
  FileText,
  LayoutDashboard,
  MoreVertical,
  Trash2,
  Edit3,
  Search
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
import { MultiSelect } from '../../components/ui/multi-select';

export const LearningPaths: React.FC = () => {
  const navigate = useNavigate();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newPath, setNewPath] = useState({
    title: '',
    description: '',
    targetAudience: 'GENERAL',
    targetDepartments: [] as string[]
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pathsData, deptsData] = await Promise.all([
        learningPathsApi.getAll(),
        departmentsApi.getAll()
      ]);
      setPaths(pathsData);
      setDepartments(deptsData);
    } catch (error) {
      toast.error('Failed to load learning paths');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const created = await learningPathsApi.create(newPath);
      toast.success('Learning Path created successfully');
      setIsCreateOpen(false);
      setNewPath({ 
        title: '', 
        description: '', 
        targetAudience: 'GENERAL',
        targetDepartments: []
      });
      navigate(`/creator/learning-paths/${created.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create learning path');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredPaths = paths.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading Learning Paths...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2">
            <Route className="h-8 w-8" />
            Learning Paths
          </h1>
          <p className="text-muted-foreground text-lg italic">Bundle courses into sequenced journeys for specific employee cohorts.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300">
              <Plus className="mr-2 h-5 w-5" /> Create Path
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>New Learning Path</DialogTitle>
                <DialogDescription>Define the core identity of this learning journey.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Path Title *</Label>
                  <Input 
                    id="title" 
                    required
                    value={newPath.title}
                    onChange={(e) => setNewPath({...newPath, title: e.target.value})}
                    placeholder="e.g. Claims Specialist: Level 1"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Executive Summary</Label>
                  <Textarea 
                    id="description" 
                    value={newPath.description || ''}
                    onChange={(e) => setNewPath({...newPath, description: e.target.value})}
                    placeholder="Describe the learning objectives of this path..."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select 
                    value={newPath.targetAudience || 'GENERAL'} 
                    onValueChange={(val) => setNewPath({...newPath, targetAudience: val})}
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

                <div className="space-y-2">
                  <Label>Target Departments</Label>
                  <MultiSelect 
                    options={departments.map(d => ({ label: d.name, value: d.name }))}
                    selected={newPath.targetDepartments}
                    onChange={(selected) => setNewPath({...newPath, targetDepartments: selected})}
                    placeholder="Search departments..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Path
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
            <CardTitle className="text-sm font-medium">Active Paths</CardTitle>
            <Route className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paths.length}</div>
            <p className="text-xs text-muted-foreground">Sequenced journeys</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Bundled Courses</CardTitle>
            <Layers className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paths.reduce((acc, p) => acc + p.pathCourses.length, 0)}</div>
            <p className="text-xs text-muted-foreground">Total course attachments</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/5 to-transparent border-yellow-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Publication State</CardTitle>
            <FileText className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paths.filter(p => !p.isPublished).length}</div>
            <p className="text-xs text-muted-foreground">Draft paths</p>
          </CardContent>
        </Card>
      </div>

      {/* Path List Table */}
      <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              Path Portfolio
            </CardTitle>
            <CardDescription>Manage and sequence your enterprise learning paths.</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search paths..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden bg-background">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[40%]">Path Identity</TableHead>
                  <TableHead>Course Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Targeting</TableHead>
                  <TableHead className="text-right px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPaths.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <Route className="h-12 w-12 mb-2" />
                        <p className="text-lg font-medium">No learning paths found.</p>
                        <p className="text-sm italic">Initiate a path to begin sequencing.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPaths.map((path, index) => (
                    <TableRow 
                      key={path.id} 
                      className={cn(
                        "hover:bg-primary/5 transition-colors cursor-pointer group",
                        index % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}
                      onClick={() => navigate(`/creator/learning-paths/${path.id}`)}
                    >
                      <TableCell>
                        <div className="font-semibold text-base group-hover:text-primary transition-colors">{path.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{path.description || 'No description provided.'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-bold">{path.pathCourses.length} Courses</Badge>
                      </TableCell>
                      <TableCell>
                        {path.isPublished ? (
                          <Badge variant="success" className="px-3 py-1">LIVE</Badge>
                        ) : (
                          <Badge variant="warning" className="px-3 py-1 text-xs">DRAFTING</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{path.targetAudience}</Badge>
                          {path.targetDepartments.length > 0 && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">+{path.targetDepartments.length} Depts</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            className="bg-primary/90 hover:bg-primary shadow-sm group-hover:translate-x-1 transition-transform"
                          >
                            <Settings2 className="mr-2 h-4 w-4" />
                            Build Sequence
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Path Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/creator/learning-paths/${path.id}`)}>
                                <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Path
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
