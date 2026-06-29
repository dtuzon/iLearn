import React, { useState, useEffect } from 'react';
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
  User,
  ShieldCheck,
  UserPlus,
  LayoutGrid,
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { NotificationBell } from './NotificationBell';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '../ui/sheet';

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
  const { settings } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getPageTitle = (pathname: string): string => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/profile-settings') return 'Profile Settings';
    if (pathname.startsWith('/admin/settings')) return 'System Settings';
    if (pathname.startsWith('/admin/departments')) return 'Departments';
    if (pathname.startsWith('/admin/users')) return 'User Management';
    if (pathname.startsWith('/admin/enrollments')) return 'Manage Enrollments';
    if (pathname.startsWith('/admin/batches')) return 'Manage Batches';
    if (pathname.startsWith('/admin/evaluation-templates')) return 'Evaluation Templates';
    if (pathname.startsWith('/admin/bulletin')) return 'Manage Bulletin';
    if (pathname.startsWith('/creator/courses')) return 'Course Studio';
    if (pathname.startsWith('/creator/learning-paths')) return 'Learning Paths';
    if (pathname.startsWith('/learning/my-courses')) return 'My Learning';
    if (pathname.startsWith('/learning/course')) return 'Course Player';
    if (pathname.startsWith('/learning/certificates')) return 'My Certificates';
    if (pathname.startsWith('/learning/discover')) return 'Discover Catalog';
    if (pathname.startsWith('/learning/paths')) return 'Learning Path Roadmap';
    if (pathname.startsWith('/learning/calendar')) return 'Learning Calendar';
    if (pathname.startsWith('/supervisor/team-evaluations')) return 'Team Evaluations';
    if (pathname.startsWith('/supervisor/team-management')) return 'Team Management';
    if (pathname.startsWith('/approvals/activities')) return 'Activity Approvals';
    if (pathname.startsWith('/checker/portal')) return 'Live Grading Portal';
    
    const segment = pathname.split('/').filter(Boolean).pop();
    if (!segment) return '';
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const pageTitle = getPageTitle(location.pathname);
    const companyName = settings?.companyName || 'Standard Insurance Co., Inc.';
    if (pageTitle) {
      document.title = `${pageTitle} | ${companyName}`;
    } else {
      document.title = companyName;
    }
  }, [location.pathname, settings]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({ to, icon: Icon, children, onClick }: { to: string, icon: any, children: React.ReactNode, onClick?: () => void }) => (
    <Link to={to} className="w-full" onClick={onClick}>
      <Button 
        variant="ghost" 
        className={cn(
          "w-full justify-start gap-3 px-3 py-2 h-10 transition-all duration-200",
          isActive(to) 
            ? "bg-accent text-accent-foreground font-semibold shadow-sm" 
            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
          sidebarCollapsed && "justify-center px-0"
        )}
        title={sidebarCollapsed ? String(children) : undefined}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isActive(to) ? "text-primary" : "text-muted-foreground")} />
        {!sidebarCollapsed && <span className="truncate">{children}</span>}
      </Button>
    </Link>
  );

  const renderSidebarContent = (isCollapsed: boolean, onLinkClick?: () => void) => {
    const SectionHeader = ({ children }: { children: React.ReactNode }) => {
      if (isCollapsed) {
        return <div className="h-px bg-border/50 my-4" />;
      }
      return (
        <div className="mt-6 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70">
          {children}
        </div>
      );
    };

    return (
      <div className="flex flex-col h-full justify-between">
        <div className="flex flex-col gap-1">
          {/* Header & Toggle Button */}
          <div className={cn(
            "flex items-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest opacity-70 justify-between",
            isCollapsed && "justify-center"
          )}>
            {!isCollapsed && <span>Overview</span>}
            {!onLinkClick && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>

          <NavLink to="/dashboard" icon={LayoutDashboard} onClick={onLinkClick}>Dashboard</NavLink>
          <NavLink to="/learning/calendar" icon={Calendar} onClick={onLinkClick}>Calendar</NavLink>
          
          {(user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
            <NavLink to="/admin/bulletin" icon={Newspaper} onClick={onLinkClick}>Manage Bulletin</NavLink>
          )}

          {(user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
            <>
              <SectionHeader>Administration</SectionHeader>
              {user?.role === 'ADMINISTRATOR' && <NavLink to="/admin/users" icon={Users} onClick={onLinkClick}>User Management</NavLink>}
              <NavLink to="/admin/batches" icon={LayoutGrid} onClick={onLinkClick}>Manage Batches</NavLink>
              <NavLink to="/admin/enrollments" icon={UserPlus} onClick={onLinkClick}>Manage Enrollments</NavLink>
              {user?.role === 'ADMINISTRATOR' && (
                <>
                  <NavLink to="/admin/departments" icon={Building2} onClick={onLinkClick}>Departments</NavLink>
                  <NavLink to="/admin/settings" icon={Settings} onClick={onLinkClick}>System Settings</NavLink>
                </>
              )}
            </>
          )}

          {(user?.role === 'ADMINISTRATOR' || user?.role === 'COURSE_CREATOR' || user?.role === 'LEARNING_MANAGER') && (
            <>
              <SectionHeader>Course Studio</SectionHeader>
              <NavLink to="/creator/courses" icon={BookOpen} onClick={onLinkClick}>Manage Courses</NavLink>
              
              {(user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
                <NavLink to="/creator/learning-paths" icon={Route} onClick={onLinkClick}>Learning Paths</NavLink>
              )}

              {(user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
                <NavLink to="/admin/evaluation-templates" icon={ClipboardList} onClick={onLinkClick}>Evaluation Templates</NavLink>
              )}
            </>
          )}

          <>
            <SectionHeader>Learning Center</SectionHeader>
            <NavLink to="/learning/discover" icon={Compass} onClick={onLinkClick}>Discover</NavLink>
            <NavLink to="/learning/my-courses" icon={GraduationCap} onClick={onLinkClick}>My Learning</NavLink>
            <NavLink to="/learning/certificates" icon={Award} onClick={onLinkClick}>My Certificates</NavLink>
          </>

          {(user?.role === 'SUPERVISOR' || user?.role === 'DEPARTMENT_HEAD' || user?.role === 'ADMINISTRATOR') && (
            <>
              <SectionHeader>Supervisor</SectionHeader>
              <NavLink to="/supervisor/team-management" icon={Users} onClick={onLinkClick}>Team Management</NavLink>
              <NavLink to="/supervisor/team-evaluations" icon={ClipboardCheck} onClick={onLinkClick}>Team Evaluations</NavLink>
            </>
          )}

          {(user?.role === 'SUPERVISOR' || user?.role === 'DEPARTMENT_HEAD' || user?.role === 'ADMINISTRATOR' || user?.role === 'COURSE_CREATOR' || user?.role === 'LEARNING_MANAGER') && (
            <>
              <SectionHeader>Compliance</SectionHeader>
              <NavLink to="/approvals/activities" icon={ClipboardCheck} onClick={onLinkClick}>Activity Approvals</NavLink>
            </>
          )}

          {(user?.role === 'SUPERVISOR' || user?.role === 'DEPARTMENT_HEAD' || user?.role === 'ADMINISTRATOR' || user?.role === 'LEARNING_MANAGER') && (
            <>
              <SectionHeader>Cohort Grading</SectionHeader>
              <NavLink to="/checker/portal" icon={Zap} onClick={onLinkClick}>Live Grading Portal</NavLink>
            </>
          )}
        </div>
        
        <div className="mt-8 pt-4 border-t border-border/50 flex justify-center">
          {isCollapsed ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 text-primary bg-primary/5 rounded-xl hover:bg-primary/10 shrink-0"
              title="Contact IT Helpdesk"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          ) : (
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 w-full">
              <p className="text-sm font-medium text-primary mb-1">Learning Support</p>
              <p className="text-xs text-muted-foreground">Need help with your courses?</p>
              <Button variant="link" className="h-auto p-0 text-xs text-primary mt-2">Contact IT Helpdesk</Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8">
          
          {/* Left: Brand Hierarchy */}
          <div className="flex items-center gap-6">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Toggle navigation menu" title="Toggle navigation menu" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4 flex flex-col h-full">
                <SheetHeader className="pb-4 border-b text-left">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 flex items-center justify-center overflow-hidden rounded-xl bg-background shadow-md border border-border/50 p-1">
                      <img src="/si_logo_only.png" alt="Standard Insurance Logo" className="h-full w-full object-contain" />
                    </div>
                    <SheetTitle className="text-xl font-bold tracking-tight text-foreground">iLearn</SheetTitle>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto mt-4 pr-1">
                  {renderSidebarContent(false, () => setMobileMenuOpen(false))}
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="h-9 w-9 flex items-center justify-center overflow-hidden rounded-xl bg-background shadow-md border border-border/50 p-1">
                <img src="/si_logo_only.png" alt="Standard Insurance Logo" className="h-full w-full object-contain" />
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xl font-bold tracking-tight text-foreground">iLearn</span>
                <span className="text-muted-foreground/30 font-light text-xl">|</span>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider hidden lg:block">Standard Insurance</span>
              </div>
            </Link>
          </div>

          {/* Right: Utilities & Profile */}
          <div className="flex items-center gap-1 sm:gap-3">
            
            <div className="flex items-center gap-1 sm:mr-2">
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
                    <p className="text-xs leading-none text-muted-foreground italic">
                      Standard Insurance {
                        user?.role === 'ADMINISTRATOR' ? 'Administrator' :
                        user?.role === 'LEARNING_MANAGER' ? 'Learning Manager' :
                        user?.role === 'DEPARTMENT_HEAD' ? 'Department Head' :
                        user?.role === 'COURSE_CREATOR' ? 'Course Creator' :
                        user?.role === 'SUPERVISOR' ? 'Supervisor' :
                        'Employee'
                      }
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem 
                  onClick={() => navigate('/profile-settings')}
                  className="gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors focus:bg-accent focus:text-accent-foreground"
                >
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
        <aside className={cn(
          "hidden md:flex flex-col border-r bg-background/50 backdrop-blur-sm p-4 overflow-y-auto transition-all duration-300",
          sidebarCollapsed ? "w-20" : "w-64"
        )}>
          {renderSidebarContent(sidebarCollapsed)}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-muted/10">
          <div className={cn(
            "animate-in fade-in duration-500",
            location.pathname.startsWith('/learning/course/')
              ? "w-full min-h-full"
              : "w-full p-6 md:p-8 space-y-8 [&>*]:mx-0"
          )}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};




