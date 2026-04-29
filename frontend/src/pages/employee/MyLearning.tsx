import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentsApi } from '../../api/enrollments.api';
import type { Enrollment } from '../../api/enrollments.api';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Loader2, PlayCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export const MyLearning: React.FC = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEnrollments = async () => {
    setIsLoading(true);
    try {
      const data = await enrollmentsApi.getMyCourses();
      setEnrollments(data);
    } catch (error) {
      toast.error('Failed to load your courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Learning</h2>
        <p className="text-muted-foreground">Track your progress and continue your training.</p>
      </div>

      {enrollments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No courses yet</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              You haven't been enrolled in any courses yet. Check back later or contact your manager.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => {
            const totalModules = enrollment.course._count.modules;
            const progress = totalModules > 0 
              ? Math.min(100, Math.round((enrollment.currentModuleOrder / totalModules) * 100))
              : 0;

            return (
              <Card key={enrollment.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="line-clamp-2">{enrollment.course.title}</CardTitle>
                    {enrollment.status === 'COMPLETED' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    Course Creator: {enrollment.course.lecturer?.firstName} {enrollment.course.lecturer?.lastName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Module {enrollment.currentModuleOrder + 1} of {totalModules}
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={enrollment.status === 'COMPLETED' ? 'outline' : 'default'}
                    onClick={() => navigate(`/learning/course/${enrollment.course.id}`)}
                  >
                    {enrollment.status === 'COMPLETED' ? 'Review Course' : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {enrollment.currentModuleOrder === 0 ? 'Start Course' : 'Continue Course'}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
