import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '../../components/ui/card';

import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { format } from 'date-fns';

import { coursesApi, type Course } from '../../api/courses.api';
import { learningPathsApi, type LearningPath } from '../../api/learning-paths.api';
import { usersApi, type UserResponse as User } from '../../api/users.api';

import { departmentsApi, type Department } from '../../api/departments.api';
import { enrollmentsApi } from '../../api/enrollments.api';

import { toast } from 'sonner';
import { 
  Loader2, 
  Search, 
  Users, 
  Building2, 
  Calendar as CalendarIcon, 
  Rocket, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  ShieldCheck
} from 'lucide-react';


import { cn } from '../../lib/utils';

export const EnrollmentManager: React.FC = () => {
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);

  // Form State
  const [contentType, setContentType] = useState<'COURSE' | 'PATH'>('COURSE');
  const [contentId, setContentId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  
  // Filtering
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [c, p, u, d] = await Promise.all([
          coursesApi.getAll(),
          learningPathsApi.getAll(),
          usersApi.getAll(),
          departmentsApi.getAll()
        ]);
        setCourses(c.filter(course => course.status === 'PUBLISHED'));
        setPaths(p.filter(path => path.isPublished));
        setUsers(u.filter(user => user.isActive));

        setDepartments(d);
      } catch (error) {
        toast.error('Failed to load required data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = `${u.firstName} ${u.lastName} ${u.username}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || u.departmentId === deptFilter;
    return matchesSearch && matchesDept;
  });


  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAllFiltered = () => {
    const allIds = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => Array.from(new Set([...prev, ...allIds])));
  };

  const deselectAllFiltered = () => {
    const allIds = filteredUsers.map(u => u.id);
    setSelectedUserIds(prev => prev.filter(id => !allIds.includes(id)));
  };

  const handleDeploy = async () => {
    if (!contentId || selectedUserIds.length === 0) {
      toast.error('Please select both content and target users.');
      return;
    }

    setIsDeploying(true);
    try {
      const result = await enrollmentsApi.bulkEnroll({
        contentType,
        contentId,
        targetUserIds: selectedUserIds,
        dueDate
      });
      
      toast.success(`Deployment Successful! Enrolled ${result.count} users.`);
      setSelectedUserIds([]);
      setDueDate(undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const selectedContent = contentType === 'COURSE' 
    ? courses.find(c => c.id === contentId)
    : paths.find(p => p.id === contentId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
        <p className="text-muted-foreground font-medium animate-pulse">Initializing Launch Control...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter italic uppercase flex items-center gap-3">
            <Rocket className="h-10 w-10 text-primary" />
            Enrollment Manager
          </h1>
          <p className="text-muted-foreground text-lg font-medium">Enterprise scale course deployment and audience orchestration.</p>
        </div>
        <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-2xl border border-border/50">
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Selected Users</p>
            <p className="text-xl font-black text-primary">{selectedUserIds.length}</p>
          </div>
          <div className="h-10 w-px bg-border/50" />
          <Button 
            onClick={handleDeploy} 
            disabled={isDeploying || !contentId || selectedUserIds.length === 0}
            className="h-12 px-8 font-black uppercase italic tracking-wider shadow-lg shadow-primary/20"
          >
            {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
            Deploy Assignment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Content Selection & Config */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="shadow-xl border-primary/5">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                1. Select Content
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest">Content Type</Label>
                <Tabs value={contentType} onValueChange={(v) => { setContentType(v as any); setContentId(''); }} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full h-11 p-1 bg-muted/50 rounded-xl">
                    <TabsTrigger value="COURSE" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Courses</TabsTrigger>
                    <TabsTrigger value="PATH" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Paths</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest">Select {contentType === 'COURSE' ? 'Course' : 'Learning Path'}</Label>
                <Select value={contentId} onValueChange={setContentId}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted/20">
                    <SelectValue placeholder={`Choose a ${contentType.toLowerCase()}...`} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {contentType === 'COURSE' ? (
                      courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)
                    ) : (
                      paths.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-primary/5">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                3. Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest">Target Due Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal rounded-xl bg-muted/20",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a deadline...</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Deployment Summary */}
          {selectedContent && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4 animate-in slide-in-from-left-4">
              <h4 className="font-black uppercase tracking-widest text-xs text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Launch Summary
              </h4>
              <div className="space-y-2">
                <p className="text-sm font-medium leading-relaxed">
                  You are about to assign <span className="font-black text-primary italic">"{selectedContent.title}"</span> 
                  to <span className="font-black">{selectedUserIds.length}</span> targeted employees.
                </p>
                {dueDate && (
                   <p className="text-xs text-muted-foreground font-bold">
                     Strict deadline enforced for: {format(dueDate, "PPP")}
                   </p>
                )}
                {selectedUserIds.length === 0 && (
                   <div className="flex items-center gap-2 text-destructive mt-2">
                     <AlertCircle className="h-4 w-4" />
                     <span className="text-[10px] font-black uppercase tracking-tighter">No Audience Selected</span>
                   </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Audience Selection */}
        <Card className="lg:col-span-2 shadow-xl border-primary/5">
          <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                2. Target Audience
              </CardTitle>
              <CardDescription>Select individuals or entire departments for enrollment.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="individuals" className="w-full">
              <div className="px-6 pt-4 border-b">
                <TabsList className="bg-transparent h-auto gap-8 p-0">
                  <TabsTrigger value="individuals" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 pb-3 text-sm font-bold transition-all">By Individual</TabsTrigger>
                  <TabsTrigger value="groups" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-0 pb-3 text-sm font-bold transition-all">By Department/Group</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="individuals" className="p-0 animate-in fade-in duration-300">
                <div className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search by name, email, or employee ID..." 
                        className="pl-10 h-11 rounded-xl bg-muted/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                      <SelectTrigger className="w-full sm:w-[200px] h-11 rounded-xl bg-muted/20">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ALL">All Departments</SelectItem>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between py-2 border-y bg-muted/10 px-4 rounded-lg">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {filteredUsers.length} Users Matching Filters
                    </span>
                    <div className="flex items-center gap-4">
                      <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-black uppercase tracking-tighter" onClick={selectAllFiltered}>Select All</Button>
                      <div className="h-3 w-px bg-border" />
                      <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-black uppercase tracking-tighter text-destructive" onClick={deselectAllFiltered}>Deselect All</Button>
                    </div>
                  </div>

                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead className="text-xs font-black uppercase tracking-widest">Employee</TableHead>
                          <TableHead className="text-xs font-black uppercase tracking-widest">Department</TableHead>
                          <TableHead className="text-xs font-black uppercase tracking-widest text-right">Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.slice(0, 50).map((user) => (
                          <TableRow 
                            key={user.id} 
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedUserIds.includes(user.id) ? "bg-primary/5" : "hover:bg-muted/20"
                            )}
                            onClick={() => toggleUser(user.id)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={selectedUserIds.includes(user.id)}
                                onCheckedChange={() => toggleUser(user.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-bold">{user.firstName} {user.lastName}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{user.username}</div>
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {user.department?.name || "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-[9px] font-black uppercase">
                                {user.role.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredUsers.length > 50 && (
                      <div className="p-4 text-center bg-muted/10 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Showing first 50 matches. Refine search to see more.
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="groups" className="p-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Department Selectors */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Enroll by Department
                    </h4>
                    <div className="space-y-3">
                      {departments.map(dept => (
                        <div key={dept.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-colors group">
                          <div className="space-y-1">
                            <p className="font-bold text-sm">{dept.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Assign to all active members</p>
                          </div>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-lg font-bold text-[10px] uppercase h-8 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                            onClick={() => {
                              const deptUserIds = users.filter(u => u.departmentId === dept.id).map(u => u.id);
                              setSelectedUserIds(prev => Array.from(new Set([...prev, ...deptUserIds])));
                              toast.info(`Added all users from ${dept.name}`);
                            }}
                          >
                            Add All
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Role Selectors */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Enroll by System Role
                    </h4>
                    <div className="space-y-3">
                      {['EMPLOYEE', 'SUPERVISOR', 'DEPARTMENT_HEAD', 'COURSE_CREATOR'].map(role => (
                        <div key={role} className="flex items-center justify-between p-4 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-colors group">
                          <div className="space-y-1">
                            <p className="font-bold text-sm">{role.replace('_', ' ')}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Global role assignment</p>
                          </div>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-lg font-bold text-[10px] uppercase h-8 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                            onClick={() => {
                              const roleUserIds = users.filter(u => u.role === role).map(u => u.id);
                              setSelectedUserIds(prev => Array.from(new Set([...prev, ...roleUserIds])));
                              toast.info(`Added all ${role.replace('_', ' ')}s`);
                            }}
                          >
                            Add All
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
