import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { learningPathsApi } from '../../api/learning-paths.api';
import { enrollmentsApi } from '../../api/enrollments.api';
import type { LearningPath } from '../../api/learning-paths.api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Loader2, 
  ArrowLeft, 
  CheckCircle2, 
  Play, 
  Lock, 
  Route,
  ArrowRight,
  Clock,
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const PathRoadmap: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [courseStatus, setCourseStatus] = useState<Record<string, 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED'>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [pathData, myEnrollments] = await Promise.all([
          learningPathsApi.getById(id),
          enrollmentsApi.getMyCourses()
        ]);
        
        setPath(pathData);
        
        // Calculate status based on real data
        const status: Record<string, 'COMPLETED' | 'IN_PROGRESS' | 'LOCKED'> = {};
        let allPreviousCompleted = true;

        pathData.pathCourses.forEach((pc) => {
          const userEnrollment = myEnrollments.find(e => e.course.id === pc.courseId);
          
          if (userEnrollment?.status === 'COMPLETED') {
            status[pc.courseId] = 'COMPLETED';
          } else if (allPreviousCompleted) {
            status[pc.courseId] = 'IN_PROGRESS';
            allPreviousCompleted = false; // Next ones will be locked
          } else {
            status[pc.courseId] = 'LOCKED';
          }
        });
        
        setCourseStatus(status);
      } catch (error) {
        toast.error('Failed to load roadmap');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);



  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!path) return <div>Path not found</div>;

  const completedCount = Object.values(courseStatus).filter(s => s === 'COMPLETED').length;
  const progress = (completedCount / path.pathCourses.length) * 100;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-fit -ml-2 text-muted-foreground hover:text-primary"
          onClick={() => navigate('/learning/my-courses')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-none">LEARNING PATH</Badge>
              <h1 className="text-3xl font-extrabold tracking-tight">{path.title}</h1>
            </div>
            <p className="text-muted-foreground text-lg">{path.description}</p>
          </div>
          
          <div className="text-right space-y-1">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Your Progress</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-primary">{Math.round(progress)}%</span>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <Card className="border-none shadow-xl bg-background/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-muted/10 border-b">
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Path Roadmap
          </CardTitle>
          <CardDescription>Follow the sequence to master this curriculum.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="relative pl-12 space-y-12 before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
            {path.pathCourses.map((pc, index) => {
              const status = courseStatus[pc.courseId] || 'LOCKED';
              const isLocked = status === 'LOCKED';
              const isCompleted = status === 'COMPLETED';
              const isInProgress = status === 'IN_PROGRESS';

              return (
                <div key={pc.id} className="relative group">
                  {/* Timeline Node */}
                  <div className={cn(
                    "absolute -left-[49px] top-0 w-10 h-10 rounded-full border-4 border-background flex items-center justify-center z-10 transition-all duration-300 shadow-sm",
                    isCompleted ? "bg-success text-white" : 
                    isInProgress ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" : 
                    "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : 
                     isInProgress ? <Play className="h-5 w-5 fill-current" /> : 
                     <Lock className="h-4 w-4" />}
                  </div>

                  {/* Content Card */}
                  <div className={cn(
                    "p-6 rounded-2xl border transition-all duration-300",
                    isCompleted ? "bg-success/5 border-success/20 opacity-80" : 
                    isInProgress ? "bg-primary/5 border-primary/20 shadow-md scale-[1.02]" : 
                    "bg-muted/10 border-muted-foreground/10 opacity-60 grayscale"
                  )}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {index + 1}</span>
                          {isCompleted && <Badge variant="success" className="text-[10px] h-4">Completed</Badge>}
                          {isInProgress && <Badge variant="default" className="text-[10px] h-4 animate-pulse">Up Next</Badge>}
                        </div>
                        <h3 className="text-xl font-bold">{pc.course.title}</h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 45 mins</span>
                          <span className="flex items-center gap-1"><Award className="h-3 w-3" /> Certificate</span>
                        </div>
                      </div>

                      <Button 
                        disabled={isLocked}
                        variant={isInProgress ? 'default' : 'outline'}
                        className={cn(
                          "rounded-xl px-6 h-11 transition-all",
                          isInProgress && "shadow-lg shadow-primary/20 hover:translate-x-1"
                        )}
                        onClick={() => navigate(`/learning/course/${pc.courseId}`)}
                      >
                        {isCompleted ? 'Review Content' : isInProgress ? 'Start Course' : 'Locked'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
