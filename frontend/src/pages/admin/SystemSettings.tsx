import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { settingsApi } from '../../api/settings.api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const SystemSettings: React.FC = () => {
  const { settings, fetchSettings } = useTheme();
  
  const [companyName, setCompanyName] = useState('');
  const [primaryColorHex, setPrimaryColorHex] = useState('');
  const [secondaryColorHex, setSecondaryColorHex] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName);
      setPrimaryColorHex(settings.primaryColorHex);
      setSecondaryColorHex(settings.secondaryColorHex);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await settingsApi.updateSettings({
        companyName,
        primaryColorHex,
        secondaryColorHex,
      });
      
      // Instantly trigger re-fetch to apply theme changes without reloading
      await fetchSettings();
      toast.success('Settings updated successfully.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Manage your corporate identity and color scheme. Changes will apply immediately.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input 
                id="companyName" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <Input 
                    id="primaryColor" 
                    type="color" 
                    className="w-16 h-10 p-1 cursor-pointer"
                    value={primaryColorHex}
                    onChange={(e) => setPrimaryColorHex(e.target.value)}
                    required
                  />
                  <span className="text-sm text-muted-foreground uppercase">{primaryColorHex}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2 items-center">
                  <Input 
                    id="secondaryColor" 
                    type="color" 
                    className="w-16 h-10 p-1 cursor-pointer"
                    value={secondaryColorHex}
                    onChange={(e) => setSecondaryColorHex(e.target.value)}
                    required
                  />
                  <span className="text-sm text-muted-foreground uppercase">{secondaryColorHex}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
