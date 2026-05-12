import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { batchesApi } from '../../api/batches.api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Loader2, Users, CheckCircle2, TrendingUp, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface BatchAnalyticsProps {
  batchId: string | null;
  batchName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const BatchAnalytics: React.FC<BatchAnalyticsProps> = ({ batchId, batchName, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && batchId) {
      loadAnalytics();
    }
  }, [isOpen, batchId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await batchesApi.getAnalytics(batchId!);
      setData(result);
    } catch (error) {
      toast.error('Failed to load batch analytics');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Batch Analytics
          </DialogTitle>
          <DialogDescription className="text-lg font-medium text-muted-foreground">
            Performance and completion metrics for <strong className="text-foreground">{batchName}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50 mb-4" />
            <p className="font-bold text-muted-foreground animate-pulse tracking-widest uppercase">Crunching Data...</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-3xl border-none shadow-lg shadow-primary/5 bg-gradient-to-br from-primary/10 to-transparent">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-1">Total Learners</p>
                    <p className="text-4xl font-black">{data.totalLearners}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-lg shadow-emerald-500/5 bg-gradient-to-br from-emerald-500/10 to-transparent">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-emerald-600/70 mb-1">Completion Rate</p>
                    <p className="text-4xl font-black text-emerald-600">{data.completionRate}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-lg shadow-amber-500/5 bg-gradient-to-br from-amber-500/10 to-transparent">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                    <Trophy className="h-7 w-7 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-amber-600/70 mb-1">Average Score</p>
                    <p className="text-4xl font-black text-amber-600">{data.averageScore}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-3xl border-none shadow-lg shadow-black/5">
                <CardHeader>
                  <CardTitle className="font-black text-lg tracking-tight">Status Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={10}
                      >
                        {data.distribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                        itemStyle={{ fontWeight: '900' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-lg shadow-black/5">
                <CardHeader>
                  <CardTitle className="font-black text-lg tracking-tight">Overall K.A.S.H. Behavior</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.kashMetrics}>
                      <PolarGrid strokeOpacity={0.2} />
                      <PolarAngleAxis dataKey="domain" tick={{ fill: '#64748b', fontWeight: 800, fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Average Score"
                        dataKey="score"
                        stroke="#4F46E5"
                        fill="#4F46E5"
                        fillOpacity={0.3}
                        strokeWidth={3}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers Table */}
            {data.topPerformers.length > 0 && (
              <Card className="rounded-3xl border-none shadow-lg shadow-black/5">
                <CardHeader>
                  <CardTitle className="font-black text-lg tracking-tight flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-500" /> Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.topPerformers.map((performer: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center">
                            #{i + 1}
                          </div>
                          <span className="font-bold text-lg">{performer.name}</span>
                        </div>
                        <div className="font-black text-xl text-primary">{performer.averageScore}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
