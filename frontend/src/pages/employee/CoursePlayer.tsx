import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentsApi } from '../../api/enrollments.api';
import { coursesApi } from '../../api/courses.api';
import { quizzesApi } from '../../api/quizzes.api';

import type { Course, CourseModule } from '../../api/courses.api';
import type { QuizQuestion } from '../../api/quizzes.api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

import { Progress } from '../../components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';

import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, Clock, Video, HelpCircle, BookOpen, ClipboardCheck, UploadCloud, File as FileIcon, Lock, PlayCircle, Calendar } from 'lucide-react';


import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { LocalVideoPlayer } from '../../components/learner/LocalVideoPlayer';
import { ActivityPlayer } from '../../components/learner/ActivityPlayer';
import { EvaluationPlayer } from '../../components/learner/EvaluationPlayer';
import { LiveSessionPlayer } from '../../components/learner/LiveSessionPlayer';





export const CoursePlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [displayedModule, setDisplayedModule] = useState<CourseModule | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAtIntro, setIsAtIntro] = useState(false);
  const [isAtClosing, setIsAtClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ score: number, passed: boolean, message: string } | null>(null);
  const [batchLock, setBatchLock] = useState<any>(null);



  const fetchData = async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const [courseData, progressData] = await Promise.all([
        coursesApi.getById(courseId),
        enrollmentsApi.getProgress(courseId)
      ]);

      setCourse(courseData);
      setEnrollment(progressData);
      
      if (progressData.batchLock) {
        setBatchLock(progressData.batchLock);
        setIsLoading(false);
        return;
      }

      setBatchLock(null);
      setQuizResult(null);
      setQuizAnswers({});


      const modules = courseData.modules || [];
      modules.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      
      const currentOrder = progressData.currentModuleOrder;
      
      setIsAtIntro(false);
      setIsAtClosing(false);

      // Target the current module based on progress order
      // If at order 0, we start at step 1
      const furthestOrder = (currentOrder === 0) ? 1 : currentOrder + 1;
      const furthestModule = modules.find(m => m.sequenceOrder === furthestOrder) || modules[modules.length - 1];
      
      // If we haven't selected a module yet, or if we just completed one, update the display
      // Otherwise keep the user on their currently selected (back-tracked) module
      setDisplayedModule(prev => {
        if (!prev || (prev.sequenceOrder < furthestOrder && !isAtClosing)) {
          return furthestModule;
        }
        // If we were on a module that just got "completed" and it's the same as the furthest module,
        // we should refresh it to show new state (like quiz results)
        const updated = modules.find(m => m.id === prev.id);
        return updated || furthestModule;
      });

      // Special handling for intro/closing flags based on whatever is displayed
      const target = furthestModule;
      if (target) {
        if (target.type === 'INTRODUCTION') setIsAtIntro(true);
        if (target.type === 'CLOSING') setIsAtClosing(true);

        if (target.type === 'PRE_QUIZ' || target.type === 'POST_QUIZ') {
          const questions = await quizzesApi.getModuleQuestions(target.id);
          setQuizQuestions(questions);
        }
      }

    } catch (error: any) {
      toast.error('Failed to load course content');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };




  useEffect(() => {
    fetchData();
  }, [courseId]);

  const handleCompleteModule = async () => {
    if (!displayedModule) return;
    setIsSubmitting(true);
    try {
      await enrollmentsApi.completeModule(displayedModule.id);
      toast.success('Module completed!');
      await fetchData(); // Reload to get next module
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to advance course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!displayedModule) return;

    // For each question, check we have an answer
    for (const q of quizQuestions) {
      if (q.type === 'ESSAY') continue; // essay is optional to fill during validation
      const hasAnswer =
        quizAnswers[q.id] !== undefined && quizAnswers[q.id] !== '';
      if (!hasAnswer) {
        toast.error('Please answer all questions before submitting.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Build typed answer array
      const answers = quizQuestions.map((q) => {
        const raw = quizAnswers[q.id] ?? '';
        if (q.type === 'ENUMERATION') return { questionId: q.id, enumerationText: raw };
        if (q.type === 'ESSAY')       return { questionId: q.id, essayText: raw };
        return { questionId: q.id, optionId: raw }; // MC / TF
      });

      const result = await quizzesApi.submitQuiz(displayedModule.id, answers as any);
      setQuizResult(result);
      result.passed ? toast.success(result.message) : toast.error(result.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };





  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!course) return <div>Course not found</div>;

  if (batchLock) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <Lock className="h-32 w-32 text-primary relative z-10" />
        </div>
        
        <div className="text-center space-y-4 max-w-lg mx-auto">
          <h2 className="text-5xl font-black italic uppercase tracking-tighter text-primary">Content Locked</h2>
          <p className="text-muted-foreground text-xl font-medium leading-relaxed px-4">
            {batchLock.message}
          </p>
        </div>

        <div className="bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary/20 p-8 rounded-[2.5rem] flex flex-col items-center gap-4">
          <Calendar className="h-8 w-8 text-primary" />
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Estimated Unlock</p>
            <p className="text-2xl font-black text-foreground">{new Date(batchLock.unlockDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={() => navigate('/learning/my-courses')}
          className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs border-primary/20 hover:bg-primary hover:text-white transition-all"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  // Course Completed View
  if (!displayedModule && enrollment?.status === 'COMPLETED') {
    const workshopModules = course.modules?.filter(m => m.type === 'WORKSHOP') || [];
    const submissions = enrollment.user?.activitySubmissions || [];
    const allApproved = workshopModules.every(m => {
      const sub = submissions.find((s: any) => s.moduleId === m.id);
      return sub && sub.status === 'APPROVED';
    });

    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
          <CheckCircle2 className="h-24 w-24 text-emerald-500 animate-in zoom-in-50 duration-500" />
          {!allApproved && (
            <div className="absolute -top-2 -right-2">
              <AlertCircle className="h-8 w-8 text-warning fill-warning/20" />
            </div>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black uppercase tracking-tight italic">
            {allApproved ? "Course Concluded" : "Sequence Finished"}
          </h2>
          <p className="text-muted-foreground text-lg">
            {allApproved 
              ? `Outstanding performance! You have mastered ${course.title}.`
              : "You've reached the end of the modules, but your final status is pending verification."}
          </p>
        </div>

        {!allApproved && (
          <Alert variant="warning" className="max-w-md bg-warning/10 border-warning/20 shadow-lg">
            <Clock className="h-4 w-4" />
            <AlertTitle className="font-black uppercase tracking-widest text-xs">Certificate Locked</AlertTitle>
            <AlertDescription className="text-sm font-medium">
              Your course is complete, but your certificate is locked pending activity approval. Please wait for your assigned checker to review your submissions.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/learning/my-courses')} className="font-bold border-primary/20">
            Back to My Learning
          </Button>
          <Button 
            onClick={() => navigate('/learning/certificates')} 
            disabled={!allApproved}
            className={cn(
              "font-black uppercase tracking-widest text-xs h-12 px-8",
              allApproved ? "shadow-lg shadow-primary/20" : "opacity-50"
            )}
          >
            {allApproved ? "Download Certificate" : "Awaiting Approval"}
          </Button>
        </div>
      </div>
    );
  }


  const totalModules = course.modules?.length || 0;
  const furthestOrderReached = (enrollment.currentModuleOrder === 0) ? 1 : enrollment.currentModuleOrder + 1;
  const progressPercent = totalModules > 0 
    ? Math.min(100, Math.round((enrollment.currentModuleOrder / totalModules) * 100))
    : 0;

  const handleModuleNavigate = async (m: CourseModule) => {
    if (m.sequenceOrder > furthestOrderReached) return;
    
    setQuizResult(null);
    setQuizAnswers({});
    setDisplayedModule(m);
    setIsAtIntro(m.type === 'INTRODUCTION');
    setIsAtClosing(m.type === 'CLOSING');

    if (m.type === 'PRE_QUIZ' || m.type === 'POST_QUIZ') {
      const questions = await quizzesApi.getModuleQuestions(m.id);
      setQuizQuestions(questions);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-8 pb-12">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 shrink-0 space-y-6">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-primary mb-2"
          onClick={() => navigate('/learning/my-courses')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Learning
        </Button>

        <Card className="border shadow-lg bg-card overflow-hidden rounded-2xl">
          <CardHeader className="pb-4 border-b bg-muted/30">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Course Map
            </CardTitle>
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                <span>Overall Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {course.modules?.sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((m) => {
              const isCompleted = m.sequenceOrder <= enrollment.currentModuleOrder;
              const isCurrent = m.id === displayedModule?.id;
              const isLocked = m.sequenceOrder > furthestOrderReached;

              return (
                <Button
                  variant="ghost"
                  key={m.id}
                  disabled={isLocked}
                  onClick={() => handleModuleNavigate(m)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left group border border-transparent h-auto justify-start whitespace-normal",
                    isCurrent ? "bg-primary/10 border-primary/20 text-primary shadow-sm hover:bg-primary/20" : 
                    isLocked ? "opacity-40 cursor-not-allowed" : 
                    "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 rounded-full p-1.5 shrink-0",
                    isCurrent ? "bg-primary text-white" : 
                    isCompleted ? "bg-emerald-100 text-emerald-600" : 
                    isLocked ? "bg-muted text-muted-foreground" : 
                    "bg-muted text-primary"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : 
                     isLocked ? <Lock className="h-3 w-3" /> : 
                     <PlayCircle className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      isCurrent ? "text-primary/70" : "text-muted-foreground"
                    )}>
                      {m.type.replace('_', ' ')}
                    </p>
                    <p className={cn(
                      "text-[11px] font-bold truncate leading-tight mt-0.5",
                      isCurrent ? "text-primary" : isLocked ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {m.title}
                    </p>
                  </div>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Small badge for current module info */}
        <div className="bg-white border p-4 rounded-2xl shadow-sm text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Your Status</p>
          <div className="flex items-center justify-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              enrollment.status === 'COMPLETED' ? "bg-emerald-500" : "bg-primary animate-pulse"
            )} />
            <span className="text-[11px] font-black uppercase tracking-tighter text-foreground">
              {enrollment.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 space-y-8 pb-12">
        {/* Module Header Pill */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full border">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Sequence</span>
              <div className="h-4 w-px bg-border" />
              <span className="text-xs font-bold">{displayedModule?.title || 'Course Overview'}</span>
           </div>
           <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground tabular-nums">
             Step {displayedModule?.sequenceOrder || 0} of {totalModules}
           </div>
        </div>

      {(isAtIntro || isAtClosing) && displayedModule ? (
        <div className="space-y-8">
          <Card className={`shadow-2xl border-none overflow-hidden animate-in fade-in duration-500`}>
            <CardHeader className={cn("p-10", isAtIntro ? "bg-primary text-primary-foreground" : "bg-success text-success-foreground")}>
              <CardTitle className="text-3xl font-black uppercase tracking-tight italic">
                {isAtIntro ? `Welcome to ${course.title}` : "Course Concluded"}
              </CardTitle>
              <CardDescription className={cn("text-lg", isAtIntro ? "text-primary-foreground/70" : "text-success-foreground/70")}>
                {isAtIntro ? "Foundation & Orientation" : "Final Summary & Resources"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 quill-content">
              <div dangerouslySetInnerHTML={{ __html: displayedModule.contentUrlOrText || '' }} />
            </CardContent>
            <CardFooter className="bg-muted/50 p-8 flex justify-between border-t items-center">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {isAtIntro ? "Ready to begin?" : "End of Learning Path"}
              </p>
              <Button 
                onClick={handleCompleteModule} 
                disabled={isSubmitting} 
                size="lg" 
                className={cn(
                  "h-14 px-10 font-black uppercase tracking-widest shadow-xl",
                  isAtIntro ? "shadow-primary/20" : "bg-success hover:bg-success/90 text-white shadow-success/20"
                )}
              >
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isAtIntro ? "Initiate Learning Sequence" : "Finalize & Exit"}
              </Button>
            </CardFooter>
          </Card>

          {displayedModule.attachments && displayedModule.attachments.length > 0 && (
            <Card className="border-none shadow-lg animate-in slide-in-from-bottom-4 duration-700">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Supplementary Materials</CardTitle>
                </div>
                <CardDescription>Download these resources for your records.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedModule.attachments.map((att: any) => (
                  <a 
                    key={att.id} 
                    href={att.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10">
                      <FileIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold truncate pr-2">{att.fileName}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono">{(att.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

        </div>

      ) : !displayedModule ? (
         <Card><CardContent className="p-8 text-center">No module available.</CardContent></Card>
      ) : (
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              {displayedModule.type === 'VIDEO' && <Video className="h-6 w-6 text-destructive" />}
              {(displayedModule.type === 'PRE_QUIZ' || displayedModule.type === 'POST_QUIZ') && <HelpCircle className="h-6 w-6 text-primary" />}
              {(displayedModule.type === 'WORKSHOP' || displayedModule.type === 'ASSIGNMENT') && <BookOpen className="h-6 w-6 text-emerald-600" />}
              {displayedModule.type === 'EVALUATION' && <ClipboardCheck className="h-6 w-6 text-secondary-foreground" />}
              {displayedModule.type === 'LIVE_SESSION' && <Video className="h-6 w-6 text-amber-500" />}
              <CardTitle>{displayedModule.title}</CardTitle>

            </div>
            <CardDescription className="capitalize">{displayedModule.type.replace('_', ' ')} Module</CardDescription>
          </CardHeader>

          <CardContent className="p-6 min-h-[300px]">
            {/* VIDEO VIEW */}
            {displayedModule.type === 'VIDEO' && (
              <div className="space-y-6">
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center overflow-hidden border">
                  {displayedModule.contentUrlOrText ? (
                    <LocalVideoPlayer 
                      url={displayedModule.contentUrlOrText} 
                      onComplete={handleCompleteModule}
                      className="w-full h-full"
                    />
                  ) : (

                    <div className="text-white text-center p-8">
                      <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Video content placeholder. [Backend: {displayedModule.contentUrlOrText || 'No URL'}]</p>
                    </div>
                  )}
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p>Watch the video above in its entirety. Once finished, click the button below to proceed to the next step.</p>
                </div>
              </div>
            )}

            {/* QUIZ VIEW */}
            {(displayedModule.type === 'PRE_QUIZ' || displayedModule.type === 'POST_QUIZ') && (
              <div className="space-y-8">
                {quizResult ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center animate-in fade-in zoom-in duration-300">
                    <div className={cn(
                      "p-4 rounded-full",
                      quizResult.passed ? "bg-emerald-500/10" : "bg-destructive/10"
                    )}>
                      {quizResult.passed ? (
                        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-16 w-16 text-destructive" />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black uppercase italic tracking-tight">
                        {displayedModule.type === 'PRE_QUIZ' ? 'Baseline Assessment' : (quizResult.passed ? 'Assessment Passed' : 'Assessment Failed')}
                      </h3>
                      <p className="text-lg font-medium text-muted-foreground max-w-md mx-auto">
                        {quizResult.message}
                      </p>
                    </div>

                    <div className="w-full max-w-xs space-y-4 pt-4">
                      <div className="flex items-center justify-between text-sm font-bold uppercase tracking-wider">
                        <span>Your Score</span>
                        <span>{quizResult.score}%</span>
                      </div>
                      <Progress value={quizResult.score} className="h-3" />
                    </div>

                    <div className="flex gap-4 pt-6">
                      {!quizResult.passed && (
                        <Button variant="outline" onClick={() => { setQuizResult(null); setQuizAnswers({}); }}>
                          Try Again
                        </Button>
                      )}
                      {quizResult.passed && (
                        <Button onClick={handleCompleteModule} disabled={isSubmitting} className="h-12 px-8 font-bold shadow-lg shadow-primary/20">
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continue to Next Module"}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                     {quizQuestions.map((q, idx) => (
                       <div key={q.id} className="space-y-4 p-5 border rounded-2xl bg-muted/20">
                         <div className="flex items-start gap-3">
                           <span className="text-primary/40 font-mono text-sm shrink-0 mt-0.5">#{idx + 1}</span>
                           <h4 className="font-semibold text-base leading-snug">{q.questionText}</h4>
                         </div>

                         {/* Multiple Choice */}
                         {(q.type === 'MULTIPLE_CHOICE' || !q.type) && (
                           <RadioGroup value={quizAnswers[q.id]} onValueChange={val => setQuizAnswers({ ...quizAnswers, [q.id]: val })} className="space-y-2">
                             {q.options.map(opt => (
                               <div key={opt.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-background border cursor-pointer transition-colors">
                                 <RadioGroupItem value={opt.id} id={opt.id} />
                                 <Label htmlFor={opt.id} className="flex-1 cursor-pointer font-normal">{opt.optionText}</Label>
                               </div>
                             ))}
                           </RadioGroup>
                         )}

                         {/* True / False */}
                         {q.type === 'TRUE_FALSE' && (
                           <RadioGroup value={quizAnswers[q.id]} onValueChange={val => setQuizAnswers({ ...quizAnswers, [q.id]: val })} className="flex gap-3">
                             {q.options.map(opt => (
                               <div key={opt.id} className={cn('flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer flex-1 justify-center font-bold transition-all', quizAnswers[q.id] === opt.id ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/40')}>
                                 <RadioGroupItem value={opt.id} id={opt.id} />
                                 <Label htmlFor={opt.id} className="cursor-pointer font-bold">{opt.optionText}</Label>
                               </div>
                             ))}
                           </RadioGroup>
                         )}

                         {/* Enumeration */}
                         {q.type === 'ENUMERATION' && (
                           <div className="space-y-2">
                             <p className="text-xs text-muted-foreground">Enter all answers separated by commas (e.g., Manila, Cebu, Davao)</p>
                             <Input placeholder="Answer 1, Answer 2, Answer 3..." value={quizAnswers[q.id] || ''} onChange={e => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })} className="h-11 border-primary/10" />
                           </div>
                         )}

                         {/* Essay */}
                         {q.type === 'ESSAY' && (
                           <div className="space-y-2">
                             {q.essayPrompt && (
                               <div className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-xl border border-dashed">📋 {q.essayPrompt}</div>
                             )}
                             <div className="flex items-center gap-3">
                               <p className="text-xs text-rose-600 font-medium">✍️ This answer will be reviewed by your checker.</p>
                               {q.maxScore != null && (
                                 <span className="text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                                   Max {q.maxScore} pts
                                 </span>
                               )}
                             </div>
                             <Textarea placeholder="Write your answer here..." value={quizAnswers[q.id] || ''} onChange={e => setQuizAnswers({ ...quizAnswers, [q.id]: e.target.value })} className="min-h-[120px] border-primary/10 resize-none" rows={5} />
                           </div>
                         )}
                       </div>
                     ))}

                     {quizQuestions.length === 0 && (
                       <div className="text-center py-12 text-muted-foreground">
                         <HelpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                         <p>No questions found for this quiz.</p>
                       </div>
                     )}
                  </div>
                )}
              </div>
            )}


            {/* WORKSHOP & ASSIGNMENT VIEW */}
            {(displayedModule.type === 'WORKSHOP' || displayedModule.type === 'ASSIGNMENT') && (
              <ActivityPlayer 
                module={displayedModule} 
                onComplete={handleCompleteModule} 
              />
            )}


            {/* UNIFIED EVALUATION VIEW */}
            {(displayedModule.type === 'EVALUATION' || displayedModule.type === 'ONLINE_EVALUATION') && (
              <EvaluationPlayer 
                courseId={courseId!}
                moduleId={displayedModule.id}
                templateId={(displayedModule as any).evaluationTemplateId}
                onComplete={handleCompleteModule}
              />
            )}


            {/* LIVE SESSION VIEW */}
            {displayedModule.type === 'LIVE_SESSION' && (
              <LiveSessionPlayer 
                module={displayedModule}
                onComplete={handleCompleteModule}
              />
            )}


          </CardContent>

          <CardFooter className="border-t bg-muted/10 p-6 flex justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Strict Learning Loop active: Skipping modules is disabled.
            </div>
            
            {!quizResult && (
              <>
                {(displayedModule.type === 'PRE_QUIZ' || displayedModule.type === 'POST_QUIZ') && quizQuestions.length > 0 && (
                  <Button onClick={handleSubmitQuiz} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Answers
                  </Button>
                )}
                
                {(displayedModule.type === 'PRE_QUIZ' || displayedModule.type === 'POST_QUIZ') && quizQuestions.length === 0 && (
                   <Button onClick={handleCompleteModule} disabled={isSubmitting}>Skip Empty Quiz</Button>
                )}
              </>
            )}


          </CardFooter>
        </Card>
      )}
      </main>
    </div>
  );

};
