import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { settingsApi } from '../../api/settings.api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Loader2, 
  Palette, 
  Mail, 
  HardDrive, 
  ShieldCheck, 
  Database, 
  ScrollText,
  ChevronRight,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

type SettingsSection = 'theme' | 'portal' | 'email' | 'storage' | 'security' | 'backup' | 'logs' | 'datetime';

export const SystemSettings: React.FC = () => {
  const { settings, fetchSettings } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('theme');
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    companyName: '',
    primaryColorHex: '',
    secondaryColorHex: '',
    frontPageWelcomeText: '',
    footerText: '',
    dashboardBulletinMessage: '',
    visionTitle: '',
    visionText: '',
    missionTitle: '',
    missionText: '',
    smtpServer: '',
    smtpPort: 587,
    senderEmail: '',
    smtpUser: '',
    smtpPassword: '',
    maxUploadSizeMb: 10,
    allowedFileTypes: ''
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgFile, setBgFile] = useState<File | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || '',
        primaryColorHex: settings.primaryColorHex || '',
        secondaryColorHex: settings.secondaryColorHex || '',
        frontPageWelcomeText: settings.frontPageWelcomeText || '',
        footerText: settings.footerText || '',
        dashboardBulletinMessage: settings.dashboardBulletinMessage || '',
        visionTitle: settings.visionTitle || '',
        visionText: settings.visionText || '',
        missionTitle: settings.missionTitle || '',
        missionText: settings.missionText || '',
        smtpServer: settings.smtpServer || '',
        smtpPort: settings.smtpPort || 587,
        senderEmail: settings.senderEmail || '',
        smtpUser: settings.smtpUser || '',
        smtpPassword: settings.smtpPassword || '',
        maxUploadSizeMb: settings.maxUploadSizeMb || 10,
        allowedFileTypes: settings.allowedFileTypes || ''
      });
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value.toString());
      });
      
      if (logoFile) data.append('logo', logoFile);
      if (bgFile) data.append('loginBackground', bgFile);

      // Using axios directly for multipart/form-data with custom headers
      await settingsApi.updateSettings(data as any);
      await fetchSettings();
      toast.success('Configuration saved successfully.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const navItems = [
    { id: 'theme', label: 'Themes & UI', icon: Palette },
    { id: 'portal', label: 'Portal Content', icon: ScrollText },
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'storage', label: 'Storage & Uploads', icon: HardDrive },
    { id: 'security', label: 'Security Policies', icon: ShieldCheck },
  ];

  const baseUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : '';

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'theme':
        return (
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Themes & UI Customization</CardTitle>
              <CardDescription>Branding and visual identity settings.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {settings?.companyLogoUrl ? (
                      <img src={`${baseUrl}${settings.companyLogoUrl}`} className="h-12 w-12 object-contain border rounded p-1" />
                    ) : (
                      <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="max-w-[200px]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Login Background Image</Label>
                  <div className="flex items-center gap-4">
                    {settings?.loginBackgroundUrl ? (
                      <div className="h-12 w-12 rounded border overflow-hidden">
                        <img src={`${baseUrl}${settings.loginBackgroundUrl}`} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <Input type="file" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] || null)} className="max-w-[200px]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Primary Brand Color</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="color" 
                      className="w-12 h-10 p-1 cursor-pointer"
                      value={formData.primaryColorHex}
                      onChange={(e) => setFormData({...formData, primaryColorHex: e.target.value})}
                    />
                    <span className="text-xs font-mono uppercase">{formData.primaryColorHex}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="color" 
                      className="w-12 h-10 p-1 cursor-pointer"
                      value={formData.secondaryColorHex}
                      onChange={(e) => setFormData({...formData, secondaryColorHex: e.target.value})}
                    />
                    <span className="text-xs font-mono uppercase">{formData.secondaryColorHex}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input 
                  id="companyName" 
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'portal':
        return (
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Portal Content</CardTitle>
              <CardDescription>Customize text displayed on landing and login pages.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
              <div className="space-y-2">
                <Label>Login Page Welcome Text</Label>
                <Input 
                  value={formData.frontPageWelcomeText}
                  onChange={(e) => setFormData({...formData, frontPageWelcomeText: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label>Vision Title</Label>
                       <Input value={formData.visionTitle} onChange={(e) => setFormData({...formData, visionTitle: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <Label>Vision Description</Label>
                       <Textarea value={formData.visionText} onChange={(e) => setFormData({...formData, visionText: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label>Mission Title</Label>
                       <Input value={formData.missionTitle} onChange={(e) => setFormData({...formData, missionTitle: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <Label>Mission Description</Label>
                       <Textarea value={formData.missionText} onChange={(e) => setFormData({...formData, missionText: e.target.value})} />
                    </div>
                 </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Footer Credit Text</Label>
                <Input 
                  value={formData.footerText}
                  onChange={(e) => setFormData({...formData, footerText: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        );
      case 'email':
        return (
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Manage how the system sends automated emails and notifications.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 space-y-2">
                  <Label>SMTP Server Address</Label>
                  <Input 
                    placeholder="e.g. smtp.gmail.com"
                    value={formData.smtpServer}
                    onChange={(e) => setFormData({...formData, smtpServer: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input 
                    type="number" 
                    value={formData.smtpPort}
                    onChange={(e) => setFormData({...formData, smtpPort: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sender Email Address</Label>
                <Input 
                  type="email"
                  placeholder="no-reply@company.com"
                  value={formData.senderEmail}
                  onChange={(e) => setFormData({...formData, senderEmail: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>SMTP Username</Label>
                  <Input 
                    value={formData.smtpUser}
                    onChange={(e) => setFormData({...formData, smtpUser: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Password</Label>
                  <Input 
                    type="password"
                    value={formData.smtpPassword}
                    onChange={(e) => setFormData({...formData, smtpPassword: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-0 border-t pt-6 mt-6">
               <Button variant="outline" size="sm">Send Test Email</Button>
            </CardFooter>
          </Card>
        );

      case 'storage':
        return (
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Storage & Upload Policies</CardTitle>
              <CardDescription>Control file management and upload limits.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
              <div className="space-y-2">
                <Label>Max File Upload Size</Label>
                <Select 
                  value={formData.maxUploadSizeMb.toString()}
                  onValueChange={(val) => setFormData({...formData, maxUploadSizeMb: parseInt(val)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 MB</SelectItem>
                    <SelectItem value="5">5 MB</SelectItem>
                    <SelectItem value="10">10 MB</SelectItem>
                    <SelectItem value="25">25 MB</SelectItem>
                    <SelectItem value="50">50 MB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allowed File Extensions</Label>
                <Input 
                  placeholder="e.g. .pdf, .zip, .mp4"
                  value={formData.allowedFileTypes}
                  onChange={(e) => setFormData({...formData, allowedFileTypes: e.target.value})}
                />
                <p className="text-xs text-muted-foreground italic">Comma-separated list of allowed formats.</p>
              </div>
            </CardContent>
          </Card>
        );

      case 'security':
        return (
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Security Policies</CardTitle>
              <CardDescription>Manage authentication and session security.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6 opacity-60 grayscale pointer-events-none">
              <div className="space-y-2">
                <Label>Session Timeout (Minutes)</Label>
                <Input defaultValue="60" disabled />
              </div>
              <div className="flex items-center gap-2">
                 <input type="checkbox" disabled checked />
                 <Label>Enforce 2FA for Administrators</Label>
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                Advanced security modules will be available in Enterprise Edition.
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="capitalize">{activeSection.replace('-', ' ')}</CardTitle>
              <CardDescription>Settings for this section will be implemented in Phase 6.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 flex flex-col items-center justify-center py-20 bg-muted/5 rounded-xl border border-dashed">
               <Database className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
               <p className="text-muted-foreground">Module under development.</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-10">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <nav className="flex flex-col gap-1 sticky top-24">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as SettingsSection)}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                activeSection === item.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "hover:bg-accent text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-4 w-4", activeSection === item.id ? "text-primary-foreground" : "text-muted-foreground")} />
                {item.label}
              </div>
              {activeSection === item.id && <ChevronRight className="h-4 w-4" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 max-w-3xl">
        <form onSubmit={handleSave}>
          <div className="bg-card border rounded-2xl shadow-sm p-8 min-h-[600px] flex flex-col">
            <div className="flex-1">
              {renderActiveSection()}
            </div>
            
            <div className="mt-10 pt-6 border-t flex justify-end">
              <Button type="submit" size="lg" disabled={isSaving} className="px-8 font-semibold">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Configuration
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};
