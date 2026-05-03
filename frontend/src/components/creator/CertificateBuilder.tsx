import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, Save, Upload, Image as ImageIcon, Type, Calendar, User, Percent } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { coursesApi } from '../../api/courses.api';
import { learningPathsApi } from '../../api/learning-paths.api';

interface CertificateBuilderProps {
  courseId?: string;
  learningPathId?: string;
  initialData?: {
    backgroundUrl?: string;
    designConfig?: {
      employeeName: ElementConfig;
      completionDate: ElementConfig;
      lecturerName: ElementConfig;
      quizScore: ElementConfig;
    };
  };
}

interface ElementConfig {
  enabled: boolean;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
}

export const CertificateBuilder: React.FC<CertificateBuilderProps> = ({ courseId, learningPathId, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.backgroundUrl || null);
  
  const defaultConfig: ElementConfig = {
    enabled: true,
    x: 500,
    y: 500,
    fontSize: 24,
    fontFamily: 'Arial',
    color: '#000000'
  };

  const [config, setConfig] = useState({
    employeeName: initialData?.designConfig?.employeeName || { ...defaultConfig, y: 400 },
    completionDate: initialData?.designConfig?.completionDate || { ...defaultConfig, y: 600, fontSize: 18 },
    lecturerName: initialData?.designConfig?.lecturerName || { ...defaultConfig, enabled: false, y: 700, fontSize: 16 },
    quizScore: initialData?.designConfig?.quizScore || { ...defaultConfig, enabled: false, y: 800, fontSize: 16 },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('certificateBackground', selectedFile);
      }
      formData.append('designConfig', JSON.stringify(config));

      if (courseId) {
        await coursesApi.updateCertificateTemplate(courseId, formData);
      } else if (learningPathId) {
        await learningPathsApi.updateCertificateTemplate(learningPathId, formData);
      }

      toast.success('Certificate template updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update certificate template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      <div className="space-y-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Template Assets
            </CardTitle>
            <CardDescription>Upload your high-resolution certificate background image.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bg-upload" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-muted/50 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG or PDF (MAX. 5MB)</p>
                  </div>
                </div>
              </Label>
              <Input 
                id="bg-upload" 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/*"
              />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <ImageIcon className="h-4 w-4" />
                {selectedFile.name}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" />
              Dynamic Elements
            </CardTitle>
            <CardDescription>Configure typography and placement for each variable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="employeeName" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="employeeName" className="text-xs gap-2"><User className="h-3 w-3" /> Name</TabsTrigger>
                <TabsTrigger value="completionDate" className="text-xs gap-2"><Calendar className="h-3 w-3" /> Date</TabsTrigger>
                <TabsTrigger value="lecturerName" className="text-xs gap-2"><Type className="h-3 w-3" /> Lecturer</TabsTrigger>
                <TabsTrigger value="quizScore" className="text-xs gap-2"><Percent className="h-3 w-3" /> Score</TabsTrigger>
              </TabsList>

              {(Object.keys(config) as Array<keyof typeof config>).map((key) => (
                <TabsContent key={key} value={key} className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2">
                      <div className="capitalize font-bold text-sm">{key.replace(/([A-Z])/g, ' $1')}</div>
                      {key !== 'employeeName' && key !== 'completionDate' && (
                        <Switch 
                          checked={config[key].enabled}
                          onCheckedChange={(val) => setConfig({...config, [key]: { ...config[key], enabled: val }})}
                        />
                      )}
                    </div>
                    {!config[key].enabled && <Badge variant="secondary" className="text-[10px]">DISABLED</Badge>}
                  </div>

                  {config[key].enabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">X-Position (0-1000)</Label>
                          <Input 
                            type="number" 
                            value={config[key].x} 
                            onChange={(e) => setConfig({...config, [key]: { ...config[key], x: parseInt(e.target.value) || 0 }})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Y-Position (0-1000)</Label>
                          <Input 
                            type="number" 
                            value={config[key].y} 
                            onChange={(e) => setConfig({...config, [key]: { ...config[key], y: parseInt(e.target.value) || 0 }})} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Font Size (px)</Label>
                          <Input 
                            type="number" 
                            value={config[key].fontSize} 
                            onChange={(e) => setConfig({...config, [key]: { ...config[key], fontSize: parseInt(e.target.value) || 0 }})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Font Family</Label>
                          <Select 
                            value={config[key].fontFamily}
                            onValueChange={(val) => setConfig({...config, [key]: { ...config[key], fontFamily: val }})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                              <SelectItem value="Courier New">Courier New</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Verdana">Verdana</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Font Color</Label>
                        <div className="flex gap-2">
                          <Input 
                            type="color" 
                            value={config[key].color} 
                            onChange={(e) => setConfig({...config, [key]: { ...config[key], color: e.target.value }})}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input 
                            type="text" 
                            value={config[key].color} 
                            onChange={(e) => setConfig({...config, [key]: { ...config[key], color: e.target.value }})}
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            <Button className="w-full h-11" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Lock Template Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-none shadow-lg overflow-hidden h-full">
          <CardHeader className="bg-muted/30">
            <CardTitle>Canvas Preview</CardTitle>
            <CardDescription>Real-time visualization of placement logic.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex items-center justify-center bg-black/5 min-h-[400px] relative">
            {previewUrl ? (
              <div className="relative border shadow-2xl">
                <img src={previewUrl} alt="Certificate Background" className="max-w-full h-auto block" />
                
                {/* Variable Text Overlays */}
                {config.employeeName.enabled && (
                  <div 
                    className="absolute pointer-events-none whitespace-nowrap"
                    style={{ 
                      left: `${(config.employeeName.x / 1000) * 100}%`, 
                      top: `${(config.employeeName.y / 1000) * 100}%`,
                      fontSize: `${(config.employeeName.fontSize / 1000) * 100}cqw`,
                      color: config.employeeName.color,
                      fontFamily: config.employeeName.fontFamily,
                      transform: 'translate(-50%, -50%)',
                      fontWeight: 'bold'
                    }}
                  >
                    Employee Name
                  </div>
                )}

                {config.completionDate.enabled && (
                  <div 
                    className="absolute pointer-events-none whitespace-nowrap"
                    style={{ 
                      left: `${(config.completionDate.x / 1000) * 100}%`, 
                      top: `${(config.completionDate.y / 1000) * 100}%`,
                      fontSize: `${(config.completionDate.fontSize / 1000) * 100}cqw`,
                      color: config.completionDate.color,
                      fontFamily: config.completionDate.fontFamily,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    DD/MM/YYYY
                  </div>
                )}

                {config.lecturerName.enabled && (
                  <div 
                    className="absolute pointer-events-none whitespace-nowrap"
                    style={{ 
                      left: `${(config.lecturerName.x / 1000) * 100}%`, 
                      top: `${(config.lecturerName.y / 1000) * 100}%`,
                      fontSize: `${(config.lecturerName.fontSize / 1000) * 100}cqw`,
                      color: config.lecturerName.color,
                      fontFamily: config.lecturerName.fontFamily,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    John Doe, Instructor
                  </div>
                )}

                {config.quizScore.enabled && (
                  <div 
                    className="absolute pointer-events-none whitespace-nowrap"
                    style={{ 
                      left: `${(config.quizScore.x / 1000) * 100}%`, 
                      top: `${(config.quizScore.y / 1000) * 100}%`,
                      fontSize: `${(config.quizScore.fontSize / 1000) * 100}cqw`,
                      color: config.quizScore.color,
                      fontFamily: config.quizScore.fontFamily,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    Score: 95%
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-40">
                <ImageIcon className="h-12 w-12" />
                <p className="font-medium italic">Upload a background to preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
