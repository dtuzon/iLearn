import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/users.api';
import type { UserResponse } from '../api/users.api';
import apiClient from '../api/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { 
  Loader2, 
  User as UserIcon, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone, 
  UserCheck, 
  Lock, 
  ChevronRight,
  Briefcase,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

type ProfileSection = 'personal' | 'security' | 'employment';

export const ProfileSettings: React.FC = () => {
  const { updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Profile data state
  const [profileData, setProfileData] = useState<UserResponse | null>(null);

  // Form states for editable fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleInitial: '',
    nickname: '',
    email: '',
    personalEmail: '',
    mobileNumber: ''
  });

  // Password change states
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const data = await usersApi.getProfile();
        setProfileData(data);
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          middleInitial: data.middleInitial || '',
          nickname: data.nickname || '',
          email: data.email || '',
          personalEmail: data.personalEmail || '',
          mobileNumber: data.mobileNumber || ''
        });
      } catch (error: any) {
        toast.error('Failed to load profile details.');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // 1. Update Profile Fields if changed
      const updatedUser = await usersApi.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleInitial: formData.middleInitial,
        nickname: formData.nickname,
        email: formData.email,
        personalEmail: formData.personalEmail,
        mobileNumber: formData.mobileNumber
      });

      // Update local context
      updateUser({
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        email: updatedUser.email,
        department: updatedUser.department ? { id: updatedUser.department.id, name: updatedUser.department.name } : null
      });

      // 2. Change Password if filled
      if (passwords.newPassword) {
        if (passwords.newPassword !== passwords.confirmPassword) {
          toast.error('Passwords do not match.');
          setIsSaving(false);
          return;
        }

        await apiClient.post('/auth/change-password', { newPassword: passwords.newPassword });
        setPasswords({ newPassword: '', confirmPassword: '' });
        toast.success('Password updated successfully.');
      }

      toast.success('Profile details saved successfully.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const navItems = [
    { id: 'personal', label: 'Personal & Contact', icon: UserIcon },
    { id: 'security', label: 'Security & Credentials', icon: ShieldCheck },
    { id: 'employment', label: 'Employment Details', icon: Building2 },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading profile details...</p>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold">Personal Details</h3>
              <p className="text-sm text-muted-foreground">Manage your identity details and display name.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="First Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Last Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleInitial">Middle Initial</Label>
                <Input 
                  id="middleInitial" 
                  name="middleInitial"
                  value={formData.middleInitial}
                  onChange={handleInputChange}
                  placeholder="M.I."
                  maxLength={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname / Display Name</Label>
                <Input 
                  id="nickname" 
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  placeholder="E.g. Tim"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <div>
                <h3 className="text-lg font-bold">Contact Details</h3>
                <p className="text-sm text-muted-foreground">Manage your communication channels.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Corporate Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      name="email"
                      type="email"
                      className="pl-9"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="username@standard-insurance.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="personalEmail" 
                      name="personalEmail"
                      type="email"
                      className="pl-9"
                      value={formData.personalEmail}
                      onChange={handleInputChange}
                      placeholder="personal@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobileNumber">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="mobileNumber" 
                      name="mobileNumber"
                      className="pl-9"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      placeholder="0917XXXXXXX"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold">Security Credentials</h3>
              <p className="text-sm text-muted-foreground">Update your password to keep your account secure.</p>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-xl p-4 flex gap-3 items-start text-sm text-muted-foreground">
              <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Password Policy Guidelines</p>
                <p className="mt-1">Make sure your new password is secure and not easily guessed. Changing your password here will update your credentials for subsequent portal logins.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input 
                  id="newPassword" 
                  name="newPassword"
                  type="password"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword"
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>
        );

      case 'employment':
        return (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-lg font-bold">Employment Details</h3>
              <p className="text-sm text-muted-foreground">Information managed by HR and standard administration (Read-only).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-xl border border-border/50">
              <div className="flex gap-3 items-center">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Username</p>
                  <p className="font-semibold text-foreground mt-0.5">{profileData?.username}</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Position</p>
                  <p className="font-semibold text-foreground mt-0.5">{profileData?.position || 'N/A'}</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Department</p>
                  <p className="font-semibold text-foreground mt-0.5">{profileData?.department?.name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Date Hired</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {profileData?.dateHire ? new Date(profileData.dateHire).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <UserCheck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Immediate Superior</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {profileData?.immediateSuperior 
                      ? `${profileData.immediateSuperior.firstName} ${profileData.immediateSuperior.lastName}` 
                      : 'None'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">System Role</p>
                  <p className="font-semibold text-foreground mt-0.5 uppercase tracking-wide">
                    {profileData?.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Profile Settings</h1>
        <p className="text-muted-foreground text-lg">Manage your personal information, contact methods, and login credentials.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1 sticky top-24">
            {navItems.map((item) => (
              <Button
                variant="ghost"
                key={item.id}
                onClick={(e) => { e.preventDefault(); setActiveSection(item.id as ProfileSection); }}
                className={cn(
                  "flex items-center justify-between px-4 py-6 rounded-xl text-sm font-medium transition-all group w-full",
                  activeSection === item.id 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" 
                    : "hover:bg-accent text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("h-4 w-4", activeSection === item.id ? "text-primary-foreground" : "text-muted-foreground")} />
                  {item.label}
                </div>
                {activeSection === item.id && <ChevronRight className="h-4 w-4" />}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <form onSubmit={handleSave}>
            <Card className="border border-border/50 bg-card shadow-lg p-6 md:p-8 min-h-[450px] flex flex-col justify-between rounded-xl">
              <CardContent className="p-0 flex-1">
                {renderActiveSection()}
              </CardContent>
              
              {activeSection !== 'employment' && (
                <div className="mt-8 pt-6 border-t border-border/50 flex justify-end">
                  <Button type="submit" size="lg" disabled={isSaving} className="px-8 font-semibold">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Changes
                  </Button>
                </div>
              )}
            </Card>
          </form>
        </main>
      </div>
    </div>
  );
};
