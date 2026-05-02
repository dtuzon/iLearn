import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/dashboard.api';
import { announcementsApi } from '../api/announcements.api';
import type { Announcement } from '../api/announcements.api';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '../components/ui/card';
import { 
  CheckCircle2, 
  Clock,
  TrendingUp,
  ArrowRight,
  Megaphone,
  AlertCircle,
  Plus,
  Play,
  GraduationCap,
  ClipboardList,
  UserCheck,
  Building2,
  Activity,
  Image as ImageIcon,
  Calendar as CalendarIcon,
  Sparkles,
  Inbox,
  Users,
  BookOpen
} from 'lucide-react';

import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';

import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

// --- Shared Components ---

const EmptyState = ({ message, icon: Icon = Inbox }: { message: string, icon?: any }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in duration-500">
    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
      <Icon className="h-8 w-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{message}</h3>
    <p className="text-sm text-slate-500 mt-1">You're all caught up for now!</p>
  </div>
);

const MetricCard = ({ title, value, subtitle, icon: Icon, colorClass = "text-amber-500", borderClass = "border-l-amber-500" }: any) => (
  <Card className={cn("shadow-sm border-slate-200 transition-all hover:shadow-md border-l-4", borderClass)}>
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      {Icon && <Icon className={cn("h-4 w-4", colorClass)} />}
    </CardHeader>
    <CardContent>
      <div className="text-4xl font-bold tracking-tight">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

// --- Role-Based Dashboards ---

const EmployeeDashboard = ({ metrics }: { metrics: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
    <MetricCard 
      title="Active Learning" 
      value={metrics.activeCoursesCount} 
      subtitle="Courses currently in progress" 
      icon={Play}
      colorClass="text-amber-500"
      borderClass="border-l-amber-500"
    />
    <MetricCard 
      title="Completed" 
      value={metrics.completedCoursesCount} 
      subtitle="Courses finished successfully" 
      icon={CheckCircle2}
      colorClass="text-green-500"
      borderClass="border-l-green-500"
    />
    <Card className="shadow-sm border-slate-200 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Resume Learning</CardTitle>
        <Clock className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        {metrics.recentCourse ? (
          <div className="space-y-3">
            <div className="font-bold text-lg truncate leading-tight">{metrics.recentCourse.title}</div>
            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2 italic">No recent activity found.</p>
        )}
      </CardContent>
    </Card>
  </div>
);

const CreatorDashboard = ({ metrics }: { metrics: any }) => (
  <div className="space-y-6 mt-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard title="Authored Courses" value={metrics.authoredCoursesCount} icon={BookOpen} />
      <MetricCard title="Total Learners" value={metrics.totalLearners} icon={Users} colorClass="text-blue-500" borderClass="border-l-blue-500" />
      <MetricCard title="Pending Feedback" value={0} icon={Sparkles} colorClass="text-purple-500" borderClass="border-l-purple-500" />
    </div>
    
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">Drafts in Progress</CardTitle>
        <CardDescription>Courses currently under development.</CardDescription>
      </CardHeader>
      <CardContent>
        {metrics.draftCourses?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.draftCourses.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors hover:border-amber-200">
                <div className="truncate font-semibold text-sm">{d.title}</div>
                <Badge variant="outline" className="ml-2 shrink-0 border-amber-200 text-amber-700">v{d.version}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No drafts found" icon={Sparkles} />
        )}
      </CardContent>
    </Card>
  </div>
);

const ManagerDashboard = ({ metrics }: { metrics: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
    <MetricCard 
      title="Pending Approvals" 
      value={metrics.pendingApprovalsCount} 
      subtitle="Courses awaiting publication" 
      icon={ClipboardList}
    />
    <MetricCard 
      title="Pending Grades" 
      value={metrics.pendingWorkshopGradesCount} 
      subtitle="Workshop submissions to review" 
      icon={GraduationCap}
      colorClass="text-blue-500"
      borderClass="border-l-blue-500"
    />
    <MetricCard 
      title="180-Day Evals" 
      value={metrics.pending180DayEvals} 
      subtitle="Upcoming behavioral reviews" 
      icon={UserCheck}
      colorClass="text-purple-500"
      borderClass="border-l-purple-500"
    />
  </div>
);

const AdminDashboard = ({ metrics }: { metrics: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
    <MetricCard title="System Users" value={metrics.totalUsers} icon={Users} />
    <MetricCard title="Published Content" value={metrics.totalPublishedCourses} icon={BookOpen} colorClass="text-blue-500" borderClass="border-l-blue-500" />
    <Card className="shadow-sm border-slate-200 border-l-4 border-l-green-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Global Completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-4xl font-bold tracking-tight text-green-600">{metrics.overallCompletionRate}%</div>
        <Progress value={metrics.overallCompletionRate} className="h-2 bg-green-100" />
      </CardContent>
    </Card>
  </div>
);

const SupervisorDashboard = ({ metrics }: { metrics: any }) => (
  <div className="space-y-6 mt-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="shadow-sm border-slate-200 border-l-4 border-l-amber-500 bg-amber-50/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Team Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold tracking-tight text-amber-600">{metrics.teamComplianceRate}%</div>
          <Progress value={metrics.teamComplianceRate} className="h-2 mt-4 bg-amber-100" />
        </CardContent>
      </Card>
      <MetricCard title="Overdue Tasks" value={metrics.overdueTeamCoursesCount} icon={AlertCircle} colorClass="text-red-500" borderClass="border-l-red-500" />
      <MetricCard title="My Reviews" value={metrics.pendingEvaluationsToComplete} icon={UserCheck} colorClass="text-blue-500" borderClass="border-l-blue-500" />
    </div>
    
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg">Direct Reports Progress</CardTitle>
        <CardDescription>Real-time status of your team's learning journey.</CardDescription>
      </CardHeader>
      <CardContent>
        {metrics.teamProgress?.length > 0 ? (
          <div className="space-y-6">
            {metrics.teamProgress.map((member: any) => (
              <div key={member.id} className="group transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm group-hover:text-amber-600 transition-colors">{member.name}</div>
                  <div className="text-xs font-medium text-muted-foreground">
                    <span className="text-foreground font-bold">{member.completedCourses}/{member.totalCourses}</span> Courses Completed
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-bold text-amber-600 uppercase">{member.complianceRate}% Readiness</div>
                  </div>
                  <Progress value={member.complianceRate} className="h-2 bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No direct reports found" />
        )}
      </CardContent>
    </Card>
  </div>
);

const DepartmentHeadDashboard = ({ metrics }: { metrics: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
    <Card className="col-span-1 md:col-span-2 shadow-xl border-none bg-slate-900 text-white overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <Building2 className="h-32 w-32" />
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-300 uppercase tracking-widest text-xs font-black">
          Departmental Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row items-center gap-12 py-8 relative z-10">
         <div className="space-y-1">
            <div className="text-7xl font-black text-amber-400">{metrics.departmentComplianceRate}%</div>
            <div className="text-sm text-slate-400 font-medium italic">Average Departmental Compliance</div>
         </div>
         <div className="flex-1 w-full space-y-4">
            <div className="flex justify-between items-end mb-1">
               <span className="text-xs font-bold text-slate-400">READINESS QUOTA</span>
               <span className="text-xs font-bold text-amber-400">{metrics.departmentComplianceRate}%</span>
            </div>
            <Progress value={metrics.departmentComplianceRate} className="h-4 bg-slate-800" />
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              Based on overall course completions across all {metrics.totalDepartmentLearners} active employees in your assigned department.
            </p>
         </div>
      </CardContent>
    </Card>
    <MetricCard 
      title="Headcount" 
      value={metrics.totalDepartmentLearners} 
      subtitle="Active department members" 
      icon={Users} 
    />
  </div>
);

// --- Main Dashboard Component ---

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isPosting, setIsPosting] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ 
    title: '', 
    content: '', 
    priority: 'NORMAL',
    imageUrl: '',
    expiresAt: ''
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [metricsData, announcementsData] = await Promise.all([
          dashboardApi.getMetrics(),
          announcementsApi.getAll()
        ]);
        setMetrics(metricsData);
        setAnnouncements(announcementsData);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const handlePostAnnouncement = async () => {
    try {
      await announcementsApi.create({
        ...newAnnouncement,
        expiresAt: newAnnouncement.expiresAt ? new Intl.DateTimeFormat('en-US').format(new Date(newAnnouncement.expiresAt)) : undefined
      });
      toast.success('Announcement broadcasted successfully');
      setIsPosting(false);
      setNewAnnouncement({ title: '', content: '', priority: 'NORMAL', imageUrl: '', expiresAt: '' });
      const data = await announcementsApi.getAll();
      setAnnouncements(data);
    } catch (error) {
      toast.error('Failed to broadcast announcement');
    }
  };

  const isAdminOrLM = user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="relative">
          <Activity className="h-16 w-16 animate-pulse text-amber-500 opacity-20" />
          <Activity className="h-16 w-16 absolute inset-0 animate-ping text-amber-500 opacity-10" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-xl font-bold tracking-tight text-slate-800 animate-pulse">Initializing Elevate HQ...</p>
          <p className="text-sm text-slate-400 font-medium">Calibrating your personalized performance metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 px-3 py-0.5 font-bold uppercase tracking-widest text-[10px]">
               {user?.role.replace('_', ' ')}
             </Badge>
             <span className="h-1 w-1 rounded-full bg-slate-300" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">System Live</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 leading-none">
            {user?.firstName || user?.username}<span className="text-amber-500">'s</span> Command.
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-2xl">
            A comprehensive overview of your learning ecosystem and team performance.
          </p>
        </div>
        
        <div className="flex gap-3 shrink-0">
          {isAdminOrLM && (
            <Dialog open={isPosting} onOpenChange={setIsPosting}>
              <DialogTrigger asChild>
                <Button variant="default" className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 px-6 h-12">
                  <Plus className="mr-2 h-5 w-5" /> Broadcast Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                    <Megaphone className="h-6 w-6 text-amber-500" /> New Global Broadcast
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 py-6">
                  <div className="col-span-2 space-y-2">
                    <Label className="font-bold text-xs uppercase text-slate-500">Subject Title</Label>
                    <Input 
                      placeholder="e.g., Seasonal Workshop: Q3 Kickoff" 
                      className="bg-slate-50 border-slate-200 h-12 font-semibold"
                      value={newAnnouncement.title}
                      onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="font-bold text-xs uppercase text-slate-500">Message Content</Label>
                    <Textarea 
                      placeholder="Enter the broadcast message..." 
                      className="min-h-[120px] bg-slate-50 border-slate-200 resize-none"
                      value={newAnnouncement.content}
                      onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase text-slate-500 flex items-center gap-2">
                      <ImageIcon className="h-3 w-3" /> Cover Image URL
                    </Label>
                    <Input 
                      placeholder="https://..." 
                      className="bg-slate-50 border-slate-200"
                      value={newAnnouncement.imageUrl}
                      onChange={e => setNewAnnouncement({...newAnnouncement, imageUrl: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase text-slate-500 flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3" /> Auto-Expire Date
                    </Label>
                    <Input 
                      type="date"
                      className="bg-slate-50 border-slate-200"
                      value={newAnnouncement.expiresAt}
                      onChange={e => setNewAnnouncement({...newAnnouncement, expiresAt: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="font-bold text-xs uppercase text-slate-500">Priority Level</Label>
                    <Select 
                      value={newAnnouncement.priority} 
                      onValueChange={v => setNewAnnouncement({...newAnnouncement, priority: v})}
                    >
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">Standard Priority</SelectItem>
                        <SelectItem value="HIGH">High Priority (Pinned & Highlighted)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="ghost" className="font-bold" onClick={() => setIsPosting(false)}>Cancel</Button>
                  <Button className="bg-amber-500 hover:bg-amber-600 font-bold px-8" onClick={handlePostAnnouncement}>
                    Launch Broadcast
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Bulletin Board Redesign */}
      <div className="bg-slate-900 rounded-3xl p-1 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Megaphone className="h-32 w-32 text-white" />
        </div>
        
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-white/5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Megaphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Bulletin Board</h2>
              <p className="text-slate-400 text-sm font-medium">Official HQ Updates & Announcements</p>
            </div>
          </div>
          <div className="flex gap-2">
             <Badge variant="outline" className="text-white border-white/10 font-mono text-[10px] px-3">
               {announcements.length} ACTIVE
             </Badge>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar scroll-smooth flex gap-6 p-6 md:p-8 relative z-10">
          {announcements.length > 0 ? (
            announcements.map((item) => (
              <Card key={item.id} className={cn(
                "min-w-[350px] md:min-w-[450px] max-w-[500px] border-none shadow-lg overflow-hidden bg-white dark:bg-slate-800 transition-all hover:-translate-y-1 duration-300",
                item.priority === 'HIGH' && "ring-4 ring-amber-500/30"
              )}>
                {item.imageUrl && (
                  <div className="h-48 w-full relative overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {item.priority === 'HIGH' && (
                      <div className="absolute top-4 left-4">
                         <Badge className="bg-amber-500 text-white border-none font-black text-[10px] px-3">IMPORTANT</Badge>
                      </div>
                    )}
                  </div>
                )}
                <CardContent className={cn("p-6 space-y-4", !item.imageUrl && "pt-8")}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!item.imageUrl && item.priority === 'HIGH' && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">{item.title}</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 italic">"{item.content}"</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-[10px] font-bold text-amber-700">
                         {item.author.firstName?.[0]}{item.author.lastName?.[0]}
                       </div>
                       <div className="text-[10px] font-bold uppercase text-slate-400">
                         {item.author.firstName} {item.author.lastName}
                       </div>
                    </div>
                    <div className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase italic">
                      {format(new Date(item.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-12 text-slate-500 space-y-4">
              <Sparkles className="h-10 w-10 opacity-20" />
              <p className="italic font-medium">The board is currently clear. No news is good news!</p>
            </div>
          )}
        </div>
      </div>

      {/* Role-Based Performance Metrics */}
      <div className="mt-16 animate-in slide-in-from-bottom-8 duration-700 delay-300">
        <div className="flex items-center gap-6 mb-8">
           <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl">
             <TrendingUp className="h-6 w-6 text-amber-400" />
           </div>
           <div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Intelligence Hub</h2>
             <p className="text-slate-400 text-sm font-medium">Real-time performance analytics and KPIs</p>
           </div>
           <div className="h-px flex-1 bg-slate-100" />
        </div>
        
        <div className="relative">
          {user?.role === 'EMPLOYEE' && <EmployeeDashboard metrics={metrics} />}
          {user?.role === 'COURSE_CREATOR' && <CreatorDashboard metrics={metrics} />}
          {user?.role === 'LEARNING_MANAGER' && <ManagerDashboard metrics={metrics} />}
          {user?.role === 'ADMINISTRATOR' && <AdminDashboard metrics={metrics} />}
          {user?.role === 'SUPERVISOR' && <SupervisorDashboard metrics={metrics} />}
          {user?.role === 'DEPARTMENT_HEAD' && <DepartmentHeadDashboard metrics={metrics} />}
        </div>
      </div>
    </div>
  );
};
