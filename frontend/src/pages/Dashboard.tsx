import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '../components/ui/card';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  AlertCircle

} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard.api';
import type { DashboardMetric } from '../api/dashboard.api';
import { announcementsApi } from '../api/announcements.api';
import type { Announcement } from '../api/announcements.api';

import { Skeleton } from '../components/ui/skeleton';
import { WelcomeBanner } from '../components/dashboard/WelcomeBanner';
import { cn } from '../lib/utils';


export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsData, annData] = await Promise.all([
          dashboardApi.getMetrics(),
          announcementsApi.getAll()
        ]);
        setMetrics(metricsData.metrics);
        setAnnouncements(annData);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const latestBulletin = announcements.find(a => a.imageUrl);

  const getMetricIcon = (label: string) => {
    if (label.includes('Overdue')) return AlertCircle;
    if (label.includes('Users') || label.includes('Learners')) return Users;

    if (label.includes('Courses') || label.includes('Content')) return BookOpen;
    if (label.includes('Completion') || label.includes('Compliance')) return CheckCircle2;
    if (label.includes('Approval')) return Clock;
    if (label.includes('Health')) return ShieldCheck;
    return Activity;
  };

  const getMetricColor = (growth: string) => {
    const g = growth.toUpperCase();
    if (g.includes('ACTION') || g.includes('NEEDS') || g.includes('CRITICAL') || g.includes('OVERDUE')) return 'text-destructive animate-pulse';
    if (g.includes('GOOD') || g.includes('TRACK') || g.startsWith('+')) return 'text-green-500';
    return 'text-muted-foreground';
  };


  const isAdminOrManager = user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER';

  const getHealthTitle = () => {
    switch (user?.role) {
      case 'ADMINISTRATOR': return 'Platform Health';
      case 'LEARNING_MANAGER': return 'System Activity';
      default: return '';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            Welcome back, {user?.firstName || user?.username}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {isAdminOrManager 
              ? "Here's what's happening across your learning platform today."
              : "Your personalized learning overview and metrics."
            }
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">Download Reports</Button>
          {user?.role === 'ADMINISTRATOR' && <Button size="sm" onClick={() => navigate('/admin/settings')}>System Settings</Button>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : (
          metrics.map((stat, i) => {
            const Icon = getMetricIcon(stat.label);
            return (
              <Card key={i} className="hover:shadow-lg transition-all duration-300 border-none bg-background/50 backdrop-blur-sm shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</CardTitle>
                  <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black tracking-tight">{stat.value}</div>
                  <p className={cn("text-xs font-bold mt-2 flex items-center gap-1", getMetricColor(stat.growth))}>

                    {!stat.growth.toUpperCase().includes('GOOD') && !stat.growth.toUpperCase().includes('TRACK') && <TrendingUp className="h-3.5 w-3.5" />}

                    {stat.growth}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Welcome Billboard (Banner) - Full Width for everyone */}
      <WelcomeBanner announcement={latestBulletin} />

      {/* Conditional Bottom Section: Only for Administrators and Learning Managers */}
      {isAdminOrManager && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="col-span-1 shadow-sm border-none bg-background/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
                <CardDescription>Tailored to your governance scope.</CardDescription>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground opacity-50" />
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  {[1, 2, 3, 4].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/40 hover:bg-card/80 transition-colors cursor-pointer group">
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                         <Clock className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">Action Recorded</p>
                        <p className="text-xs text-muted-foreground font-medium">Platform sync in progress...</p>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                        Just now
                      </div>
                    </div>
                  ))}
               </div>
               <Button variant="ghost" className="w-full mt-6 text-primary font-bold hover:bg-primary/5" size="sm">
                  View all activity <ArrowRight className="ml-2 h-4 w-4" />
               </Button>
            </CardContent>
          </Card>

          <Card className="col-span-1 shadow-sm border-none bg-background/50 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <Zap className="h-32 w-32" />
            </div>
            <CardHeader>
              <CardTitle className="text-xl font-bold">{getHealthTitle()}</CardTitle>
              <CardDescription>Real-time server and database metrics.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10 space-y-8 relative">
               <div className="relative h-44 w-44">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-muted/10"
                      strokeDasharray="100, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <path
                      className="text-primary transition-all duration-1000 ease-in-out"
                      strokeDasharray="98, 100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(var(--primary), 0.5))' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-4xl font-black tracking-tighter">98%</span>
                    <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mt-1">Uptime</span>
                  </div>
               </div>
               
               <div className="w-full space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                     <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                           <ShieldCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-sm font-bold text-green-700">All Systems Operational</p>
                     </div>
                     <span className="text-[10px] font-black text-green-600/60 uppercase">Real-time</span>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
