import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentsApi } from '../../api/enrollments.api';
import { coursesApi } from '../../api/courses.api';
import { quizzesApi } from '../../api/quizzes.api';
import { evaluationsApi } from '../../api/evaluations.api';
import type { Course, CourseModule } from '../../api/courses.api';
import type { QuizQuestion } from '../../api/quizzes.api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, FileUp, Video, HelpCircle, BookOpen, ClipboardCheck, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const CoursePlayer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [currentModule, setCurrentModule] = useState<CourseModule | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});

  // Online Evaluation State
  const [evalRatings, setEvalRatings] = useState<Record<string, number>>({});
  const [evalComments, setEvalComments] = useState('');

  const fetchData = async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      // 1. Get Course & Progress
      const [courseData, progressData] = await Promise.all([
        coursesApi.getById(courseId),
        enrollmentsApi.getProgress(courseId)
      ]);

      setCourse(courseData);
      setEnrollment(progressData);

      // 2. Identify Current Module
      const modules = courseData.modules || [];
      modules.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      
      const current = modules.find(m => m.sequenceOrder === progressData.currentModuleOrder);
      
      if (current) {
        setCurrentModule(current);
        
        // 3. If Quiz, fetch questions
        if (current.type === 'PRE_QUIZ' || current.type === 'POST_QUIZ') {
          const questions = await quizzesApi.getModuleQuestions(current.id);
          setQuizQuestions(questions);
        }
      } else if (progressData.currentModuleOrder >= modules.length && modules.length > 0) {
        // Course Finished
        setCurrentModule(null);
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

  const handleFileUpload = async () => {
     // Placeholder for workshop upload - Phase 3 backend usually handles this via a specific route
     // For now, we'll just simulate completion as requested by the prompt for the "Workshop Module"
     toast.info('File upload submitted. Processing...');
     handleCompleteModule();
  };

  const handleSubmitEvaluation = async () => {
    if (!currentModule || !enrollment) return;

    const facilitators = currentModule.facilitators || [];
    const allRated = facilitators.every(f => evalRatings[f] !== undefined);

    if (!allRated) {
      toast.error('Please rate all facilitators before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const facilitatorRatings = facilitators.map(f => ({
        name: f,
        rating: evalRatings[f]
      }));

      await evaluationsApi.submitOnlineEvaluation(enrollment.id, {
        moduleId: currentModule.id,
        comments: evalComments,
        facilitatorRatings
      });

      toast.success('Evaluation submitted successfully!');
      fetchData(); // This will advance to the next module
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit evaluation');
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
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
        <div className="text-center">
          <h2 className="text-3xl font-bold">Congratulations!</h2>
          <p className="text-muted-foreground mt-2">You have successfully completed {course.title}.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/learning/my-courses')}>Back to My Learning</Button>
          <Button onClick={() => navigate('/learning/certificates')}>View Certificate</Button>
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
          <div className="text-sm font-medium">Module {enrollment.currentModuleOrder + 1} of {totalModules}</div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progressPercent} className="w-32 h-2" />
            <span className="text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {!currentModule ? (
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
                    <video controls className="w-full h-full">
                        <source src={currentModule.contentUrlOrText} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
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
            {(currentModule.type === 'PRE_QUIZ' || currentModule.type === 'POST_QUIZ' || currentModule.type === 'EVALUATION') && (
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
              <div className="space-y-6 text-center py-8">
                <BookOpen className="h-16 w-16 text-primary mx-auto opacity-20" />
                <div className="max-w-md mx-auto">
                   <h3 className="text-xl font-semibold mb-2">Practical Workshop</h3>
                   <p className="text-muted-foreground mb-6">
                     Follow the instructions provided for this module. Once complete, upload your documentation or project file here for grading.
                   </p>
                   <div className="border-2 border-dashed rounded-xl p-8 hover:bg-muted/50 transition-colors cursor-pointer relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleFileUpload}
                      />
                      <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                      <p className="font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, ZIP, or DOCX (Max 10MB)</p>
                   </div>
                </div>
              </div>
            )}

            {/* ONLINE EVALUATION VIEW */}
            {currentModule.type === 'ONLINE_EVALUATION' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
                    <ClipboardCheck className="h-7 w-7" /> Online Training Evaluation
                  </h3>
                  <p className="text-muted-foreground italic">Your feedback helps us maintain corporate training excellence.</p>
                </div>

                <div className="space-y-6">
                  {currentModule.facilitators && currentModule.facilitators.length > 0 ? (
                    currentModule.facilitators.map((facilitator) => (
                      <div key={facilitator} className="p-6 border rounded-xl bg-muted/20 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <Label className="text-lg font-bold flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            {facilitator}
                          </Label>
                          <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Facilitator</span>
                        </div>
                        
                        <RadioGroup 
                          value={evalRatings[facilitator]?.toString()} 
                          onValueChange={(val) => setEvalRatings({...evalRatings, [facilitator]: parseInt(val)})}
                          className="flex justify-between items-center gap-2"
                        >
                          {[1, 2, 3, 4, 5].map((num) => (
                            <div key={num} className="flex-1">
                              <RadioGroupItem value={num.toString()} id={`${facilitator}-${num}`} className="peer sr-only" />
                              <Label 
                                htmlFor={`${facilitator}-${num}`}
                                className={cn(
                                  "flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:shadow-md",
                                  "hover:bg-muted/50",
                                  "peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
                                )}
                              >
                                <span className="text-lg font-bold">{num}</span>
                                <span className="text-xs uppercase font-bold tracking-tighter text-muted-foreground">
                                  {num === 1 ? 'Poor' : num === 5 ? 'Excellent' : ''}
                                </span>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl opacity-50">
                      <AlertCircle className="h-10 w-10 mx-auto mb-2" />
                      <p className="font-medium">No facilitators listed for evaluation.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    Additional Comments & Feedback
                  </Label>
                  <Textarea 
                    placeholder="Share your thoughts on the module delivery, content relevance, and overall experience..."
                    className="min-h-[120px] rounded-xl border-2 focus:border-primary/50"
                    value={evalComments}
                    onChange={(e) => setEvalComments(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t bg-muted/10 p-6 flex justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Strict Learning Loop active: Skipping modules is disabled.
            </div>
            
            {currentModule.type === 'VIDEO' && (
              <Button onClick={handleCompleteModule} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Complete & Continue
              </Button>
            )}

            {currentModule.type === 'ONLINE_EVALUATION' && (
              <Button 
                onClick={handleSubmitEvaluation} 
                disabled={isSubmitting || (currentModule.facilitators?.some(f => evalRatings[f] === undefined) ?? false)}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Evaluation & Complete Module
              </Button>
            )}

            {(currentModule.type === 'PRE_QUIZ' || currentModule.type === 'POST_QUIZ' || currentModule.type === 'EVALUATION') && quizQuestions.length > 0 && (
              <Button onClick={handleSubmitQuiz} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Answers
              </Button>
            )}
            
            {(currentModule.type === 'PRE_QUIZ' || currentModule.type === 'POST_QUIZ' || currentModule.type === 'EVALUATION') && quizQuestions.length === 0 && (
               <Button onClick={handleCompleteModule} disabled={isSubmitting}>Skip Empty Quiz</Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
};
