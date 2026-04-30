import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const { settings } = useTheme();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/auth/login', { username, password });
      const { token, user } = response.data;
      
      login(token, user);
      
      // Redirect based on role
      switch(user.role) {
        case 'ADMINISTRATOR': navigate('/dashboard'); break;
        case 'HR_MANAGER': navigate('/dashboard'); break;
        case 'COURSE_CREATOR': navigate('/dashboard'); break;
        case 'EMPLOYEE': navigate('/dashboard'); break;
        default: navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const baseUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : '';

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden font-sans">
      {/* Dynamic Background with Sepia Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 grayscale"
        style={{ 
          backgroundImage: `url(${settings?.loginBackgroundUrl ? `${baseUrl}${settings.loginBackgroundUrl}` : 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80'})`,
          filter: 'sepia(0.6) brightness(0.4)'
        }}
      />

      {/* Left Side: Login Box */}
      <div 
        className="relative z-10 w-full md:w-[450px] flex flex-col justify-center px-10 shadow-2xl"
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
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Log In to your account</h2>
            <p className="text-white/70 text-sm">{settings?.frontPageWelcomeText || 'Sign in to access your learning dashboard.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-white/10 border border-white/20 text-white text-xs p-3 rounded backdrop-blur-md">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-white/80 font-medium">Username</Label>
              <Input 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-white/50 h-12"
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-white/80 font-medium">Password</Label>
                <Button variant="link" className="p-0 h-auto text-xs text-white/60 hover:text-white transition-colors">Forgot Password?</Button>
              </div>
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-white/50 h-12"
                placeholder="••••••••"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-white text-primary hover:bg-white/90 h-12 text-md font-bold shadow-xl transition-all"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Log In
            </Button>
          </form>

          <div className="pt-8 text-center">
             <p className="text-white/40 text-xs">Trouble logging in? Contact IT Support.</p>
          </div>
        </div>
      </div>

      {/* Right Side: Vision/Mission Content */}
      <div className="hidden md:flex flex-1 relative z-10 flex-col justify-between p-20 text-white">
         <div className="space-y-12 max-w-xl">
            <div className="space-y-4 animate-in slide-in-from-right-10 duration-700">
               <h3 className="text-xs font-bold tracking-[0.3em] text-white/50 uppercase">{settings?.visionTitle || 'OUR VISION'}</h3>
               <p className="text-3xl font-medium leading-relaxed tracking-tight">
                  "{settings?.visionText || 'To be the most preferred and trusted insurance company in the country.'}"
               </p>
            </div>

            <div className="space-y-4 animate-in slide-in-from-right-10 duration-700 delay-200">
               <h3 className="text-xs font-bold tracking-[0.3em] text-white/50 uppercase">{settings?.missionTitle || 'OUR MISSION'}</h3>
               <p className="text-xl text-white/80 leading-relaxed font-light">
                  {settings?.missionText || 'To provide excellent service and innovative products that meet the needs of our clients and contribute to the growth of the economy.'}
               </p>
            </div>
         </div>

         <div className="flex flex-wrap justify-between items-center gap-4 border-t border-white/10 pt-8 mt-auto animate-in fade-in duration-1000 delay-500">
            <div className="flex gap-6 text-xs font-medium text-white/60 whitespace-nowrap">
               <a href="#" className="hover:text-white transition-colors">About</a>
               <a href="#" className="hover:text-white transition-colors">Privacy</a>
               <a href="#" className="hover:text-white transition-colors">Contact Us</a>
            </div>
            <p className="text-xs text-white/30 uppercase tracking-widest text-right">
               {settings?.footerText || '© 2024 Standard Insurance Co., Inc. All Rights Reserved.'}
            </p>
         </div>
      </div>
    </div>
  );
};
