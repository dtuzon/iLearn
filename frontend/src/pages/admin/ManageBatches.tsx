import React, { useState, useEffect } from 'react';
import { batchesApi, Batch } from '../../api/batches.api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Plus, 
  Calendar, 
  Users, 
  ChevronRight, 
  MoreVertical, 
  Trash2, 
  Edit2,
  Layers,
  BookOpen,
  Clock,
  Loader2,
  LayoutGrid
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { BatchWizard } from './BatchWizard';

export const ManageBatches: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const data = await batchesApi.getAll();
      setBatches(data);
    } catch (error) {
      toast.error('Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this batch? All enrollment links will be removed.')) return;
    try {
      await batchesApi.delete(id);
      toast.success('Batch deleted successfully');
      fetchBatches();
    } catch (error) {
      toast.error('Failed to delete batch');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none">ACTIVE</Badge>;
      case 'COMPLETED': return <Badge variant="secondary" className="opacity-70">COMPLETED</Badge>;
      default: return <Badge variant="outline" className="text-orange-500 border-orange-500/20">UPCOMING</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-primary flex items-center gap-3">
            <LayoutGrid className="h-10 w-10" />
            MANAGE BATCHES
          </h1>
          <p className="text-muted-foreground text-lg font-medium">Coordinate scheduled learning cohorts and assign dedicated checkers.</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedBatchId(null);
            setIsWizardOpen(true);
          }}
          className="h-12 px-6 rounded-2xl shadow-lg shadow-primary/20 gap-2 font-bold transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Create New Batch
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
          <p className="text-muted-foreground font-medium animate-pulse italic">Syncing cohort data...</p>
        </div>
      ) : batches.length === 0 ? (
        <Card className="border-dashed border-2 py-24 flex flex-col items-center justify-center text-center bg-muted/5 rounded-[2rem]">
          <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center mb-6 opacity-20">
            <Users className="h-10 w-10" />
          </div>
          <h3 className="text-2xl font-black italic uppercase text-muted-foreground">No Batches Configured</h3>
          <p className="text-muted-foreground max-w-sm mt-2">Start by creating a learning cohort for a specific course or path.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <Card key={batch.id} className="group overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 rounded-[2rem] bg-background/50 backdrop-blur-md">
              <div className="h-2 w-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  {getStatusBadge(batch.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl p-1 shadow-2xl">
                      <DropdownMenuItem 
                        className="gap-2 rounded-lg cursor-pointer"
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          setIsWizardOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" /> Edit Batch
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-2 rounded-lg cursor-pointer text-destructive"
                        onClick={() => handleDelete(batch.id)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete Batch
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors">
                  {batch.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-widest text-primary/60">
                  {batch.courseId ? <BookOpen className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                  {batch.course?.title || batch.learningPath?.title}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Starts
                    </p>
                    <p className="text-sm font-bold">{format(new Date(batch.startDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-2xl space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Ends
                    </p>
                    <p className="text-sm font-bold">{format(new Date(batch.endDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/50 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Learners</p>
                      <p className="text-sm font-black">{(batch._count?.enrollments || 0) + (batch._count?.learningPathEnrollments || 0)} Enrolled</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isWizardOpen && (
        <BatchWizard 
          batchId={selectedBatchId} 
          onClose={() => setIsWizardOpen(false)} 
          onSuccess={() => {
            setIsWizardOpen(false);
            fetchBatches();
          }} 
        />
      )}
    </div>
  );
};
