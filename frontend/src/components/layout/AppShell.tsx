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
  ClipboardCheck,
  ClipboardList,
  Route,
  Compass,
  Newspaper,
  Search,
  LifeBuoy,
  User,
  ShieldCheck
} from 'lucide-react';


import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { NotificationBell } from './NotificationBell';

import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";




export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();

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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8">
          
          {/* Left: Brand Hierarchy */}
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-xl shadow-lg shadow-primary/20">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xl font-bold tracking-tight text-foreground">Elevate</span>
                <span className="text-muted-foreground/30 font-light text-xl">|</span>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider hidden lg:block">Standard Insurance</span>
              </div>
            </Link>
          </div>

          {/* Center: Global Search Trigger */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <Button 
              variant="outline" 
              className="w-full justify-between gap-2 px-3 h-10 bg-muted/30 border-muted-foreground/10 text-muted-foreground hover:bg-muted/50 transition-all rounded-xl font-normal group"
              onClick={() => toast.info('Command Palette coming soon!')}
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span>Search Elevate...</span>
              </div>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
          
          {/* Right: Utilities & Profile */}
          <div className="flex items-center gap-1 sm:gap-3">
            
            <div className="flex items-center gap-1 sm:mr-2">
               <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <LifeBuoy className="h-5 w-5" />
              </Button>
              <NotificationBell />
            </div>

            <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block"></div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto p-1 pr-3 flex items-center gap-3 hover:bg-accent/50 rounded-full transition-all group">
                  <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <div className="hidden md:flex flex-col items-start text-left">
                    <p className="text-sm font-bold leading-tight">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-black mt-0.5">
                      {user?.role === 'COURSE_CREATOR' ? 'Course Creator' : user?.role.replace('_', ' ')}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1 rounded-xl shadow-2xl border-border/50 backdrop-blur-xl">
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">My Account</p>
                    <p className="text-xs leading-none text-muted-foreground italic">Standard Insurance Employee</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem className="gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors focus:bg-accent focus:text-accent-foreground">
                  <User className="h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors focus:bg-accent focus:text-accent-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="gap-2 px-3 py-2 rounded-lg cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
              <NavLink to="/admin/bulletin" icon={Newspaper}>Manage Bulletin</NavLink>
            )}



            {(user?.role === 'ADMINISTRATOR') && (

              <>
                <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
                  Administration
                </div>
                <NavLink to="/admin/users" icon={Users}>User Management</NavLink>
                <NavLink to="/admin/departments" icon={Building2}>Departments</NavLink>
                <NavLink to="/admin/settings" icon={Settings}>System Settings</NavLink>
              </>
            )}

            {(user?.role === 'ADMINISTRATOR' || user?.role === 'COURSE_CREATOR' || user?.role === 'LEARNING_MANAGER') && (
              <>
                <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
                  Course Studio
                </div>
                <NavLink to="/creator/courses" icon={BookOpen}>Manage Courses</NavLink>
                
                {(user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
                  <NavLink to="/creator/learning-paths" icon={Route}>Learning Paths</NavLink>
                )}

                {(user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
                  <NavLink to="/admin/evaluation-templates" icon={ClipboardList}>Evaluation Templates</NavLink>
                )}
              </>
            )}

            {(user?.role === 'EMPLOYEE' || user?.role === 'ADMINISTRATOR') && (

              <>
                <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
                  Learning Center
                </div>
                <NavLink to="/learning/discover" icon={Compass}>Discover</NavLink>
                <NavLink to="/learning/my-courses" icon={GraduationCap}>My Learning</NavLink>
                <NavLink to="/learning/certificates" icon={Award}>My Certificates</NavLink>
              </>
            )}

            {(user?.role === 'SUPERVISOR' || user?.role === 'DEPARTMENT_HEAD' || user?.role === 'ADMINISTRATOR') && (
              <>
                <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
                  Supervisor
                </div>
                <NavLink to="/supervisor/team-management" icon={Users}>Team Management</NavLink>
                <NavLink to="/supervisor/team-evaluations" icon={ClipboardCheck}>Team Evaluations</NavLink>
              </>
            )}

            {(user?.role === 'SUPERVISOR' || user?.role === 'DEPARTMENT_HEAD' || user?.role === 'ADMINISTRATOR' || user?.role === 'COURSE_CREATOR' || user?.role === 'LEARNING_MANAGER') && (

              <>
                <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
                  Compliance
                </div>
                <NavLink to="/approvals/activities" icon={ClipboardCheck}>Activity Approvals</NavLink>
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


