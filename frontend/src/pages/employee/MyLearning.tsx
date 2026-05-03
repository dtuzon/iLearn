import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentsApi } from '../../api/enrollments.api';
import type { Enrollment } from '../../api/enrollments.api';
import { learningPathsApi } from '../../api/learning-paths.api';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Loader2, PlayCircle, CheckCircle2, Route, BookOpen, Compass } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useAuth } from '../../context/AuthContext';


export const MyLearning: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [pathEnrollments, setPathEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [coursesData, pathsData] = await Promise.all([
        enrollmentsApi.getMyCourses(),
        user ? learningPathsApi.getUserEnrollments(user.id) : Promise.resolve([])
      ]);
      setEnrollments(coursesData);
      setPathEnrollments(pathsData);
    } catch (error) {
      toast.error('Failed to load your curriculum');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary flex items-center gap-2">
            <Compass className="h-8 w-8" />
            My Learning
          </h1>
          <p className="text-muted-foreground text-lg italic">Track your progress across sequenced paths and individual courses.</p>
        </div>
        <Button variant="outline" className="shadow-sm" onClick={() => navigate('/learning/discover')}>
          Explore Catalog
        </Button>
      </div>

      <Tabs defaultValue="paths" className="w-full">
        <TabsList className="bg-muted/50 p-1 mb-8">
          <TabsTrigger value="paths" className="px-8 py-2.5 flex items-center gap-2">
            <Route className="h-4 w-4" />
            Learning Paths
          </TabsTrigger>
          <TabsTrigger value="courses" className="px-8 py-2.5 flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Individual Courses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paths" className="mt-0">
          {pathEnrollments.length === 0 ? (
            <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center opacity-50 bg-background/50">
              <Route className="h-16 w-16 mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium">No active paths</h3>
              <p className="text-sm italic max-w-xs mt-2">
                Discover curated learning journeys in the catalog to begin your certification.
              </p>
              <Button variant="link" className="mt-4" onClick={() => navigate('/learning/discover')}>
                Go to Catalog
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pathEnrollments.map((enrollment) => {
                const path = enrollment.learningPath;
                // Simulating progress based on courses inside (logic will be more complex in prod)
                const progress = 33; // Placeholder
                
                return (
                  <Card key={enrollment.id} className="group border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col">
                    <div className="h-1.5 w-full bg-primary/10 group-hover:bg-primary transition-colors" />
                    <CardHeader>
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-bold">
                          {path.pathCourses.length} COURSES
                        </Badge>
                        {enrollment.status === 'COMPLETED' && (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                      </div>
                      <CardTitle className="line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {path.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>Overall Path Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 bg-primary/5" />
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Step</p>
                        <div className="p-3 rounded-xl bg-muted/30 border border-primary/5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            2
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{path.pathCourses[1]?.course.title || 'Next Course'}</p>
                            <p className="text-[10px] text-muted-foreground">Continue where you left off</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/5 pt-4">
                      <Button 
                        className="w-full shadow-lg shadow-primary/20 group-hover:translate-x-1 transition-transform"
                        onClick={() => navigate(`/learning/paths/${path.id}`)}
                      >
                        {enrollment.status === 'COMPLETED' ? 'Review Roadmap' : 'Continue Journey'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="courses" className="mt-0">
          {enrollments.length === 0 ? (
            <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center opacity-50 bg-background/50">
              <BookOpen className="h-16 w-16 mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium">No individual courses</h3>
              <p className="text-sm italic max-w-xs mt-2">
                You are currently not enrolled in any standalone courses.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment) => {
                const totalModules = enrollment.course._count.modules;
                const progress = totalModules > 0 
                  ? Math.min(100, Math.round((enrollment.currentModuleOrder / totalModules) * 100))
                  : 0;

                return (
                  <Card key={enrollment.id} className="group border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col">
                    <div className="h-1.5 w-full bg-purple-500/10 group-hover:bg-purple-500 transition-colors" />
                    
                    <div className="h-40 w-full relative overflow-hidden bg-muted/20">
                      {enrollment.course.thumbnailUrl ? (
                        <img 
                          src={enrollment.course.thumbnailUrl} 
                          alt={enrollment.course.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500/20 via-background to-primary/20 flex items-center justify-center">
                           <BookOpen className="h-12 w-12 text-purple-500/20" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge variant="secondary" className="bg-black/40 text-white backdrop-blur-sm border-none text-[10px] font-black uppercase tracking-tighter">
                          {totalModules} MODULES
                        </Badge>
                      </div>
                      {enrollment.status === 'COMPLETED' && (
                         <div className="absolute top-3 right-3 bg-success rounded-full p-1 shadow-lg">
                           <CheckCircle2 className="h-4 w-4 text-white" />
                         </div>
                      )}
                    </div>

                    <CardHeader>
                      <CardTitle className="line-clamp-2 leading-tight group-hover:text-purple-500 transition-colors min-h-[3rem]">
                        {enrollment.course.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>Course Completion</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 bg-purple-500/5" />
                        <p className="text-[10px] text-muted-foreground italic">
                          Module {enrollment.currentModuleOrder + 1} of {totalModules}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/5 pt-4">
                      <Button 
                        className="w-full shadow-lg shadow-purple-500/20 group-hover:translate-x-1 transition-transform" 
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

