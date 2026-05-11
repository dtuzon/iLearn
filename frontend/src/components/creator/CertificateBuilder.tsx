import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, Save, Upload, Image as ImageIcon, Type, Calendar, User, Percent, Award, Move } from 'lucide-react';

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
  isEnabled?: boolean;
  onToggleEnabled?: (enabled: boolean) => void;
  readonly?: boolean;
}

interface ElementConfig {
  enabled: boolean;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
}

type ConfigKey = 'employeeName' | 'completionDate' | 'lecturerName' | 'quizScore';

interface DragState {
  key: ConfigKey;
  startMouseX: number;
  startMouseY: number;
  startElemX: number;
  startElemY: number;
}

const ELEMENT_LABELS: Record<ConfigKey, { label: string; preview: string }> = {
  employeeName:   { label: 'Employee Name', preview: 'Employee Name' },
  completionDate: { label: 'Completion Date', preview: 'DD/MM/YYYY' },
  lecturerName:   { label: 'Lecturer Name',  preview: 'John Doe, Instructor' },
  quizScore:      { label: 'Quiz Score',      preview: 'Score: 95%' },
};

export const CertificateBuilder: React.FC<CertificateBuilderProps> = ({
  courseId,
  learningPathId,
  initialData,
  isEnabled,
  onToggleEnabled,
  readonly,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.backgroundUrl || null);
  const [selectedKey, setSelectedKey] = useState<ConfigKey | null>(null);
  const [activeTab, setActiveTab] = useState<ConfigKey>('employeeName');

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const defaultConfig: ElementConfig = {
    enabled: true,
    x: 500,
    y: 500,
    fontSize: 24,
    fontFamily: 'Arial',
    color: '#000000',
  };

  const [config, setConfig] = useState<Record<ConfigKey, ElementConfig>>({
    employeeName:   initialData?.designConfig?.employeeName   || { ...defaultConfig, y: 400 },
    completionDate: initialData?.designConfig?.completionDate || { ...defaultConfig, y: 600, fontSize: 18 },
    lecturerName:   initialData?.designConfig?.lecturerName   || { ...defaultConfig, enabled: false, y: 700, fontSize: 16 },
    quizScore:      initialData?.designConfig?.quizScore      || { ...defaultConfig, enabled: false, y: 800, fontSize: 16 },
  });

  // ─── Drag Logic ───────────────────────────────────────────────────────────

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, key: ConfigKey) => {
      if (readonly) return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedKey(key);
      setActiveTab(key);

      dragRef.current = {
        key,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startElemX: config[key].x,
        startElemY: config[key].y,
      };
    },
    [config, readonly]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const drag = dragRef.current;
      if (!drag || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();

      // Delta in pixels → convert to 0-1000 coordinate space
      const deltaX = ((e.clientX - drag.startMouseX) / rect.width)  * 1000;
      const deltaY = ((e.clientY - drag.startMouseY) / rect.height) * 1000;

      const newX = Math.max(0, Math.min(1000, drag.startElemX + deltaX));
      const newY = Math.max(0, Math.min(1000, drag.startElemY + deltaY));

      setConfig((prev) => ({
        ...prev,
        [drag.key]: { ...prev[drag.key], x: Math.round(newX), y: Math.round(newY) },
      }));
    },
    []
  );

  const handleCanvasMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ─── File Handling ────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      if (selectedFile) formData.append('certificateBackground', selectedFile);
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toggle Header */}
      <div className="flex items-center justify-between p-6 border-2 border-primary/10 rounded-2xl bg-primary/5 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2">
            <Award className="h-5 w-5" />
            Issue Digital Certificate
          </h3>
          <p className="text-sm text-muted-foreground">
            Automatically generate and issue a verifiable certificate upon successful completion.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black uppercase tracking-widest text-primary/40">
            {isEnabled ? 'ACTIVE' : 'INACTIVE'}
          </span>
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggleEnabled}
            className="data-[state=checked]:bg-primary"
            disabled={readonly}
          />
        </div>
      </div>

      {/* Disabled State */}
      {!isEnabled ? (
        <Card className="border-none shadow-xl bg-muted/20 py-20">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4 opacity-50 grayscale">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <Award className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold italic text-muted-foreground">Certificate Issuance Disabled</h3>
              <p className="max-w-md text-sm">
                Enable the toggle above to configure and design the digital credential for this content.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">

          {/* ─── Left Panel: Controls ─────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Background Upload */}
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
                    disabled={readonly}
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

            {/* Element Controls */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5 text-primary" />
                  Dynamic Elements
                </CardTitle>
                <CardDescription>
                  {!readonly
                    ? 'Drag elements on the canvas or fine-tune with the controls below.'
                    : 'Configure typography and placement for each variable.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as ConfigKey)}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-4 w-full mb-4">
                    <TabsTrigger value="employeeName"   className="text-xs gap-2"><User     className="h-3 w-3" /> Name</TabsTrigger>
                    <TabsTrigger value="completionDate" className="text-xs gap-2"><Calendar className="h-3 w-3" /> Date</TabsTrigger>
                    <TabsTrigger value="lecturerName"   className="text-xs gap-2"><Type     className="h-3 w-3" /> Lecturer</TabsTrigger>
                    <TabsTrigger value="quizScore"      className="text-xs gap-2"><Percent  className="h-3 w-3" /> Score</TabsTrigger>
                  </TabsList>

                  {(Object.keys(config) as ConfigKey[]).map((key) => (
                    <TabsContent key={key} value={key} className="space-y-4 animate-in fade-in duration-300">
                      {/* Enable toggle row */}
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2">
                          <div className="capitalize font-bold text-sm">
                            {ELEMENT_LABELS[key].label}
                          </div>
                          {key !== 'employeeName' && key !== 'completionDate' && (
                            <Switch
                              checked={config[key].enabled}
                              onCheckedChange={(val) =>
                                setConfig({ ...config, [key]: { ...config[key], enabled: val } })
                              }
                              disabled={readonly}
                            />
                          )}
                        </div>
                        {!config[key].enabled && (
                          <Badge variant="secondary" className="text-[10px]">DISABLED</Badge>
                        )}
                      </div>

                      {config[key].enabled && (
                        <div className="space-y-4">
                          {/* Position (synced with canvas drag) */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">X-Position (0–1000)</Label>
                              <Input
                                type="number"
                                value={config[key].x}
                                onChange={(e) =>
                                  setConfig({ ...config, [key]: { ...config[key], x: parseInt(e.target.value) || 0 } })
                                }
                                disabled={readonly}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Y-Position (0–1000)</Label>
                              <Input
                                type="number"
                                value={config[key].y}
                                onChange={(e) =>
                                  setConfig({ ...config, [key]: { ...config[key], y: parseInt(e.target.value) || 0 } })
                                }
                                disabled={readonly}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">Font Size (px)</Label>
                              <Input
                                type="number"
                                value={config[key].fontSize}
                                onChange={(e) =>
                                  setConfig({ ...config, [key]: { ...config[key], fontSize: parseInt(e.target.value) || 0 } })
                                }
                                disabled={readonly}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Font Family</Label>
                              <Select
                                value={config[key].fontFamily}
                                onValueChange={(val) =>
                                  setConfig({ ...config, [key]: { ...config[key], fontFamily: val } })
                                }
                                disabled={readonly}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
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
                                onChange={(e) =>
                                  setConfig({ ...config, [key]: { ...config[key], color: e.target.value } })
                                }
                                className="w-12 h-10 p-1 cursor-pointer"
                                disabled={readonly}
                              />
                              <Input
                                type="text"
                                value={config[key].color}
                                onChange={(e) =>
                                  setConfig({ ...config, [key]: { ...config[key], color: e.target.value } })
                                }
                                placeholder="#000000"
                                className="flex-1"
                                disabled={readonly}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>

                <Button className="w-full h-11" onClick={handleSave} disabled={isSaving || readonly}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {readonly ? 'Template Locked (Read-Only)' : 'Lock Template Settings'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ─── Right Panel: Interactive Canvas ──────────────────────────────── */}
          <div className="space-y-6">
            <Card className="border-none shadow-lg overflow-hidden h-full">
              <CardHeader className="bg-muted/30">
                <CardTitle>Canvas Preview</CardTitle>
                <CardDescription>
                  {!readonly
                    ? 'Drag any element to reposition it. Click to select.'
                    : 'Real-time visualization of placement logic.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex items-center justify-center bg-black/5 min-h-[400px] relative">
                {previewUrl ? (
                  // Canvas container — listens for mouse move/up globally so drag works even if cursor leaves element
                  <div
                    ref={canvasRef}
                    className="relative border shadow-2xl select-none"
                    style={{ cursor: dragRef.current ? 'grabbing' : 'default' }}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  >
                    <img
                      src={previewUrl}
                      alt="Certificate Background"
                      className="max-w-full h-auto block"
                      draggable={false}
                    />

                    {/* Draggable Text Overlays */}
                    {(Object.keys(config) as ConfigKey[]).map((key) => {
                      if (!config[key].enabled) return null;
                      const isSelected = selectedKey === key;
                      const isActivelyDragging = dragRef.current?.key === key;

                      return (
                        <div
                          key={key}
                          className={`absolute whitespace-nowrap transition-shadow duration-150 rounded px-1 ${
                            readonly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                          } ${
                            isSelected
                              ? 'ring-2 ring-primary ring-offset-1 shadow-lg shadow-primary/20'
                              : !readonly
                              ? 'hover:ring-2 hover:ring-primary/40 hover:ring-offset-1'
                              : ''
                          } ${isActivelyDragging ? 'opacity-80 scale-105' : ''}`}
                          style={{
                            left:       `${(config[key].x / 1000) * 100}%`,
                            top:        `${(config[key].y / 1000) * 100}%`,
                            fontSize:   `${(config[key].fontSize / 1000) * 100}cqw`,
                            color:      config[key].color,
                            fontFamily: config[key].fontFamily,
                            transform:  'translate(-50%, -50%)',
                            fontWeight: key === 'employeeName' ? 'bold' : 'normal',
                            zIndex:     isSelected ? 20 : 10,
                          }}
                          onMouseDown={(e) => handleElementMouseDown(e, key)}
                          onClick={() => {
                            setSelectedKey(key);
                            setActiveTab(key);
                          }}
                          title={readonly ? ELEMENT_LABELS[key].label : `Drag to reposition ${ELEMENT_LABELS[key].label}`}
                        >
                          {/* Drag handle icon shown on hover/select */}
                          {!readonly && isSelected && (
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-primary opacity-80">
                              <Move className="h-3 w-3" />
                            </span>
                          )}
                          {ELEMENT_LABELS[key].preview}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-40">
                    <ImageIcon className="h-12 w-12" />
                    <p className="font-medium italic">Upload a background to preview</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hint pill */}
            {!readonly && previewUrl && (
              <p className="text-center text-xs text-muted-foreground animate-in fade-in duration-500">
                💡 Click an element on the canvas to select it — drag to move it. The X/Y inputs update in real-time.
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
