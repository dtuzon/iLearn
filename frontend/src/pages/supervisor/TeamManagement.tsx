import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api/users.api';
import { learningPathsApi } from '../../api/learning-paths.api';
import type { LearningPath } from '../../api/learning-paths.api';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Loader2, 
  Users, 
  Route,
  Calendar as CalendarIcon,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

import { toast } from 'sonner';

import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';

export const TeamManagement: React.FC = () => {
  const [team, setTeam] = useState<any[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dialog State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPathId, setSelectedPathId] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assignType, setAssignType] = useState<'PATH' | 'COURSE'>('PATH');
  const [courses, setCourses] = useState<any[]>([]);


  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [teamData, pathData, { coursesApi }] = await Promise.all([
        (usersApi as any).getMyTeam(),
        learningPathsApi.getAll(),
        import('../../api/courses.api')
      ]);
      const courseData = await coursesApi.getAll('active');
      setTeam(teamData);
      setLearningPaths(pathData.filter(p => p.isPublished));
      setCourses(courseData);
    } catch (error) {

      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAssign = (user: any, type: 'PATH' | 'COURSE' = 'PATH') => {
    setSelectedUser(user);
    setAssignType(type);
    setSelectedPathId("");
    setSelectedCourseId("");
    setDueDate(undefined);
    setIsAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedUser || (assignType === 'PATH' && !selectedPathId) || (assignType === 'COURSE' && !selectedCourseId)) return;
    setIsProcessing(true);
    try {
      if (assignType === 'PATH') {
        await learningPathsApi.enroll(selectedPathId, selectedUser.id, dueDate);
        toast.success(`Path assigned to ${selectedUser.firstName}`);
      } else {
        const { enrollmentsApi } = await import('../../api/enrollments.api');
        await enrollmentsApi.enroll(selectedCourseId, selectedUser.id, dueDate);
        toast.success(`Course assigned to ${selectedUser.firstName}`);
      }
      setIsAssignOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Assignment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-primary flex items-center gap-3">
          <Users className="h-8 w-8" />
          Team Management
        </h1>
        <p className="text-muted-foreground text-lg italic">Monitor progress and assign learning journeys to your direct reports.</p>
      </div>

      <div className="border rounded-2xl bg-card overflow-hidden shadow-xl bg-background/50 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Member</TableHead>
              <TableHead className="font-bold">Active Enrollments</TableHead>
              <TableHead className="font-bold">Learning Paths</TableHead>
              <TableHead className="text-right px-6 font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-64 text-center text-muted-foreground italic">
                  No direct reports found.
                </TableCell>
              </TableRow>
            ) : (
              team.map((member) => (
                <TableRow key={member.id} className="hover:bg-primary/5 transition-colors group">
                  <TableCell>
                    <div className="font-bold group-hover:text-primary transition-colors">{member.firstName} {member.lastName}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{member.department?.name || 'No Dept'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.enrollments?.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No courses</span>
                      ) : (
                        member.enrollments.slice(0, 2).map((e: any) => (
                          <Badge key={e.id} variant="secondary" className="text-[10px] bg-purple-500/5 text-purple-600 border-none">
                            {e.course.title}
                          </Badge>
                        ))
                      )}
                      {member.enrollments?.length > 2 && (
                        <Badge variant="outline" className="text-[10px]">+{member.enrollments.length - 2} more</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.learningPathEnrollments?.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No paths</span>
                      ) : (
                        member.learningPathEnrollments.map((e: any) => (
                          <Badge key={e.id} variant="secondary" className="text-[10px] bg-primary/5 text-primary border-none">
                            {e.learningPath.title}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="rounded-xl shadow-sm hover:bg-purple-50 hover:text-purple-600 transition-all"
                        onClick={() => openAssign(member, 'COURSE')}
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Assign Course
                      </Button>
                      <Button 
                        size="sm" 
                        className="rounded-xl shadow-sm hover:translate-x-1 transition-transform"
                        onClick={() => openAssign(member, 'PATH')}
                      >
                        <Route className="mr-2 h-4 w-4" />
                        Assign Path
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Assign Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              {assignType === 'PATH' ? <Route className="h-6 w-6 text-primary" /> : <BookOpen className="h-6 w-6 text-primary" />}
              {assignType === 'PATH' ? 'Assign Learning Path' : 'Assign Individual Course'}
            </DialogTitle>
            <DialogDescription>
              Assign {assignType === 'PATH' ? 'a sequenced curriculum' : 'a specific course'} to <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label>Target Content</Label>
              {assignType === 'PATH' ? (
                <Select value={selectedPathId} onValueChange={setSelectedPathId}>
                  <SelectTrigger className="rounded-xl h-12 bg-muted/30">
                    <SelectValue placeholder="Choose a path..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {learningPaths.map(path => (
                      <SelectItem key={path.id} value={path.id}>{path.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger className="rounded-xl h-12 bg-muted/30">
                    <SelectValue placeholder="Choose a course..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Target Completion Date (Optional)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal rounded-xl bg-muted/30 border-none",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Set a strict deadline</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-primary/10" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {((assignType === 'PATH' && selectedPathId) || (assignType === 'COURSE' && selectedCourseId)) && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-primary">Ready to Assign</p>
                  <p className="text-muted-foreground">
                    {dueDate 
                      ? `Due by ${format(dueDate, "MMMM d, yyyy")}.` 
                      : "No specific deadline set."}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button 
              className="rounded-xl shadow-lg shadow-primary/20"
              disabled={isProcessing || (assignType === 'PATH' ? !selectedPathId : !selectedCourseId)}
              onClick={handleAssign}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign to Team Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
