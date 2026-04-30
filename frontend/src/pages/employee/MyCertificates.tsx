import React, { useState, useEffect } from 'react';
import { enrollmentsApi } from '../../api/enrollments.api';
import type { Enrollment } from '../../api/enrollments.api';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Download, Award } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { cn } from '../../lib/utils';

export const MyCertificates: React.FC = () => {
  const [completedEnrollments, setCompletedEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const fetchCompleted = async () => {
    setIsLoading(true);
    try {
      const data = await enrollmentsApi.getMyCourses();
      setCompletedEnrollments(data.filter(e => e.status === 'COMPLETED'));
    } catch (error) {
      toast.error('Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompleted();
  }, []);

  const handleDownload = async (courseId: string) => {
    setIsDownloading(courseId);
    try {
      // Endpoint: POST /api/certificates/:courseId/generate
      const response = await apiClient.post(`/certificates/${courseId}/generate`, {}, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${courseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      toast.error('Failed to generate certificate');
    } finally {
      setIsDownloading(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Award className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">My Certificates</h1>
          <p className="text-muted-foreground text-lg">Download and view your earned certifications.</p>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course Name</TableHead>
              <TableHead>Completion Date</TableHead>
              <TableHead>Course Creator</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {completedEnrollments.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Award className="h-10 w-10 opacity-10" />
                    <p>You haven't completed any courses yet. Finish a course to earn your first certificate!</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              completedEnrollments.map((enrollment, index) => (
                <TableRow 
                  key={enrollment.id}
                  className={cn(
                    "hover:bg-primary/5 transition-colors cursor-pointer group",
                    index % 2 === 0 ? "bg-background" : "bg-muted/10"
                  )}
                  onClick={() => handleDownload(enrollment.course.id)}
                >
                  <TableCell className="font-semibold">{enrollment.course.title}</TableCell>
                  <TableCell>{new Date(enrollment.enrolledAt).toLocaleDateString()}</TableCell>
                  <TableCell>{enrollment.course.lecturer?.firstName} {enrollment.course.lecturer?.lastName}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => handleDownload(enrollment.course.id)}
                      disabled={isDownloading === enrollment.course.id}
                    >
                      {isDownloading === enrollment.course.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
