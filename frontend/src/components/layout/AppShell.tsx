import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Menu, UserCircle } from 'lucide-react';
import { Button } from '../ui/button';

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 font-bold text-xl text-primary">
              {settings?.companyLogoUrl ? (
                <img src={settings.companyLogoUrl} alt="Logo" className="h-8" />
              ) : null}
              <span>{settings?.companyName || 'iLearn LMS'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm font-medium">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
              <span>{user?.firstName} {user?.lastName}</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                {user?.role}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-background p-4 gap-2">
           <nav className="flex flex-col gap-2">
            <Link to="/dashboard">
              <Button variant="secondary" className="w-full justify-start">Dashboard</Button>
            </Link>
           </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 sm:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
