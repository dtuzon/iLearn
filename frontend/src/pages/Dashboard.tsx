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
  ShieldCheck

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

  const isAdminOrManager = user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsData, annData] = await Promise.all([
          dashboardApi.getMetrics(),
          announcementsApi.getAll()
        ]);
        setMetrics(metricsData.metrics);
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
    </div>
  );
};
