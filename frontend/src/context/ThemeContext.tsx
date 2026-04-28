import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Loader2 } from 'lucide-react';

export interface SystemSettings {
  companyName: string;
  primaryColorHex: string;
  secondaryColorHex: string;
  companyLogoUrl?: string;
}

interface ThemeContextType {
  settings: SystemSettings | null;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Utility to convert HEX to HSL format for shadcn/ui CSS variables
function hexToHSL(hex: string): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get('/settings');
        const data: SystemSettings = response.data;
        setSettings(data);

        // Update Document Title
        document.title = data.companyName || 'iLearn LMS';

        // Update CSS Variables on :root
        const root = document.documentElement;
        if (data.primaryColorHex) {
          root.style.setProperty('--primary', hexToHSL(data.primaryColorHex));
        }
        if (data.secondaryColorHex) {
          root.style.setProperty('--secondary', hexToHSL(data.secondaryColorHex));
        }
      } catch (error) {
        console.error('Failed to fetch system settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ settings, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
