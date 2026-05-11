import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { logout } = useAuth();

  const { settings } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/change-password', { newPassword });
      setIsSuccess(true);
      toast.success('Password updated successfully');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const baseUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : '';

  if (isSuccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center text-success">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-primary">Password Updated!</h1>
            <p className="text-muted-foreground">Your account is now secure. Redirecting you to the dashboard...</p>
          </div>
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden font-sans">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center grayscale"
        style={{ 
          backgroundImage: `url(${settings?.loginBackgroundUrl ? `${baseUrl}${settings.loginBackgroundUrl}` : 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80'})`,
          filter: 'sepia(0.6) brightness(0.4)'
        }}
      />

      <div 
        className="relative z-10 w-full md:w-[500px] flex flex-col justify-center px-10 shadow-2xl"
        style={{ backgroundColor: 'hsl(var(--primary))' }}
      >
        <div className="mb-12">
          {settings?.companyLogoUrl ? (
            <img src={`${baseUrl}${settings.companyLogoUrl}`} alt="Logo" className="h-16 w-auto object-contain" />
          ) : (
            <h1 className="text-white text-3xl font-black tracking-tighter">iLearn</h1>
          )}
        </div>

        <div className="space-y-6 text-white">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/60 mb-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Security Action Required</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Secure Your Account</h2>
            <p className="text-white/70 text-sm">Please set a permanent password for your account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white/80 font-medium">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-white/50 h-12 pl-10"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80 font-medium">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-white/50 h-12 pl-10"
                  placeholder="Repeat your password"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-white text-primary hover:bg-white/90 h-12 text-md font-bold shadow-xl transition-all"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update & Sign In
              </Button>
            </div>
          </form>

          <Button 
            variant="link" 
            className="w-full text-white/40 hover:text-white text-xs mt-4"
            onClick={() => logout()}
          >
            Cancel and Log Out
          </Button>
        </div>
      </div>

      <div className="hidden md:flex flex-1 relative z-10 flex-col justify-center p-20 text-white bg-black/20 backdrop-blur-sm">
         <div className="max-w-xl space-y-8 animate-in slide-in-from-bottom-10 duration-1000">
            <div className="h-16 w-16 rounded-3xl bg-white/10 flex items-center justify-center">
               <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-4">
               <h3 className="text-4xl font-black tracking-tighter italic uppercase">Security Matters</h3>
               <p className="text-xl text-white/70 font-light leading-relaxed">
                  "At Standard Insurance, the integrity of our data begins with you. Forcing a unique, personal password ensures that your learning journey and professional records remain under your sole control."
               </p>
               <div className="flex items-center gap-4 pt-4">
                  <div className="h-1 w-12 bg-white" />
                  <p className="text-sm font-bold tracking-widest uppercase text-white/50">Enterprise Security Protocol</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
