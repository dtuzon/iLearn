import React from 'react';
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
  ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      title: "Total Users",
      value: "1,284",
      change: "+12% from last month",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      title: "Active Courses",
      value: "42",
      change: "5 new this week",
      icon: BookOpen,
      color: "text-secondary-foreground",
      bg: "bg-secondary/10"
    },
    {
      title: "Completion Rate",
      value: "86%",
      change: "+4.3% improvement",
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-500/10"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            Welcome back, {user?.firstName || user?.username}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Here's what's happening across your learning platform today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">Download Reports</Button>
          <Button size="sm" onClick={() => navigate('/creator/courses')}>Create Course</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.bg} ${stat.color} p-2 rounded-md`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest enrollments and completions.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border bg-card/50">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                       <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New Course Published</p>
                      <p className="text-xs text-muted-foreground">"Advanced Cybersecurity Protocols" by Dept. Head</p>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium uppercase">
                      2h ago
                    </div>
                  </div>
                ))}
             </div>
             <Button variant="ghost" className="w-full mt-4 text-primary" size="sm">
                View all activity <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>Server and database status.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
             <div className="relative h-32 w-32">
                <svg className="h-full w-full" viewBox="0 0 36 36">
                  <path
                    className="text-muted/20"
                    strokeDasharray="100, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-primary"
                    strokeDasharray="98, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-bold">98%</span>
                  <span className="text-xs uppercase font-bold text-muted-foreground">Uptime</span>
                </div>
             </div>
             <div className="text-center">
                <p className="text-sm font-medium text-green-600 flex items-center justify-center gap-1">
                   <CheckCircle2 className="h-4 w-4" /> All Systems Operational
                </p>
                <p className="text-xs text-muted-foreground mt-1">Last checked: Just now</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
