import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  LogOut, 
  Menu, 
  LayoutDashboard, 
  Users, 
  Building2, 
  Settings, 
  BookOpen, 
  GraduationCap, 
  Award,
  Bell,
  ClipboardCheck
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) => (
    <Link to={to} className="w-full">
      <Button 
        variant="ghost" 
        className={cn(
          "w-full justify-start gap-3 px-3 py-2 h-10 transition-all duration-200",
          isActive(to) 
            ? "bg-accent text-accent-foreground font-semibold shadow-sm" 
            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
        )}
      >
        <Icon className={cn("h-4 w-4", isActive(to) ? "text-primary" : "text-muted-foreground")} />
        {children}
      </Button>
    </Link>
  );

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-8 max-w-full">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span>{settings?.companyName || 'iLearn LMS'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
            </Button>
            
            <div className="h-8 w-px bg-border mx-2 hidden sm:block"></div>

            <div className="hidden md:flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-semibold leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mt-1">
                  {user?.role === 'COURSE_CREATOR' ? 'Course Creator' : user?.role.replace('_', ' ')}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout} 
              title="Logout" 
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-2"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-background/50 backdrop-blur-sm p-4 overflow-y-auto">
           <nav className="flex flex-col gap-1">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
              Overview
            </div>
            <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>

            {(user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
              <>
                <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
                  Administration
                </div>
                <NavLink to="/admin/users" icon={Users}>User Management</NavLink>
                <NavLink to="/admin/departments" icon={Building2}>Departments</NavLink>
                <NavLink to="/admin/settings" icon={Settings}>System Settings</NavLink>
              </>
            )}

            {(user?.role === 'ADMINISTRATOR' || user?.role === 'COURSE_CREATOR') && (
              <>
                <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
                  Course Studio
                </div>
                <NavLink to="/creator/courses" icon={BookOpen}>Manage Courses</NavLink>
              </>
            )}

            {(user?.role === 'EMPLOYEE' || user?.role === 'ADMINISTRATOR') && (
              <>
                <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
                  Learning Center
                </div>
                <NavLink to="/learning/my-courses" icon={GraduationCap}>My Learning</NavLink>
                <NavLink to="/learning/certificates" icon={Award}>My Certificates</NavLink>
              </>
            )}

            {(user?.role === 'SUPERVISOR' || user?.role === 'DEPARTMENT_HEAD' || user?.role === 'ADMINISTRATOR') && (
              <>
                <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
                  Supervisor
                </div>
                <NavLink to="/supervisor/team-evaluations" icon={ClipboardCheck}>Team Evaluations</NavLink>
              </>
            )}
           </nav>
           
           <div className="mt-auto p-4 border-t border-border/50">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <p className="text-sm font-medium text-primary mb-1">Learning Support</p>
                <p className="text-xs text-muted-foreground">Need help with your courses?</p>
                <Button variant="link" className="h-auto p-0 text-xs text-primary mt-2">Contact IT Helpdesk</Button>
              </div>
           </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-muted/10">
          <div className="container mx-auto p-6 md:p-8 space-y-8 max-w-7xl animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
