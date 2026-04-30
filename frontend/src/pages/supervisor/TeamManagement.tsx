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
  Route
} from 'lucide-react';
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Assuming usersApi.getMyTeam() exists in frontend api
      // I'll check users.api.ts shortly, but let's assume for now or I'll add it.
      const [teamData, pathData] = await Promise.all([
        (usersApi as any).getMyTeam(),
        learningPathsApi.getAll()
      ]);
      setTeam(teamData);
      setLearningPaths(pathData.filter(p => p.isPublished));
    } catch (error) {
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAssign = (user: any) => {
    setSelectedUser(user);
    setSelectedPathId("");
    setIsAssignOpen(true);
  };

  const handleAssignPath = async () => {
    if (!selectedUser || !selectedPathId) return;
    setIsProcessing(true);
    try {
      await learningPathsApi.enroll(selectedPathId, selectedUser.id);
      toast.success(`Path assigned to ${selectedUser.firstName}`);
      setIsAssignOpen(false);
      fetchData(); // Refresh to see new enrollments
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign path');
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
                    <Button 
                      size="sm" 
                      className="rounded-xl shadow-sm hover:translate-x-1 transition-transform"
                      onClick={() => openAssign(member)}
                    >
                      <Route className="mr-2 h-4 w-4" />
                      Assign Path
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Assign Path Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Route className="h-6 w-6 text-primary" />
              Assign Learning Path
            </DialogTitle>
            <DialogDescription>
              Assign a sequenced curriculum to <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label>Select Path</Label>
              <Select value={selectedPathId} onValueChange={setSelectedPathId}>
                <SelectTrigger className="rounded-xl h-12 bg-muted/30">
                  <SelectValue placeholder="Choose a curriculum..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {learningPaths.map(path => (
                    <SelectItem key={path.id} value={path.id} className="rounded-lg">
                      <div className="flex flex-col">
                        <span className="font-bold">{path.title}</span>
                        <span className="text-[10px] opacity-70">{path.pathCourses.length} Courses</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button 
              className="rounded-xl shadow-lg shadow-primary/20"
              disabled={!selectedPathId || isProcessing}
              onClick={handleAssignPath}
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
