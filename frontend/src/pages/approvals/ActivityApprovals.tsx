import React, { useState, useEffect } from 'react';
import { workshopsApi } from '../../api/workshops.api';
import type { ActivitySubmission } from '../../api/workshops.api';

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,

  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { usersApi, type UserResponse } from '../../api/users.api';
import { 
  Users,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

export const ActivityApprovals: React.FC = () => {
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Review Dialog State
  const [selectedSubmission, setSelectedSubmission] = useState<ActivitySubmission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [feedback, setFeedback] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER';

  // Reassignment State
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [submissionToReassign, setSubmissionToReassign] = useState<ActivitySubmission | null>(null);
  const [potentialCheckers, setPotentialCheckers] = useState<UserResponse[]>([]);
  const [selectedCheckerId, setSelectedCheckerId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    if (isAdmin) {
      fetchPotentialCheckers();
    }
  }, [isAdmin]);

  const fetchPotentialCheckers = async () => {
    try {
      const allUsers = await usersApi.getAll();
      // Filter for roles that can review activities
      const checkers = allUsers.filter(u => 
        ['ADMINISTRATOR', 'LEARNING_MANAGER', 'SUPERVISOR', 'DEPARTMENT_HEAD', 'COURSE_CREATOR'].includes(u.role)
      );
      setPotentialCheckers(checkers);
    } catch (error) {
      console.error('Failed to fetch potential checkers', error);
    }
  };

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const data = await workshopsApi.getPending();
      setSubmissions(data);
    } catch (error) {
      toast.error('Failed to load pending approvals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReview = (submission: ActivitySubmission, status: 'APPROVED' | 'REJECTED') => {
    setSelectedSubmission(submission);
    setReviewStatus(status);
    setFeedback('');
  };

  const handleReview = async () => {
    if (!selectedSubmission || !reviewStatus) return;
    if (reviewStatus === 'REJECTED' && !feedback) {
      toast.error('Feedback is mandatory for rejections.');
      return;
    }

    setIsProcessing(true);
    try {
      await workshopsApi.review(selectedSubmission.id, {
        status: reviewStatus,
        feedback: feedback || undefined
      });
      toast.success(`Activity ${reviewStatus === 'APPROVED' ? 'Approved' : 'Rejected'}`);
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process review');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassign = async () => {
    if (!submissionToReassign || !selectedCheckerId) return;
    setIsReassigning(true);
    try {
      await workshopsApi.reassign(submissionToReassign.id, selectedCheckerId);
      toast.success('Activity reassigned successfully');
      setIsReassignDialogOpen(false);
      setSubmissionToReassign(null);
      setSelectedCheckerId('');
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reassign activity');
    } finally {
      setIsReassigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Pending Activity Approvals
          </h1>
          <p className="text-muted-foreground mt-1">Review workshop submissions and validate corporate training compliance.</p>
        </div>
        <Badge variant="outline" className="h-10 px-4 font-bold border-primary/20 text-primary">
          {submissions.length} Pending Actions
        </Badge>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-24 bg-muted/20 rounded-3xl border-2 border-dashed border-muted-foreground/10">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-bold">Inbox Cleared</h3>
          <p className="text-muted-foreground">All activities have been reviewed. Great job!</p>
        </div>
      ) : (
        <div className="bg-background rounded-3xl border shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Learner</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Course / Module</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">Assigned To</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-center">Content</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="font-bold">{sub.user?.firstName} {sub.user?.lastName}</div>
                    <div className="text-xs text-muted-foreground">{sub.user?.username}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="font-medium text-primary text-sm">{sub.module?.course.title}</div>
                    <div className="text-xs font-bold text-muted-foreground mt-0.5">{sub.module?.title}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {sub.assignedChecker ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold">
                          <Users className="mr-1 h-3 w-3" />
                          {sub.assignedChecker.firstName} {sub.assignedChecker.lastName}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Default Workflow</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {sub.textResponse && (
                        <Button variant="ghost" size="icon" title="View Text Response" className="h-8 w-8 rounded-full bg-primary/5 text-primary">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                      {sub.fileUrl && (
                        <Button variant="ghost" size="icon" asChild title="Download File" className="h-8 w-8 rounded-full bg-green-500/5 text-green-600">
                          <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSubmissionToReassign(sub);
                            setIsReassignDialogOpen(true);
                            setSelectedCheckerId(sub.assignedCheckerId || '');
                          }}
                          className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5"
                        >
                          <RefreshCw className="mr-1.5 h-3 w-3" /> Reassign
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenReview(sub, 'REJECTED')}
                        className="h-8 text-[10px] font-black uppercase tracking-widest border-destructive/20 text-destructive hover:bg-destructive/5"
                      >
                        <XCircle className="mr-1.5 h-3 w-3" /> Reject
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenReview(sub, 'APPROVED')}
                        className="h-8 text-[10px] font-black uppercase tracking-widest shadow-md shadow-success/10 bg-success hover:bg-success/90"
                      >
                        <CheckCircle2 className="mr-1.5 h-3 w-3" /> Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewStatus === 'APPROVED' ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              {reviewStatus === 'APPROVED' ? 'Confirm Approval' : 'Rejection Feedback'}
            </DialogTitle>
            <DialogDescription>
              {reviewStatus === 'APPROVED' 
                ? "Are you sure this activity meets the quality standards? This will move the learner towards certification."
                : "Please provide detailed feedback on why this submission was rejected. The learner will be asked to resubmit."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 rounded-xl bg-muted/20 border text-sm space-y-2">
              <div className="flex justify-between font-bold">
                <span className="text-xs uppercase text-muted-foreground">Learner</span>
                <span>{selectedSubmission?.user?.firstName} {selectedSubmission?.user?.lastName}</span>
              </div>
              {selectedSubmission?.textResponse && (
                <div className="mt-4 pt-4 border-t italic text-muted-foreground">
                  "{selectedSubmission.textResponse}"
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3 w-3" />
                {reviewStatus === 'APPROVED' ? 'Note (Optional)' : 'Rejection Notes (Mandatory)'}
              </Label>
              <Textarea 
                placeholder={reviewStatus === 'APPROVED' ? "Add a word of encouragement..." : "Identify exactly what needs to be fixed..."}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[120px] bg-muted/10 border-none focus:ring-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>Cancel</Button>
            <Button 
              onClick={handleReview} 
              disabled={isProcessing || (reviewStatus === 'REJECTED' && !feedback)}
              variant={reviewStatus === 'REJECTED' ? 'destructive' : 'default'}
              className={reviewStatus === 'APPROVED' ? 'bg-success hover:bg-success/90' : ''}
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {reviewStatus === 'APPROVED' ? 'Finalize Approval' : 'Submit Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassignment Dialog */}
      <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Reassign Approval Task
            </DialogTitle>
            <DialogDescription>
              Transfer this activity review to another qualified corporate officer or learning manager.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Student</span>
                <span className="font-black text-primary">{submissionToReassign?.user?.firstName} {submissionToReassign?.user?.lastName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Module</span>
                <span className="font-bold text-slate-700 truncate max-w-[200px]">{submissionToReassign?.module?.title}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select New Evaluator</Label>
              <Select value={selectedCheckerId} onValueChange={setSelectedCheckerId}>
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Choose checker..." />
                </SelectTrigger>
                <SelectContent>
                  {potentialCheckers
                    .filter(u => u.id !== submissionToReassign?.userId) // Cannot reassign to self
                    .map(checker => (
                      <SelectItem key={checker.id} value={checker.id} className="font-medium">
                        {checker.firstName} {checker.lastName} ({checker.role.replace(/_/g, ' ')})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic mt-2">
                * Reassigning will notify the new evaluator via email and in-app alert.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReassignDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleReassign} 
              disabled={isReassigning || !selectedCheckerId}
              className="px-8 rounded-xl bg-primary hover:bg-primary/90 font-bold shadow-lg shadow-primary/20"
            >
              {isReassigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              {isReassigning ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
