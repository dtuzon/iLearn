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

import { Progress } from '../../components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';

import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, Clock, Video, HelpCircle, BookOpen, ClipboardCheck } from 'lucide-react';


import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { LocalVideoPlayer } from '../../components/learner/LocalVideoPlayer';
import { ActivityPlayer } from '../../components/learner/ActivityPlayer';
import { EvaluationPlayer } from '../../components/learner/EvaluationPlayer';




export const CoursePlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [currentModule, setCurrentModule] = useState<CourseModule | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAtIntro, setIsAtIntro] = useState(false);
  const [isAtClosing, setIsAtClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});


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

      const modules = courseData.modules || [];
      modules.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      
      const currentOrder = progressData.currentModuleOrder;
      
      setIsAtIntro(false);
      setIsAtClosing(false);

      // Target the current module based on progress order
      // If at order 0, we start at step 1
      const targetOrder = (currentOrder === 0) ? 1 : currentOrder;
      const current = modules.find(m => m.sequenceOrder === targetOrder);
      
      if (current) {
        setCurrentModule(current);
        
        // Update helper flags for special styling if needed
        if (current.type === 'INTRODUCTION') setIsAtIntro(true);
        if (current.type === 'CLOSING') setIsAtClosing(true);

        if (current.type === 'PRE_QUIZ' || current.type === 'POST_QUIZ') {
          const questions = await quizzesApi.getModuleQuestions(current.id);
          setQuizQuestions(questions);
        }
      } else {
        // No current module found, likely finished
        setCurrentModule(null);
      }

    } catch (error: any) {
      toast.error('Failed to load course content');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvance = async () => {
    if (!courseId) return;
    setIsSubmitting(true);
    try {
      await enrollmentsApi.advanceProgress(courseId);
      fetchData();
    } catch (error) {
      toast.error('Failed to advance progress');
    } finally {
      setIsSubmitting(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, [courseId]);

  const handleCompleteModule = async () => {
    if (!currentModule) return;
    setIsSubmitting(true);
    try {
      await enrollmentsApi.completeModule(currentModule.id);
      toast.success('Module completed!');
      fetchData(); // Reload to get next module
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to advance course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!currentModule) return;
    
    // Check if all answered
    if (Object.keys(quizAnswers).length < quizQuestions.length) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const answers = Object.entries(quizAnswers).map(([qId, oId]) => ({
        questionId: qId,
        optionId: oId
      }));

      const result = await quizzesApi.submitQuiz(currentModule.id, answers);
      
      if (result.passed) {
        toast.success(`Quiz Passed! Score: ${result.score}%`);
        handleCompleteModule(); // This will advance them
      } else {
        toast.error(`Quiz Failed. Score: ${result.score}%. Required: ${course?.passingGrade}%. Try again!`);
        // Reset answers for retry
        setQuizAnswers({});
      }

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

  // Course Completed View
  if (!currentModule && enrollment?.status === 'COMPLETED') {
    const workshopModules = course.modules?.filter(m => m.type === 'WORKSHOP') || [];
    const submissions = enrollment.user?.activitySubmissions || [];
    const allApproved = workshopModules.every(m => {
      const sub = submissions.find((s: any) => s.moduleId === m.id);
      return sub && sub.status === 'APPROVED';
    });

    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative">
          <CheckCircle2 className="h-24 w-24 text-green-500 animate-in zoom-in-50 duration-500" />
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
  const progressPercent = totalModules > 0 
    ? Math.min(100, Math.round((enrollment.currentModuleOrder / totalModules) * 100))
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/learning/my-courses')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="text-right">
          <div className="text-sm font-medium">
            {isAtIntro ? 'Introduction' : isAtClosing ? 'Course Wrap-up' : `Module ${enrollment.currentModuleOrder} of ${totalModules}`}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progressPercent} className="w-32 h-2" />
            <span className="text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {isAtIntro && currentModule ? (
        <Card className="shadow-2xl border-none overflow-hidden">
          <CardHeader className="bg-primary text-primary-foreground p-10">
            <CardTitle className="text-3xl font-black uppercase tracking-tight italic">Welcome to {course.title}</CardTitle>
            <CardDescription className="text-primary-foreground/70 text-lg">Foundation & Orientation</CardDescription>
          </CardHeader>
          <CardContent className="p-10 quill-content">
            <div dangerouslySetInnerHTML={{ __html: currentModule.contentUrlOrText || '' }} />
          </CardContent>
          <CardFooter className="bg-muted/50 p-8 flex justify-end border-t">
            <Button onClick={handleCompleteModule} disabled={isSubmitting} size="lg" className="h-14 px-10 font-black uppercase tracking-widest shadow-xl shadow-primary/20">
               {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Initiate Learning Sequence"}
            </Button>
          </CardFooter>
        </Card>
      ) : isAtClosing && currentModule ? (
        <div className="space-y-8">
          <Card className="shadow-2xl border-none overflow-hidden">
            <CardHeader className="bg-success text-success-foreground p-10">
              <CardTitle className="text-3xl font-black uppercase tracking-tight italic">Course Concluded</CardTitle>
              <CardDescription className="text-success-foreground/70 text-lg">Final Summary & Resources</CardDescription>
            </CardHeader>
            <CardContent className="p-10 quill-content">
              <div dangerouslySetInnerHTML={{ __html: currentModule.contentUrlOrText || '' }} />
            </CardContent>
            <CardFooter className="bg-muted/50 p-8 flex justify-between border-t items-center">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">End of Learning Path</p>
              <Button onClick={handleCompleteModule} disabled={isSubmitting} size="lg" className="h-14 px-10 font-black uppercase tracking-widest bg-success hover:bg-success/90 text-white shadow-xl shadow-success/20">
                 {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalize & Exit"}
              </Button>
            </CardFooter>
          </Card>

          {course.attachments && course.attachments.length > 0 && (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Supplementary Materials</CardTitle>
                <CardDescription>Download these resources for your records.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {course.attachments.map(att => (
                  <a 
                    key={att.id} 
                    href={att.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border hover:bg-primary/5 hover:border-primary/30 transition-all group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10">
                      <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
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
      ) : !currentModule ? (
         <Card><CardContent className="p-8 text-center">No module available.</CardContent></Card>
      ) : (
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-3">
              {currentModule.type === 'VIDEO' && <Video className="h-6 w-6 text-destructive" />}
              {(currentModule.type === 'PRE_QUIZ' || currentModule.type === 'POST_QUIZ') && <HelpCircle className="h-6 w-6 text-primary" />}
              {currentModule.type === 'WORKSHOP' && <BookOpen className="h-6 w-6 text-green-600" />}
              {currentModule.type === 'EVALUATION' && <ClipboardCheck className="h-6 w-6 text-secondary-foreground" />}
              <CardTitle>{currentModule.title}</CardTitle>
            </div>
            <CardDescription className="capitalize">{currentModule.type.replace('_', ' ')} Module</CardDescription>
          </CardHeader>

          <CardContent className="p-6 min-h-[300px]">
            {/* VIDEO VIEW */}
            {currentModule.type === 'VIDEO' && (
              <div className="space-y-6">
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center overflow-hidden border">
                  {currentModule.contentUrlOrText ? (
                    <LocalVideoPlayer 
                      url={currentModule.contentUrlOrText} 
                      onComplete={handleCompleteModule}
                      className="w-full h-full"
                    />
                  ) : (

                    <div className="text-white text-center p-8">
                      <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Video content placeholder. [Backend: {currentModule.contentUrlOrText || 'No URL'}]</p>
                    </div>
                  )}
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p>Watch the video above in its entirety. Once finished, click the button below to proceed to the next step.</p>
                </div>
              </div>
            )}

            {/* QUIZ VIEW */}
            {(currentModule.type === 'PRE_QUIZ' || currentModule.type === 'POST_QUIZ') && (

              <div className="space-y-8">
                 {quizQuestions.map((q, idx) => (
                   <div key={q.id} className="space-y-4 p-4 border rounded-lg bg-muted/20">
                     <h4 className="font-medium text-lg">{idx + 1}. {q.questionText}</h4>
                     <RadioGroup 
                       value={quizAnswers[q.id]} 
                       onValueChange={(val) => setQuizAnswers({...quizAnswers, [q.id]: val})}
                       className="space-y-3"
                     >
                       {q.options.map((opt) => (
                         <div key={opt.id} className="flex items-center space-x-3 p-3 rounded-md hover:bg-background border cursor-pointer transition-colors">
                           <RadioGroupItem value={opt.id} id={opt.id} />
                           <Label htmlFor={opt.id} className="flex-1 cursor-pointer font-normal">{opt.optionText}</Label>
                         </div>
                       ))}
                     </RadioGroup>
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

            {/* WORKSHOP VIEW */}
            {currentModule.type === 'WORKSHOP' && (
              <ActivityPlayer 
                module={currentModule} 
                onComplete={handleCompleteModule} 
              />
            )}


            {/* UNIFIED EVALUATION VIEW */}
            {(currentModule.type === 'EVALUATION' || currentModule.type === 'ONLINE_EVALUATION') && (
              <EvaluationPlayer 
                courseId={courseId!}
                moduleId={currentModule.id}
                templateId={(currentModule as any).evaluationTemplateId}
                onComplete={handleCompleteModule}
              />
            )}

          </CardContent>

          <CardFooter className="border-t bg-muted/10 p-6 flex justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Strict Learning Loop active: Skipping modules is disabled.
            </div>
            
            {(currentModule.type === 'PRE_QUIZ' || currentModule.type === 'POST_QUIZ') && quizQuestions.length > 0 && (
              <Button onClick={handleSubmitQuiz} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Answers
              </Button>
            )}
            
            {(currentModule.type === 'PRE_QUIZ' || currentModule.type === 'POST_QUIZ') && quizQuestions.length === 0 && (
               <Button onClick={handleCompleteModule} disabled={isSubmitting}>Skip Empty Quiz</Button>
            )}

          </CardFooter>
        </Card>
      )}
    </div>
  );

};
