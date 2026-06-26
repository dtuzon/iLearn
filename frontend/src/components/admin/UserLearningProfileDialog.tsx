import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api/users.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { 
  Loader2, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Briefcase, 
  Calendar, 
  ShieldCheck, 
  UserCheck, 
  Award, 
  Route, 
  BookOpen, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Building2
} from 'lucide-react';
import { format } from 'date-fns';

interface UserLearningProfileDialogProps {
  userId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserLearningProfileDialog: React.FC<UserLearningProfileDialogProps> = ({
  userId,
  isOpen,
  onOpenChange,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId && isOpen) {
      const fetchProgress = async () => {
        setIsLoading(true);
        try {
          const res = await usersApi.getProgress(userId);
          setData(res);
        } catch (error) {
          console.error('Failed to load user progress:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProgress();
    } else {
      setData(null);
    }
  }, [userId, isOpen]);

  if (!isOpen) return null;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-success hover:bg-success/90 border-none text-white font-bold">COMPLETED</Badge>;
      case 'PENDING_GRADING':
        return <Badge className="bg-amber-500 hover:bg-amber-600 border-none text-white font-bold animate-pulse">PENDING GRADING</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">IN PROGRESS</Badge>;
      case 'NOT_STARTED':
      default:
        return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 font-bold">NOT STARTED</Badge>;
    }
  };

  const calculatePathProgress = (pathEnrollment: any) => {
    const pathCourses = pathEnrollment.learningPath?.pathCourses || [];
    const totalCourses = pathCourses.length;
    if (totalCourses === 0) return { progress: 0, completedCount: 0, totalCourses: 0 };

    const completedCount = pathCourses.filter((pc: any) => {
      const courseEnrollment = data.enrollments?.find((e: any) => e.courseId === pc.courseId);
      return courseEnrollment?.status === 'COMPLETED';
    }).length;

    const progress = Math.round((completedCount / totalCourses) * 100);
    return { progress, completedCount, totalCourses };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-[2.5rem] p-8 border-border/50 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto flex flex-col gap-6">
        <DialogHeader className="sr-only">
          <DialogTitle>Employee Profile</DialogTitle>
          <DialogDescription>Detailed overview of learning milestones and certifications.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse font-medium">Retrieving employee credentials...</p>
          </div>
        ) : data ? (
          <>
            {/* Header / Hero Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 p-6 md:p-8 rounded-[2rem] border shadow-sm shrink-0">
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                <div className="h-20 w-20 rounded-3xl bg-primary shadow-xl shadow-primary/20 flex items-center justify-center shrink-0">
                  <UserIcon className="h-12 w-12 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-foreground">
                      {data.user.firstName} {data.user.lastName}
                    </h1>
                    <Badge variant={data.user.isActive ? "default" : "destructive"} className="rounded-full font-bold text-[10px] py-0.5 px-2">
                      {data.user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm font-semibold tracking-wide mt-0.5">
                    {data.user.position || 'No Position Specified'}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-1 bg-muted/60 px-2.5 py-1 rounded-md inline-block">
                    @{data.user.username}
                  </p>
                </div>
              </div>

              {/* Status Stats */}
              <div className="flex gap-4 justify-center sm:justify-start w-full md:w-auto">
                <div className="flex-1 sm:flex-none bg-background/80 backdrop-blur-sm border px-6 py-3 rounded-2xl flex flex-col items-center min-w-[100px]">
                  <span className="text-xl font-black text-primary">{data.enrollments?.filter((e: any) => e.status === 'COMPLETED').length || 0}</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground text-center">Completed</span>
                </div>
                <div className="flex-1 sm:flex-none bg-background/80 backdrop-blur-sm border px-6 py-3 rounded-2xl flex flex-col items-center border-primary/20 min-w-[100px]">
                  <span className="text-xl font-black text-primary">{data.learningPathCertificates?.length || 0}</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground text-center">Macro-Credentials</span>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="details" className="w-full flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-4 bg-muted/50 p-1 mb-6 max-w-xl rounded-2xl border shrink-0">
                <TabsTrigger value="details" className="py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="paths" className="py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                  <Route className="h-3.5 w-3.5" />
                  Paths ({data.learningPathEnrollments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="courses" className="py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Courses ({data.enrollments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="achievements" className="py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  Achievements
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-1">
                {/* Details Tab */}
                <TabsContent value="details" className="mt-0 outline-none space-y-6">
                  <Card className="border rounded-2xl overflow-hidden shadow-sm">
                    <CardHeader className="bg-muted/10 border-b">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Employment & Metadata
                      </CardTitle>
                      <CardDescription>Official corporate employment metrics.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Department</span>
                        <p className="font-bold flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {data.user.department?.name || 'Unassigned'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Immediate Superior</span>
                        <p className="font-bold flex items-center gap-2 text-sm">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          {data.user.immediateSuperior 
                            ? `${data.user.immediateSuperior.firstName} ${data.user.immediateSuperior.lastName}` 
                            : 'None'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date Hired</span>
                        <p className="font-bold flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {data.user.dateHire 
                            ? format(new Date(data.user.dateHire), 'MMMM d, yyyy') 
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">System Role</span>
                        <p className="font-bold flex items-center gap-2 text-sm uppercase">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                          {data.user.role?.replace('_', ' ')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border rounded-2xl overflow-hidden shadow-sm">
                    <CardHeader className="bg-muted/10 border-b">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Contact details
                      </CardTitle>
                      <CardDescription>Direct channels of communication.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Corporate Email</span>
                        <p className="font-bold text-sm flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <a href={`mailto:${data.user.email}`} className="text-primary hover:underline truncate">
                            {data.user.email || 'N/A'}
                          </a>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Personal Email</span>
                        <p className="font-bold text-sm flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <a href={`mailto:${data.user.personalEmail}`} className="text-primary hover:underline truncate">
                            {data.user.personalEmail || 'N/A'}
                          </a>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mobile Number</span>
                        <p className="font-bold text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{data.user.mobileNumber || 'N/A'}</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Learning Paths Tab */}
                <TabsContent value="paths" className="mt-0 outline-none space-y-6">
                  {data.learningPathEnrollments?.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed rounded-3xl opacity-50 bg-muted/5">
                      <Route className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="font-bold text-sm italic">No Enrolled Learning Paths</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {data.learningPathEnrollments.map((enrollment: any) => {
                        const { progress, completedCount, totalCourses } = calculatePathProgress(enrollment);
                        return (
                          <Card key={enrollment.id} className="border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                            <div className="p-6 space-y-4 flex-1">
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <h3 className="font-black text-base text-foreground leading-tight line-clamp-1">{enrollment.learningPath.title}</h3>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{enrollment.learningPath.description}</p>
                                </div>
                                {renderStatusBadge(enrollment.status)}
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  <span>Curriculum Progress</span>
                                  <span>{progress}% ({completedCount}/{totalCourses} courses)</span>
                                </div>
                                <Progress value={progress} className="h-1.5 bg-primary/5" />
                              </div>

                              {enrollment.learningPath.pathCourses?.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-border/50">
                                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Syllabus Milestones</span>
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {enrollment.learningPath.pathCourses.map((pc: any, idx: number) => {
                                      const courseEnrollment = data.enrollments?.find((e: any) => e.courseId === pc.courseId);
                                      const isCompleted = courseEnrollment?.status === 'COMPLETED';
                                      return (
                                        <div key={pc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs border border-border/30">
                                          <div className="flex items-center gap-2 truncate pl-1">
                                            <span className="font-black text-muted-foreground/60">{idx + 1}.</span>
                                            <span className="font-bold truncate text-foreground/80">{pc.course.title}</span>
                                          </div>
                                          {isCompleted ? (
                                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                          ) : (
                                            <Clock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="bg-muted/10 border-t px-6 py-3.5 flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              <span>Enrolled: {format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}</span>
                              {enrollment.completedAt && (
                                <span className="text-success">Completed: {format(new Date(enrollment.completedAt), 'MMM d, yyyy')}</span>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Courses Tab */}
                <TabsContent value="courses" className="mt-0 outline-none">
                  {data.enrollments?.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed rounded-3xl opacity-50 bg-muted/5">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="font-bold text-sm italic">No Enrolled Standalone/Path Courses</p>
                    </div>
                  ) : (
                    <div className="border rounded-2xl shadow-sm overflow-hidden bg-background">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="border-b border-border/50">
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider py-4">Course title</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider py-4">Lecturer</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider py-4">Status</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider py-4">Module progress</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase tracking-wider py-4 text-right pr-6">Completion</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.enrollments.map((enrollment: any) => {
                            const totalModules = enrollment.course?._count?.modules || 0;
                            const progress = totalModules > 0 
                              ? Math.min(100, Math.round((enrollment.currentModuleOrder / totalModules) * 100))
                              : 0;

                            return (
                              <TableRow key={enrollment.id} className="hover:bg-muted/10 transition-colors border-b border-border/30">
                                <TableCell className="py-4">
                                  <div className="font-bold text-foreground">{enrollment.course.title}</div>
                                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">
                                    Enrolled: {format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 font-medium text-xs text-muted-foreground">
                                  {enrollment.course.lecturer 
                                    ? `${enrollment.course.lecturer.firstName} ${enrollment.course.lecturer.lastName}` 
                                    : 'N/A'}
                                </TableCell>
                                <TableCell className="py-4">
                                  {renderStatusBadge(enrollment.status)}
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="space-y-1.5 max-w-[150px]">
                                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                                      <span>{progress}%</span>
                                      <span>{enrollment.currentModuleOrder}/{totalModules} modules</span>
                                    </div>
                                    <Progress value={progress} className="h-1 bg-primary/5" />
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 text-right text-xs font-bold text-muted-foreground pr-6">
                                  {enrollment.completedAt 
                                    ? format(new Date(enrollment.completedAt), 'MM/dd/yyyy') 
                                    : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Achievements Tab */}
                <TabsContent value="achievements" className="mt-0 outline-none space-y-6">
                  {/* Macro-Credentials */}
                  <div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Macro-Credentials (Learning Path certifications)
                    </h3>
                    {data.learningPathCertificates?.length === 0 ? (
                      <div className="py-8 text-center border border-dashed rounded-xl bg-muted/5 text-muted-foreground italic text-xs">
                        No macro-credentials generated yet.
                      </div>
                    ) : (
                      <div className="border rounded-2xl shadow-sm overflow-hidden bg-background">
                        <Table>
                          <TableHeader className="bg-muted/20">
                            <TableRow className="border-b border-border/50">
                              <TableHead className="font-bold text-[10px] uppercase tracking-wider py-3">Macro-Credential Name</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase tracking-wider py-3 text-right pr-6">Date Issued</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.learningPathCertificates.map((cert: any) => (
                              <TableRow key={cert.id} className="hover:bg-muted/10 transition-colors border-b border-border/20">
                                <TableCell className="py-3 font-bold text-foreground text-xs">{cert.learningPath?.title}</TableCell>
                                <TableCell className="py-3 text-right text-xs font-bold text-muted-foreground pr-6">
                                  {format(new Date(cert.issuedAt), 'MMMM d, yyyy')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Course Certificates */}
                  <div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Course Certificates
                    </h3>
                    {data.transcripts?.length === 0 ? (
                      <div className="py-8 text-center border border-dashed rounded-xl bg-muted/5 text-muted-foreground italic text-xs">
                        No course transcripts or certificates logged yet.
                      </div>
                    ) : (
                      <div className="border rounded-2xl shadow-sm overflow-hidden bg-background">
                        <Table>
                          <TableHeader className="bg-muted/20">
                            <TableRow className="border-b border-border/50">
                              <TableHead className="font-bold text-[10px] uppercase tracking-wider py-3">Course Curriculum</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase tracking-wider py-3">Grade Outcome</TableHead>
                              <TableHead className="font-bold text-[10px] uppercase tracking-wider py-3 text-right pr-6">Graduation Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.transcripts.map((transcript: any) => (
                              <TableRow key={transcript.id} className="hover:bg-muted/10 transition-colors border-b border-border/20">
                                <TableCell className="py-3 font-bold text-foreground text-xs">{transcript.course?.title}</TableCell>
                                <TableCell className="py-3">
                                  <Badge className="bg-success/15 hover:bg-success/20 text-success border-none text-[10px] font-bold">
                                    PASS ({transcript.finalScore || 'N/A'}%)
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3 text-right text-xs font-bold text-muted-foreground pr-6">
                                  {format(new Date(transcript.completionDate), 'MMMM d, yyyy')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground italic text-sm">
            Failed to retrieve employee data.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
