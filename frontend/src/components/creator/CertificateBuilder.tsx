import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, Save, Upload, Image as ImageIcon, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { coursesApi } from '../../api/courses.api';

interface CertificateBuilderProps {
  courseId: string;
  initialData?: {
    backgroundUrl?: string;
    nameX?: number;
    nameY?: number;
    dateX?: number;
    dateY?: number;
  };
}

export const CertificateBuilder: React.FC<CertificateBuilderProps> = ({ courseId, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.backgroundUrl || null);
  
  const [coords, setCoords] = useState({
    nameX: initialData?.nameX || 300,
    nameY: initialData?.nameY || 400,
    dateX: initialData?.dateX || 300,
    dateY: initialData?.dateY || 500,
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
      formData.append('nameX', coords.nameX.toString());
      formData.append('nameY', coords.nameY.toString());
      formData.append('dateX', coords.dateX.toString());
      formData.append('dateY', coords.dateY.toString());

      await coursesApi.updateCertificateTemplate(courseId, formData);
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
              <MapPin className="h-5 w-5 text-primary" />
              Dynamic Placement
            </CardTitle>
            <CardDescription>Define the exact pixel coordinates for variable text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee Name X</Label>
                <Input 
                  type="number" 
                  value={coords.nameX} 
                  onChange={(e) => setCoords({...coords, nameX: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Employee Name Y</Label>
                <Input 
                  type="number" 
                  value={coords.nameY} 
                  onChange={(e) => setCoords({...coords, nameY: parseInt(e.target.value) || 0})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Completion Date X</Label>
                <Input 
                  type="number" 
                  value={coords.dateX} 
                  onChange={(e) => setCoords({...coords, dateX: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Completion Date Y</Label>
                <Input 
                  type="number" 
                  value={coords.dateY} 
                  onChange={(e) => setCoords({...coords, dateY: parseInt(e.target.value) || 0})} 
                />
              </div>
            </div>

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
                
                {/* Visual Indicators */}
                <div 
                  className="absolute pointer-events-none flex flex-col items-center"
                  style={{ left: `${(coords.nameX / 1000) * 100}%`, top: `${(coords.nameY / 1000) * 100}%` }}
                >
                  <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shadow-md">
                    EMPLOYEE NAME
                  </div>
                  <div className="h-4 w-0.5 bg-primary mt-1" />
                </div>

                <div 
                  className="absolute pointer-events-none flex flex-col items-center"
                  style={{ left: `${(coords.dateX / 1000) * 100}%`, top: `${(coords.dateY / 1000) * 100}%` }}
                >
                  <div className="bg-purple-600 text-white px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shadow-md">
                    COMPLETION DATE
                  </div>
                  <div className="h-4 w-0.5 bg-purple-600 mt-1" />
                </div>
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
