import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

import { 
  Loader2, 
  BookOpen, 
  FileUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download,
  Send,
  RefreshCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { workshopsApi } from '../../api/workshops.api';
import type { ActivitySubmission } from '../../api/workshops.api';
import type { CourseModule } from '../../api/courses.api';

import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

interface ActivityPlayerProps {
  module: CourseModule;
  onComplete: () => void;
}

export const ActivityPlayer: React.FC<ActivityPlayerProps> = ({ module, onComplete }) => {
  const [submission, setSubmission] = useState<ActivitySubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [textResponse, setTextResponse] = useState('');

  useEffect(() => {
    fetchSubmission();
  }, [module.id]);

  const fetchSubmission = async () => {
    setIsLoading(true);
    try {
      const data = await workshopsApi.getMySubmission(module.id);
      setSubmission(data);
      if (data) {
        setTextResponse(data.textResponse || '');
      }
    } catch (error) {
      console.error('Failed to fetch submission', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file && !textResponse && !submission?.fileUrl) {
      toast.error('Please provide a file or text response.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('textResponse', textResponse);

      const result = await workshopsApi.submit(module.id, formData);
      setSubmission(result);
      toast.success(submission ? 'Activity resubmitted successfully!' : 'Activity submitted successfully!');
      onComplete(); // Advance to next module
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isRejected = submission?.status === 'REJECTED';
  const isPending = submission?.status === 'PENDING';
  const isApproved = submission?.status === 'APPROVED';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Rejection Feedback */}
      {isRejected && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 shadow-lg animate-in zoom-in-95">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-black uppercase tracking-widest text-xs mb-1">Changes Requested</AlertTitle>
          <AlertDescription className="text-sm font-medium">
            "{submission.feedback}"
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions Card */}
      <Card className="border-none shadow-md bg-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Instructions</CardTitle>
            </div>
            {module.activityTemplateUrl && (
              <Button variant="outline" size="sm" asChild className="h-8 text-xs font-bold uppercase tracking-tighter">
                <a href={module.activityTemplateUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-3 w-3" /> Download Template
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          {module.activityInstructions || "No instructions provided for this activity."}
        </CardContent>
      </Card>

      {/* Submission Zone */}
      <Card className={cn(
        "border-2 transition-all duration-300",
        isApproved ? "border-success/30 bg-success/5 shadow-success/10 shadow-lg" : 
        isPending ? "border-warning/30 bg-warning/5 shadow-warning/10 shadow-lg" : 
        "border-primary/10 shadow-xl"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Your Submission</CardTitle>
            {submission && (
              <Badge 
                variant={isApproved ? "success" : isPending ? "warning" : "destructive"}
                className="font-black uppercase text-[10px] tracking-[0.2em] px-3 py-1"
              >
                {isApproved ? "Approved" : isPending ? "Pending Review" : "Rejected"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {(isApproved || isPending) ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-background border space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase text-muted-foreground tracking-widest">
                  <span>Submitted Content</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> 
                    {new Date(submission!.submittedAt).toLocaleDateString()}
                  </span>
                </div>
                {submission!.textResponse && (
                  <p className="text-sm font-medium italic">"{submission!.textResponse}"</p>
                )}
                {submission!.fileUrl && (
                  <Button variant="secondary" size="sm" asChild className="w-full justify-start h-10">
                    <a href={submission!.fileUrl} target="_blank" rel="noopener noreferrer">
                      <FileUp className="mr-2 h-4 w-4" /> View Submitted File
                    </a>
                  </Button>
                )}
              </div>
              
              {isApproved && (
                <div className="flex items-center gap-3 p-4 bg-success/20 rounded-xl text-success border border-success/30">
                  <CheckCircle2 className="h-8 w-8 shrink-0" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">Activity Validated</p>
                    <p className="text-xs font-medium opacity-80">This activity is officially recorded. You are clear for certification.</p>
                  </div>
                </div>
              )}
              
              {isPending && (
                <div className="flex items-center gap-3 p-4 bg-warning/20 rounded-xl text-warning border border-warning/30">
                  <Clock className="h-8 w-8 shrink-0 animate-pulse" />
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">Awaiting Verification</p>
                    <p className="text-xs font-medium opacity-80">You can continue the course, but your certificate will remain locked until this is approved.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Text Response (Optional)</Label>
                <Textarea 
                  placeholder="Type your response or notes here..."
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  className="min-h-[100px] bg-muted/10 border-none focus:ring-1"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload File</Label>
                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors relative group">
                  <input 
                    type="file" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <FileUp className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">{file ? file.name : "Select your project file"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
                      {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "PDF, ZIP, DOCX up to 10MB"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/10 border-t p-6">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              Asynchronous Progression Active
            </div>
            {!isApproved && !isPending && (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className="shadow-lg shadow-primary/20 px-8 h-12 font-black uppercase tracking-widest text-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isRejected ? (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isRejected ? "Resubmit Activity" : "Submit Activity"}
              </Button>
            )}
            {(isApproved || isPending) && (
              <Button variant="outline" onClick={onComplete} className="font-bold border-primary/20 hover:bg-primary/5">
                Continue Learning Sequence
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
