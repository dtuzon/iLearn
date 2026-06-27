import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from '../components/ui/card';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  AlertCircle,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Server,
  Mail,
  Video
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard.api';
import type { DashboardMetric, DashboardData } from '../api/dashboard.api';
import { announcementsApi } from '../api/announcements.api';
import type { Announcement } from '../api/announcements.api';

import { Skeleton } from '../components/ui/skeleton';
import { WelcomeBanner } from '../components/dashboard/WelcomeBanner';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [systemStatus, setSystemStatus] = useState<DashboardData['systemStatus']>();
  const [activityChart, setActivityChart] = useState<DashboardData['activityChart']>();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdminOrManager = user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsData, annData] = await Promise.all([
          dashboardApi.getMetrics(),
          announcementsApi.getAll()
        ]);
        setMetrics(metricsData.metrics);
        setSystemStatus(metricsData.systemStatus);
        setActivityChart(metricsData.activityChart);
        setAnnouncements(annData);
      } catch {
        // Silently handled — metrics cards will show skeleton state
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const latestBulletin = announcements.find(a => a.imageUrl);

  const getMetricIcon = (label: string) => {
    if (label.includes('Overdue')) return AlertCircle;
    if (label.includes('Failed') || label.includes('Security')) return ShieldAlert;
    if (label.includes('Users') || label.includes('Learners')) return Users;
    if (label.includes('Courses') || label.includes('Content') || label.includes('Batches')) return BookOpen;
    if (label.includes('Completion') || label.includes('Compliance')) return CheckCircle2;
    if (label.includes('Approval') || label.includes('Grading') || label.includes('Reviews')) return Clock;
    if (label.includes('Health')) return ShieldCheck;
    return Activity;
  };

  const getMetricColor = (growth: string) => {
    const g = growth.toUpperCase();
    if (g.includes('ACTION') || g.includes('NEEDS') || g.includes('CRITICAL') || g.includes('OVERDUE')) return 'text-destructive animate-pulse';
    if (g.includes('GOOD') || g.includes('TRACK') || g.startsWith('+')) return 'text-green-500';
    return 'text-muted-foreground';
  };

  const handleCardClick = (label: string) => {
    if (label.includes('Batches') && (user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER')) {
      navigate('/admin/batches');
    } else if (label.includes('Grading') && ['SUPERVISOR', 'DEPARTMENT_HEAD', 'ADMINISTRATOR', 'LEARNING_MANAGER'].includes(user?.role || '')) {
      navigate('/checker/portal');
    }
  };

  const isClickable = (label: string) => {
    if (label.includes('Batches') && (user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER')) return true;
    if (label.includes('Grading') && ['SUPERVISOR', 'DEPARTMENT_HEAD', 'ADMINISTRATOR', 'LEARNING_MANAGER'].includes(user?.role || '')) return true;
    return false;
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
          {user?.role === 'ADMINISTRATOR' && <Button size="sm" onClick={() => navigate('/admin/settings')}>System Settings</Button>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className={cn("grid grid-cols-1 gap-6", metrics.length > 3 ? "md:grid-cols-3 xl:grid-cols-6" : "md:grid-cols-3")}>
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].slice(0, metrics.length || 6).map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : (
          metrics.map((stat, i) => {
            const Icon = getMetricIcon(stat.label);
            const clickable = isClickable(stat.label);
            return (
              <Card 
                key={i} 
                onClick={() => handleCardClick(stat.label)}
                className={cn(
                  "hover:shadow-lg transition-all duration-300 border-none bg-background/50 backdrop-blur-sm shadow-sm",
                  clickable && "cursor-pointer hover:border-primary/50 hover:bg-background/80 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              >
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

      {/* Admin Operations Section */}
      {user?.role === 'ADMINISTRATOR' && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* System Status Panel */}
          <Card className="lg:col-span-1 border-none bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                System Integration Status
              </CardTitle>
              <p className="text-xs text-muted-foreground">Real-time configuration & connection health check</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Database */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                    <Server className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">PostgreSQL Database</p>
                    <p className="text-xs text-muted-foreground">Connected to ilearn_db</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Connected
                </span>
              </div>

              {/* SMTP */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", systemStatus?.smtpConfigured ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive")}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">SMTP Email Server</p>
                    <p className="text-xs text-muted-foreground">
                      {systemStatus?.smtpConfigured ? "Nodemailer transport verified" : "Verification failed / not configured"}
                    </p>
                  </div>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", 
                  systemStatus?.smtpConfigured ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", systemStatus?.smtpConfigured ? "bg-green-500" : "bg-destructive")} />
                  {systemStatus?.smtpConfigured ? "Connected" : "Disconnected"}
                </span>
              </div>

              {/* Zoom S2S */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", systemStatus?.zoomConfigured ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive")}>
                    <Video className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Zoom S2S Integration</p>
                    <p className="text-xs text-muted-foreground">
                      {systemStatus?.zoomConfigured ? "OAuth API credentials verified" : "Credentials invalid or missing"}
                    </p>
                  </div>
                </div>
                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", 
                  systemStatus?.zoomConfigured ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                )}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", systemStatus?.zoomConfigured ? "bg-green-500" : "bg-destructive")} />
                  {systemStatus?.zoomConfigured ? "Connected" : "Disconnected"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Activity Chart Panel */}
          <Card className="lg:col-span-2 border-none bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  System Activity (Last 7 Days)
                </CardTitle>
                <p className="text-xs text-muted-foreground">Successful logins vs. administrative actions</p>
              </div>
            </CardHeader>
            <CardContent className="h-[280px]">
              {activityChart && activityChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      allowDecimals={false}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: '0.75rem', 
                        border: '1px solid hsl(var(--border))', 
                        backgroundColor: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))',
                        fontWeight: 'bold',
                        fontSize: 12
                      }} 
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="logins" name="Successful Logins" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="actions" name="Admin Actions" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No activity logs recorded.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
