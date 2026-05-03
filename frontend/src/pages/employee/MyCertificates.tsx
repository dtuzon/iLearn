import React, { useState, useEffect } from 'react';
import { enrollmentsApi } from '../../api/enrollments.api';
import { learningPathsApi } from '../../api/learning-paths.api';
import type { Enrollment } from '../../api/enrollments.api';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Download, Award, ShieldCheck, Star, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

export const MyCertificates: React.FC = () => {
  const [completedEnrollments, setCompletedEnrollments] = useState<Enrollment[]>([]);
  const [completedPaths, setCompletedPaths] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { userId } = JSON.parse(localStorage.getItem('user') || '{}');
      const [courses, paths] = await Promise.all([
        enrollmentsApi.getMyCourses(),
        learningPathsApi.getUserEnrollments(userId)
      ]);
      
      setCompletedEnrollments(courses.filter(e => e.status === 'COMPLETED'));
      setCompletedPaths(paths.filter(p => p.status === 'COMPLETED'));
    } catch (error) {
      toast.error('Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadCourse = async (courseId: string) => {
    setIsDownloading(courseId);
    try {
      const response = await apiClient.post(`/certificates/${courseId}/generate`);
      const url = response.data.certificatePdfUrl;
      window.open(`${apiClient.defaults.baseURL?.replace('/api', '')}${url}`, '_blank');
      toast.success('Certificate opened in new tab');
    } catch (error) {
      toast.error('Failed to generate certificate');
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDownloadLP = async (lpId: string) => {
    setIsDownloading(lpId);
    try {
      const response = await apiClient.post(`/certificates/lp/${lpId}/generate`);
      const url = response.data.certificateUrl;
      window.open(`${apiClient.defaults.baseURL?.replace('/api', '')}${url}`, '_blank');
      toast.success('Macro-Credential opened in new tab');
    } catch (error) {
      toast.error('Failed to generate macro-credential');
    } finally {
      setIsDownloading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Verifying your achievements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 p-8 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-primary shadow-xl shadow-primary/20 flex items-center justify-center">
            <Award className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground">Achievement Portal</h1>
            <p className="text-muted-foreground text-lg font-medium">Showcase your verified professional milestones.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-background/80 backdrop-blur-sm border px-6 py-3 rounded-2xl flex flex-col items-center">
            <span className="text-2xl font-black text-primary">{completedEnrollments.length}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Courses</span>
          </div>
          <div className="bg-background/80 backdrop-blur-sm border px-6 py-3 rounded-2xl flex flex-col items-center border-primary/20">
            <span className="text-2xl font-black text-primary">{completedPaths.length}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Macro-Credentials</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="macro" className="w-full">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl border mb-8 h-14">
          <TabsTrigger value="macro" className="rounded-xl px-8 h-full data-[state=active]:bg-background data-[state=active]:shadow-lg gap-2 font-bold transition-all">
            <Sparkles className="h-4 w-4" />
            Macro-Credentials
          </TabsTrigger>
          <TabsTrigger value="course" className="rounded-xl px-8 h-full data-[state=active]:bg-background data-[state=active]:shadow-lg gap-2 font-bold transition-all">
            <Award className="h-4 w-4" />
            Course Certificates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="macro" className="space-y-6">
          {completedPaths.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-[3rem] bg-muted/5 opacity-50">
              <ShieldCheck className="h-16 w-16 mb-4 text-muted-foreground/30" />
              <h3 className="text-2xl font-bold italic">No Macro-Credentials Yet</h3>
              <p className="max-w-md mt-2">Complete full learning paths to earn prestigious, unified certifications of mastery.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedPaths.map(enrollment => (
                <Card key={enrollment.id} className="group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 rounded-[2rem] bg-gradient-to-br from-card to-primary/5">
                  <div className="h-32 bg-primary/10 flex items-center justify-center relative overflow-hidden">
                    <Star className="absolute -right-4 -top-4 h-24 w-24 text-primary/5 rotate-12" />
                    <Sparkles className="h-12 w-12 text-primary" />
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-primary-foreground border-none">MACRO</Badge>
                    </div>
                  </div>
                  <CardHeader className="pt-6">
                    <CardTitle className="line-clamp-1">{enrollment.learningPath.title}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                      Mastery of {enrollment.learningPath.pathCourses.length} specialized courses.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      <span>Completed</span>
                      <span>{new Date(enrollment.completedAt).toLocaleDateString()}</span>
                    </div>
                    <Button 
                      className="w-full rounded-2xl h-12 shadow-lg shadow-primary/20 group-hover:scale-[1.02] transition-transform"
                      onClick={() => handleDownloadLP(enrollment.learningPathId)}
                      disabled={isDownloading === enrollment.learningPathId}
                    >
                      {isDownloading === enrollment.learningPathId ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download Achievement
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="course" className="space-y-6">
          <div className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-background/50 backdrop-blur-sm border">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="py-6 px-8 font-black uppercase text-[10px] tracking-widest">Course Curriculum</TableHead>
                  <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest">Graduation Date</TableHead>
                  <TableHead className="py-6 font-black uppercase text-[10px] tracking-widest text-right">Verification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedEnrollments.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-20">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                          <Award className="h-8 w-8 opacity-20" />
                        </div>
                        <p className="font-medium">Complete your first course to unlock certifications.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  completedEnrollments.map((enrollment, index) => (
                    <TableRow 
                      key={enrollment.id}
                      className={cn(
                        "hover:bg-primary/[0.02] transition-colors border-b border-muted/20 group",
                        index % 2 === 0 ? "bg-transparent" : "bg-muted/5"
                      )}
                    >
                      <TableCell className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{enrollment.course.title}</div>
                            <div className="text-xs text-muted-foreground font-medium">Instructor: {enrollment.course.lecturer?.firstName} {enrollment.course.lecturer?.lastName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 font-medium text-muted-foreground">
                        {new Date(enrollment.completedAt || enrollment.enrolledAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="py-6 px-8 text-right">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="rounded-xl font-bold bg-muted hover:bg-primary hover:text-primary-foreground transition-all h-10 px-6"
                          onClick={() => handleDownloadCourse(enrollment.course.id)}
                          disabled={isDownloading === enrollment.course.id}
                        >
                          {isDownloading === enrollment.course.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Download PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

