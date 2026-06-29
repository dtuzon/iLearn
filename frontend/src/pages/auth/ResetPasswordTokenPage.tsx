import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2, ShieldCheck, Lock, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export const ResetPasswordTokenPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { settings } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const company = settings?.companyName || 'Standard Insurance Co., Inc.';
    document.title = `Reset Password | ${company}`;
  }, [settings]);

  // Real-time password complexity indicators
  const lengthValid = newPassword.length >= 8;
  const uppercaseValid = /[A-Z]/.test(newPassword);
  const lowercaseValid = /[a-z]/.test(newPassword);
  const numberValid = /[0-9]/.test(newPassword);
  const specialValid = /[^A-Za-z0-9]/.test(newPassword);
  const matchesConfirm = newPassword === confirmPassword && confirmPassword !== '';

  const isFormValid = lengthValid && uppercaseValid && lowercaseValid && numberValid && specialValid && matchesConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('A valid password reset token is required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password-token', { 
        token, 
        newPassword 
      });
      setIsSuccess(true);
      toast.success('Password updated successfully');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to reset password. The link may have expired or is invalid.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const baseUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : '';

  if (isSuccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-primary">Password Reset Success!</h1>
            <p className="text-muted-foreground">Your account password is updated. Redirecting you to the login screen...</p>
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
        <div className="mb-6 flex items-center gap-3">
          {settings?.companyLogoUrl && (
            <>
              <img 
                src={`${baseUrl}${settings.companyLogoUrl}`} 
                alt="Logo" 
                className="h-10 w-auto object-contain brightness-0 invert" 
              />
              <div className="h-8 w-px bg-white/30" />
            </>
          )}
          <span className="text-white text-xl font-semibold tracking-wide">
            iLearn
          </span>
        </div>

        <div className="space-y-5 text-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white/60 mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Security Protocol</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Set New Password</h2>
            <p className="text-white/70 text-xs">Enter your secure new permanent password below.</p>
          </div>

          {!token ? (
            <div className="bg-white/10 border border-white/20 p-4 rounded backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold text-sm">Missing Token</span>
              </div>
              <p className="text-xs text-white/70">
                No password reset token was detected in the URL. Please request a new link from the login page.
              </p>
              <Link to="/forgot-password" className="block text-center bg-white text-primary text-xs font-bold py-2 rounded">
                Go to Request Page
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs p-3 rounded backdrop-blur-md">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-white/80 font-medium text-xs">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input 
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-white/50 h-10 pl-10 pr-10"
                    placeholder="Enter new password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-white/80 font-medium text-xs">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-white/50 h-10 pl-10"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              {/* Password complexity checklist */}
              <div className="bg-white/5 border border-white/10 rounded p-3 text-[11px] space-y-1">
                <p className="font-semibold text-white/60 mb-1">Password Requirements:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${lengthValid ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    <span className={lengthValid ? 'text-emerald-300' : 'text-white/50'}>Min 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${uppercaseValid ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    <span className={uppercaseValid ? 'text-emerald-300' : 'text-white/50'}>1 Uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${lowercaseValid ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    <span className={lowercaseValid ? 'text-emerald-300' : 'text-white/50'}>1 Lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${numberValid ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    <span className={numberValid ? 'text-emerald-300' : 'text-white/50'}>1 Number</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${specialValid ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    <span className={specialValid ? 'text-emerald-300' : 'text-white/50'}>1 Special character (@, #, $, etc.)</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${matchesConfirm ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    <span className={matchesConfirm ? 'text-emerald-300' : 'text-white/50'}>Passwords match</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !isFormValid}
                  className={`w-full h-11 text-sm font-bold shadow-xl transition-all ${
                    isFormValid 
                      ? 'bg-white text-primary hover:bg-white/90 cursor-pointer' 
                      : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'
                  }`}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Reset Password
                </Button>
              </div>
            </form>
          )}

          <div className="text-center pt-2">
            <Link 
              to="/login" 
              className="text-white/50 hover:text-white hover:underline text-xs transition-colors"
            >
              Back to Login
            </Link>
          </div>
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
