import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import apiClient from '../../api/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const { settings } = useTheme();

  useEffect(() => {
    const company = settings?.companyName || 'Standard Insurance Co., Inc.';
    document.title = `Forgot Password | ${company}`;
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      setSuccessMessage(response.data.message || 'If an account is associated with this email, a reset link has been sent.');
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit request. Please try again.');
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

      {/* Left Side: Forgot Password Box */}
      <div 
        className="relative z-10 w-full md:w-[450px] flex flex-col justify-center px-10 shadow-2xl"
        style={{ backgroundColor: 'hsl(var(--primary))' }}
      >
        <div className="mb-8 flex items-center gap-3">
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

        <div className="space-y-6 text-white">
          {!isSubmitted ? (
            <>
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Forgot Password?</h2>
                <p className="text-white/70 text-sm">
                  Enter your registered email address and we will send you instructions to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-white/10 border border-white/20 text-white text-xs p-3 rounded backdrop-blur-md">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-white/80 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/45" />
                    <Input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:ring-white/50 h-12 pl-10"
                      placeholder="name@standard-insurance.com"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-white text-primary hover:bg-white/90 h-12 text-md font-bold shadow-xl transition-all"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send Reset Link
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Request Sent</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {successMessage}
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-white/60 hover:text-white hover:underline text-xs transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Login
            </Link>
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
               <a href="https://www.standard-insurance.com/about-us.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">About</a>
               <a href="https://www.standard-insurance.com/privacy-policy.html#/claim-form" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy</a>
               <a href="https://www.standard-insurance.com/contact-us.html#/contact-us-form" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Contact Us</a>
            </div>
            <p className="text-xs text-white/30 uppercase tracking-widest text-right">
               {settings?.footerText || '© 2024 Standard Insurance Co., Inc. All Rights Reserved.'}
            </p>
         </div>
      </div>
    </div>
  );
};
