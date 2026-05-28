import React, { useState, useEffect } from 'react';
import { activitiesApi } from '../../api/activities.api';
import type { ActivitySubmission } from '../../api/activities.api';
import { quizzesApi, type EssaySubmission } from '../../api/quizzes.api';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  FileText,
  ExternalLink,
  BookOpen,
  Zap,
  Loader2,
  LayoutDashboard,
  Bell,
  HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Pusher from 'pusher-js';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../../components/ui/scroll-area';

export const GradingPortal: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [essays, setEssays] = useState<EssaySubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'activities' | 'essays'>('activities');
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [gradingState, setGradingState] = useState<Record<string, { feedback: string; score: string }>>({});

  const fetchBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const data = await activitiesApi.getCheckableBatches();
      setBatches(data);
      if (data.length > 0 && !selectedBatch) {
        setSelectedBatch(data[0]);
      }
    } catch (error) {
      toast.error('Failed to load batches');
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const fetchSubmissions = async (batchId: string) => {
    setIsLoadingSubmissions(true);
    try {
      const [subs, ess] = await Promise.all([
        activitiesApi.getBatchSubmissions(batchId),
        activitiesApi.getBatchEssays(batchId)
      ]);
      setSubmissions(subs);
      setEssays(ess);
      
      // Auto-switch to tab with content
      if (subs.length === 0 && ess.length > 0) setActiveTab('essays');
      else if (subs.length > 0) setActiveTab('activities');
      
    } catch (error) {
      toast.error('Failed to load submissions');
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchSubmissions(selectedBatch.id);

      // Setup Pusher for real-time updates
      const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY || 'your-pusher-key', {
        cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'ap1'
      });

      const channel = pusher.subscribe(`batch-${selectedBatch.id}`);
      channel.bind('new-submission', (data: ActivitySubmission) => {
        setSubmissions(prev => {
          // Prevent duplicates
          if (prev.find(s => s.id === data.id)) return prev;
          toast.info(`New submission from ${data.user.firstName} ${data.user.lastName}`, {
            icon: <Bell className="h-4 w-4" />
          });
          return [data, ...prev];
        });
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
        pusher.disconnect();
      };
    }
  }, [selectedBatch]);

  const handleGrade = async (id: string, status: 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED') => {
    const state = gradingState[id] || { feedback: '', score: '100' };
    try {
      if (activeTab === 'activities') {
        await activitiesApi.grade(id, {
          status: status === 'REJECTED' ? 'NEEDS_REVISION' : status,
          feedback: state.feedback,
          score: parseFloat(state.score) || 100
        });
      } else {
        await quizzesApi.gradeEssay(id, parseFloat(state.score) || 0, state.feedback);
      }
      
      toast.success('Grading submitted successfully!');
      if (activeTab === 'activities') {
        setSubmissions(prev => prev.filter(s => s.id !== id));
      } else {
        setEssays(prev => prev.filter(s => s.id !== id));
      }
      // Refresh batch counts
      fetchBatches();
    } catch (error) {
      toast.error('Failed to update submission');
    }
  };

  const updateGradingState = (id: string, field: string, value: string) => {
    setGradingState(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { feedback: '', score: '100' }), [field]: value }
    }));
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-8 overflow-hidden">
      {/* Sidebar - Batch Selection */}
      <aside className="w-80 flex flex-col gap-6 shrink-0">
        <div className="space-y-1">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Active Batches
          </h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Select a cohort to grade</p>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {isLoadingBatches ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-2xl" />
              ))
            ) : batches.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-3xl opacity-50">
                <p className="text-xs font-bold uppercase tracking-widest">No Batches Assigned</p>
              </div>
            ) : (
              batches.map(batch => (
                <Button
                  variant="outline"
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch)}
                  className={cn(
                    "w-full h-auto text-left p-4 rounded-[1.5rem] transition-all duration-300 relative group overflow-hidden border-2 flex flex-col items-start gap-0 whitespace-normal",
                    selectedBatch?.id === batch.id 
                      ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20 scale-[1.02] hover:bg-primary/90" 
                      : "bg-background border-muted hover:border-primary/50 hover:bg-muted/5"
                  )}
                >
                  <div className="relative z-10">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest mb-1",
                      selectedBatch?.id === batch.id ? "text-primary-foreground/70" : "text-primary"
                    )}>
                      {batch.course?.title || batch.learningPath?.title}
                    </p>
                    <p className="font-bold text-sm truncate">{batch.name}</p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                         <Clock className="h-3 w-3 opacity-60" />
                         <span className="text-[10px] font-bold">Ends {format(new Date(batch.endDate), 'MMM d')}</span>
                      </div>
                      {(batch._count.activitySubmissions + (batch._count.essaySubmissions || 0)) > 0 && (
                        <Badge variant={selectedBatch?.id === batch.id ? "secondary" : "destructive"} className="font-black h-5 px-2">
                          {batch._count.activitySubmissions + (batch._count.essaySubmissions || 0)} PENDING
                        </Badge>
                      )}
                    </div>
                  </div>
                  {selectedBatch?.id === batch.id && (
                    <div className="absolute right-0 top-0 h-full w-1/2 bg-white/10 skew-x-12 transform translate-x-10" />
                  )}
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Stage - Live Feed */}
      <main className="flex-1 flex flex-col gap-6 min-w-0">
        {selectedBatch ? (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-primary flex items-center gap-3">
                  <Zap className="h-8 w-8 animate-pulse text-amber-500" />
                  Live Grading Feed
                </h2>
                <p className="text-sm text-muted-foreground font-medium">
                  Currently viewing: <span className="text-foreground font-bold">{selectedBatch.name}</span>
                </p>
              </div>
              <div className="flex gap-4">
                 <div className="bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Real-Time Sync Active</span>
                 </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col">
              <TabsList className="bg-muted/50 p-1 rounded-2xl border mb-6 h-12 w-fit">
                <TabsTrigger value="activities" className="rounded-xl px-6 h-full font-bold data-[state=active]:bg-background data-[state=active]:shadow-md gap-2">
                  <FileText className="h-4 w-4" />
                  Activity Submissions
                  {submissions.length > 0 && <Badge className="ml-1 h-5 min-w-[20px] px-1 bg-primary text-primary-foreground">{submissions.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="essays" className="rounded-xl px-6 h-full font-bold data-[state=active]:bg-background data-[state=active]:shadow-md gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Quiz Essays
                  {essays.length > 0 && <Badge className="ml-1 h-5 min-w-[20px] px-1 bg-amber-500 text-white border-none">{essays.length}</Badge>}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <div className="space-y-6 pb-12">
                  {isLoadingSubmissions ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
                        <p className="text-muted-foreground font-black italic animate-pulse">Establishing Live Link...</p>
                    </div>
                  ) : (
                    <>
                      <TabsContent value="activities" className="m-0 space-y-6 animate-in fade-in duration-300">
                        {submissions.length === 0 ? (
                          <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 bg-muted/10 border-2 border-dashed rounded-[3rem]">
                            <CheckCircle2 className="h-12 w-12 opacity-10" />
                            <p className="text-muted-foreground font-medium italic">No pending activity submissions in this cohort.</p>
                          </div>
                        ) : (
                          submissions.map((submission) => (
                            <Card key={submission.id} className="animate-in slide-in-from-top-4 duration-500 rounded-[2rem] border-none shadow-xl overflow-hidden bg-background/50 backdrop-blur-md">
                              <div className="h-1.5 w-full bg-primary" />
                              <CardContent className="p-8 space-y-8">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                                      {submission.user.firstName[0]}{submission.user.lastName[0]}
                                    </div>
                                    <div>
                                      <p className="text-lg font-black tracking-tight">{submission.user.firstName} {submission.user.lastName}</p>
                                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 uppercase tracking-widest">
                                        <Clock className="h-3.5 w-3.5" /> 
                                        Submitted {format(new Date(submission.submittedAt), 'MMM d, h:mm a')}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="h-8 rounded-xl px-4 font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary">
                                    {submission.module.title}
                                  </Badge>
                                </div>

                                <div className="bg-muted/30 rounded-[1.5rem] p-6 space-y-4">
                                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary/60">
                                    <FileText className="h-4 w-4" /> Student Work
                                  </div>
                                  {submission.textResponse && (
                                    <p className="text-sm font-medium leading-relaxed italic text-foreground/80 border-l-4 border-primary/20 pl-4">
                                      "{submission.textResponse}"
                                    </p>
                                  )}
                                  {submission.fileUrl && (
                                    <Button 
                                      variant="outline" 
                                      className="h-12 w-full rounded-xl gap-2 font-bold bg-background shadow-sm border-primary/10 group hover:border-primary/50"
                                      onClick={() => window.open(submission.fileUrl, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                      View Attached Document
                                    </Button>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary/60">
                                    <MessageSquare className="h-4 w-4" /> Evaluator Feedback
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-3">
                                      <Textarea 
                                        placeholder="Provide detailed feedback..."
                                        className="min-h-[100px] rounded-2xl border-primary/10 font-medium"
                                        value={gradingState[submission.id]?.feedback || ''}
                                        onChange={(e) => updateGradingState(submission.id, 'feedback', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-4 flex flex-col justify-end">
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Score (%)</label>
                                        <Input 
                                          type="number" 
                                          className="h-12 rounded-xl border-primary/10 font-black text-center"
                                          value={gradingState[submission.id]?.score || '100'}
                                          onChange={(e) => updateGradingState(submission.id, 'score', e.target.value)}
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Button variant="ghost" className="h-12 rounded-xl font-black text-destructive" onClick={() => handleGrade(submission.id, 'NEEDS_REVISION')}>Reject</Button>
                                        <Button className="h-12 rounded-xl font-black bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleGrade(submission.id, 'APPROVED')}>Approve</Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>

                      <TabsContent value="essays" className="m-0 space-y-6 animate-in fade-in duration-300">
                        {essays.length === 0 ? (
                          <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 bg-muted/10 border-2 border-dashed rounded-[3rem]">
                            <CheckCircle2 className="h-12 w-12 opacity-10" />
                            <p className="text-muted-foreground font-medium italic">All quiz essays have been graded. Great work!</p>
                          </div>
                        ) : (
                          essays.map((essay) => (
                            <Card key={essay.id} className="animate-in slide-in-from-top-4 duration-500 rounded-[2rem] border-none shadow-xl overflow-hidden bg-background/50 backdrop-blur-md">
                              <div className="h-1.5 w-full bg-amber-500" />
                              <CardContent className="p-8 space-y-8">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-black text-xl">
                                      {essay.user.firstName[0]}{essay.user.lastName[0]}
                                    </div>
                                    <div>
                                      <p className="text-lg font-black tracking-tight">{essay.user.firstName} {essay.user.lastName}</p>
                                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 uppercase tracking-widest">
                                        <Clock className="h-3.5 w-3.5" /> 
                                        Submitted {format(new Date(essay.submittedAt), 'MMM d, h:mm a')}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="h-8 rounded-xl px-4 font-black uppercase tracking-widest text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                                    Quiz Essay
                                  </Badge>
                                </div>

                                <div className="space-y-4">
                                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-200/30">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700/60 mb-2">Question / Prompt</p>
                                    <p className="font-bold text-sm text-amber-900">{essay.question.questionText}</p>
                                    {essay.question.essayPrompt && <p className="text-xs text-amber-700/70 mt-2 italic">Rubric: {essay.question.essayPrompt}</p>}
                                  </div>

                                  <div className="bg-muted/30 rounded-[1.5rem] p-6 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary/60">
                                      <MessageSquare className="h-4 w-4" /> Student Response
                                    </div>
                                    <p className="text-sm font-medium leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                      {essay.response}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary/60">
                                    <Zap className="h-4 w-4" /> Evaluator Assessment
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-3">
                                      <Textarea 
                                        placeholder="Add internal feedback for the learner..."
                                        className="min-h-[100px] rounded-2xl border-primary/10 font-medium"
                                        value={gradingState[essay.id]?.feedback || ''}
                                        onChange={(e) => updateGradingState(essay.id, 'feedback', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-4 flex flex-col justify-end">
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center ml-1">
                                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Score</label>
                                          <span className="text-[10px] font-bold text-primary">MAX: {essay.question.maxScore || 100}</span>
                                        </div>
                                        <Input 
                                          type="number" 
                                          max={essay.question.maxScore || 100}
                                          className="h-12 rounded-xl border-primary/10 font-black text-center text-lg"
                                          value={gradingState[essay.id]?.score || ''}
                                          onChange={(e) => updateGradingState(essay.id, 'score', e.target.value)}
                                        />
                                      </div>
                                      <Button 
                                        className="h-12 rounded-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" 
                                        onClick={() => handleGrade(essay.id, 'APPROVED')}
                                      >
                                        Submit Grade
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </TabsContent>
                    </>
                  )}
                </div>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-700">
             <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <BookOpen className="h-32 w-32 text-primary/20 relative z-10" />
             </div>
             <div className="space-y-2">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-muted-foreground">Select Batch</h2>
                <p className="text-muted-foreground text-lg max-w-sm mx-auto font-medium italic">
                  Choose a cohort from the sidebar to begin processing live submissions.
                </p>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};
