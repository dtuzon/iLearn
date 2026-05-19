import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { batchesApi } from '../../api/batches.api';
import { departmentsApi } from '../../api/departments.api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, Users, CheckCircle2, TrendingUp, Trophy, Download, FileText, Filter, BookOpen, ArrowUpRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import * as XLSX from 'xlsx';
import { cn } from '../../lib/utils';

interface BatchAnalyticsProps {
  batchId: string | null;
  batchName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const BatchAnalytics: React.FC<BatchAnalyticsProps> = ({ batchId, batchName, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof batchesApi.getAnalytics>> | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const printRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    departmentId: 'all',
    role: 'all',
    status: 'all'
  });

  const [expandedLearnerId, setExpandedLearnerId] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      departmentsApi.getAll().then(setDepartments).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && batchId) {
      loadAnalytics();
    }
  }, [isOpen, batchId, filters]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await batchesApi.getAnalytics(batchId!, filters);
      setData(result);
    } catch (error) {
      toast.error('Failed to load batch analytics');
    } finally {
      setLoading(false);
    }
  };

  const activeDeptName = filters.departmentId === 'all'
    ? 'All Departments'
    : (departments.find(d => d.id === filters.departmentId)?.name || 'Filtered Department');
    
  const activeRole = filters.role === 'all'
    ? 'All Roles'
    : filters.role.replace('_', ' ');

  const activeStatus = filters.status === 'all'
    ? 'All Statuses'
    : filters.status.replace('_', ' ');

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    toast.info('Generating Executive Summary PDF...');
    try {
      // Small timeout to guarantee DOM styles have resolved
      setTimeout(async () => {
        try {
          const element = reportRef.current!;
          const pages = element.querySelectorAll('.pdf-page');
          
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          for (let i = 0; i < pages.length; i++) {
            const pageEl = pages[i] as HTMLElement;
            const canvas = await html2canvas(pageEl, { 
              scale: 3, 
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: 800,
              windowHeight: 1130
            });
            const imgData = canvas.toDataURL('image/png');
            
            if (i > 0) {
              pdf.addPage();
            }
            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
          }
          
          // Use a custom bulletproof download trigger by appending to DOM
          const blob = pdf.output('blob');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const cleanBatchName = batchName && batchName.trim() ? batchName.trim().replace(/\s+/g, '_') : 'Batch';
          a.download = `${cleanBatchName}_Executive_Report.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast.success('Executive Report PDF Exported Successfully');
        } catch (error) {
          console.error('[PDF Export Error]:', error);
          toast.error('Failed to generate PDF. Check console for details.');
        } finally {
          setIsExporting(false);
        }
      }, 500);
    } catch (e) {
      console.error('[PDF Export Trigger Error]:', e);
      toast.error('Failed to start PDF generation');
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    try {
      const wb = XLSX.utils.book_new();

      // Tab 1: Summary KPIs
      const summaryData = [
        ['Metric', 'Value'],
        ['Batch Name', batchName],
        ['Start Date', format(new Date(data.startDate), 'MMMM dd, yyyy')],
        ['End Date', format(new Date(data.endDate), 'MMMM dd, yyyy')],
        ['Batch Status', data.status.replace('_', ' ')],
        ['Total Learners', data.totalLearners],
        ['Completion Rate', `${data.completionRate}%`],
        ['Average Score', data.averageScore],
        ['Knowledge Gain', `${data.knowledgeDelta?.percentageIncrease || 0}%`],
        ['', ''],
        ['--- Active Filters & Context ---', ''],
        ['Department Filter', activeDeptName],
        ['Role Filter', activeRole],
        ['Status Filter', activeStatus],
        ['Exported At', format(new Date(), 'MMM dd, yyyy HH:mm:ss')]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary KPIs');

      // Tab 2: Top Performers
      const topPerformersSheet = XLSX.utils.json_to_sheet(data.topPerformers || []);
      XLSX.utils.book_append_sheet(wb, topPerformersSheet, 'Top Performers');

      // Tab 3: Learner Breakdown
      const learnersSheet = XLSX.utils.json_to_sheet((data.learnerDetails || []).map((l) => ({
        Name: l.name,
        Department: l.department,
        Role: l.role ? l.role.replace('_', ' ') : 'N/A',
        Status: l.status,
        'Pre-Quiz Avg': l.preQuizAvg != null ? `${l.preQuizAvg}%` : 'N/A',
        'Post-Quiz Avg': l.postQuizAvg != null ? `${l.postQuizAvg}%` : 'N/A',
        'Activity Avg': l.activityScoreAvg != null ? `${l.activityScoreAvg}%` : 'N/A',
        'Enrolled At': l.enrolledAt ? format(new Date(l.enrolledAt), 'MMM dd, yyyy') : 'N/A'
      })));
      XLSX.utils.book_append_sheet(wb, learnersSheet, 'Learners');

      // Tab 4: Course Breakdown
      const contentSheet = XLSX.utils.json_to_sheet((data.courseDetails || []).map(c => ({
        Title: c.title,
        'Start Date': c.startDate ? format(new Date(c.startDate), 'MMM dd, yyyy') : 'N/A',
        'End Date': c.endDate ? format(new Date(c.endDate), 'MMM dd, yyyy') : 'N/A',
        'Completion Rate': `${c.completionRate}%`,
        'Quiz Average': c.avgQuizScore != null ? `${c.avgQuizScore}%` : 'N/A',
        'Activity Average': c.avgActivityScore != null ? `${c.avgActivityScore}%` : 'N/A',
        'Passed Count': c.passedCount || 0,
        'Failed Count': c.failedCount || 0
      })));
      XLSX.utils.book_append_sheet(wb, contentSheet, 'Courses');

      const cleanBatchName = batchName && batchName.trim() ? batchName.trim().replace(/\s+/g, '_') : 'Batch';
      XLSX.writeFile(wb, `${cleanBatchName}_RawData.xlsx`);
      toast.success('Excel Data Exported Successfully');
    } catch (e) {
      console.error('[Excel Export Error]:', e);
      toast.error('Failed to export Excel data');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Passed':
      case 'COMPLETED':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-tight py-0.5 px-2 shadow-sm shadow-emerald-500/10">Passed</Badge>;
      case 'Failed':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] tracking-tight py-0.5 px-2 shadow-sm shadow-rose-500/10">Failed</Badge>;
      case 'Incomplete':
      case 'IN_PROGRESS':
      case 'NOT_STARTED':
      default:
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-[10px] tracking-tight py-0.5 px-2 shadow-sm shadow-amber-500/10">Incomplete</Badge>;
    }
  };

  function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  const learnerChunks = data?.learnerDetails ? chunkArray(data.learnerDetails, 18) : [[]];
  const courseChunks = data?.courseDetails ? chunkArray(data.courseDetails, 15) : [[]];
  const totalReportPages = 1 + learnerChunks.length + courseChunks.length;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl p-8">

        {/* Header & Export Actions */}
        <DialogHeader className="mb-6 flex flex-row items-start justify-between">
          <div>
            <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              Batch Analytics
            </DialogTitle>
            <DialogDescription className="text-lg font-medium text-muted-foreground mt-1">
              Performance metrics for <strong className="text-foreground">{batchName}</strong>
            </DialogDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl gap-2 font-bold" onClick={handleExportExcel}>
              <FileText className="h-4 w-4 text-emerald-600" /> Export Data (XLSX)
            </Button>
            <Button className="rounded-xl gap-2 font-bold bg-primary" onClick={handleExportPDF} disabled={isExporting}>
              <Download className="h-4 w-4" /> {isExporting ? 'Generating...' : 'Export Report (PDF)'}
            </Button>
          </div>
        </DialogHeader>

        {data && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 rounded-2xl p-5 text-sm font-semibold">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">🚀</div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Start Date</span>
                <span className="text-foreground font-black">{format(new Date(data.startDate), 'MMMM dd, yyyy')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:border-x sm:border-slate-100 sm:px-6">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">🏁</div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">End Date</span>
                <span className="text-foreground font-black">{format(new Date(data.endDate), 'MMMM dd, yyyy')}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:pl-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">⚙️</div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Batch Status</span>
                  <span className={cn(
                    "font-black tracking-wider uppercase text-xs",
                    data.status === 'COMPLETED' ? 'text-emerald-600' :
                    data.status === 'ACTIVE' ? 'text-blue-600' : 'text-amber-600'
                  )}>
                    {data.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <Badge className={cn(
                "rounded-full px-3 py-1 font-bold tracking-tight border-none text-[9px] shadow-sm uppercase pointer-events-none",
                data.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 shadow-emerald-500/5' :
                data.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-600 shadow-blue-500/5' :
                'bg-amber-500/10 text-amber-600 shadow-amber-500/5'
              )}>
                {data.status.toLowerCase().replace('_', ' ')}
              </Badge>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-muted/30 p-4 rounded-2xl flex flex-wrap gap-4 items-center mb-6">
          <div className="flex items-center gap-2 text-muted-foreground font-bold mr-2">
            <Filter className="h-4 w-4" /> Filters:
          </div>
          <Select value={filters.departmentId} onValueChange={v => setFilters({ ...filters, departmentId: v })}>
            <SelectTrigger className="w-[200px] rounded-xl"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.role} onValueChange={v => setFilters({ ...filters, role: v })}>
            <SelectTrigger className="w-[180px] rounded-xl"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="EMPLOYEE">Employees</SelectItem>
              <SelectItem value="SUPERVISOR">Supervisors</SelectItem>
              <SelectItem value="DEPARTMENT_HEAD">Department Heads</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-[180px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="NOT_STARTED">Not Started</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50 mb-4" />
            <p className="font-bold text-muted-foreground animate-pulse tracking-widest uppercase">Crunching Data...</p>
          </div>
        ) : data ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted/30 p-1 mb-6 rounded-2xl w-full justify-start h-auto gap-2 overflow-x-auto hide-scrollbar">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
                <TrendingUp className="h-4 w-4 mr-2" /> Overview
              </TabsTrigger>
              <TabsTrigger value="learners" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
                <Users className="h-4 w-4 mr-2" /> Learner Breakdown
              </TabsTrigger>
              <TabsTrigger value="content" className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
                <BookOpen className="h-4 w-4 mr-2" /> Content Breakdown
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0 outline-none">
              {/* Printable Area */}
              <div ref={printRef} className="bg-background rounded-2xl p-2 space-y-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="rounded-3xl border-none shadow-lg shadow-primary/5 bg-gradient-to-br from-primary/10 to-transparent">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center"><Users className="h-6 w-6 text-primary" /></div>
                      <div><p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Learners</p><p className="text-3xl font-black">{data.totalLearners}</p></div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-lg shadow-emerald-500/5 bg-gradient-to-br from-emerald-500/10 to-transparent">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="h-6 w-6 text-emerald-500" /></div>
                      <div><p className="text-xs font-black uppercase tracking-widest text-emerald-600/70 mb-1">Completion</p><p className="text-3xl font-black text-emerald-600">{data.completionRate}%</p></div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-lg shadow-amber-500/5 bg-gradient-to-br from-amber-500/10 to-transparent">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center"><Trophy className="h-6 w-6 text-amber-500" /></div>
                      <div><p className="text-xs font-black uppercase tracking-widest text-amber-600/70 mb-1">Avg Score</p><p className="text-3xl font-black text-amber-600">{data.averageScore}</p></div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-lg shadow-blue-500/5 bg-gradient-to-br from-blue-500/10 to-transparent">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-blue-500" /></div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-blue-600/70 mb-1">Knowledge Gain</p>
                        <p className={cn("text-3xl font-black", (data.knowledgeDelta?.percentageIncrease || 0) >= 0 ? "text-blue-600" : "text-rose-600")}>
                          {(data.knowledgeDelta?.percentageIncrease || 0) >= 0 ? '+' : ''}{data.knowledgeDelta?.percentageIncrease}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Knowledge Delta Graph */}
                  <Card className="rounded-3xl border-none shadow-lg shadow-black/5 lg:col-span-1">
                    <CardHeader><CardTitle className="font-black text-lg tracking-tight">Pre vs Post Quiz</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Pre-Quiz', score: data.knowledgeDelta?.preQuizAvg || 0 },
                          { name: 'Post-Quiz', score: data.knowledgeDelta?.postQuizAvg || 0 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis dataKey="name" tick={{ fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <YAxis hide domain={[0, 100]} />
                          <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontWeight: 'bold' }} />
                          <Bar dataKey="score" fill="#D9A72A" radius={[10, 10, 0, 0]}>
                            {
                              [0, 1].map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#9CA3AF' : '#D9A72A'} />
                              ))
                            }
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-lg shadow-black/5 lg:col-span-1">
                    <CardHeader><CardTitle className="font-black text-lg tracking-tight">Status Distribution</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={10}
                          >
                            {data.distribution.map((entry, index: number) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-none shadow-lg shadow-black/5 lg:col-span-1">
                    <CardHeader><CardTitle className="font-black text-lg tracking-tight">Overall K.A.S.H.</CardTitle></CardHeader>
                    <CardContent className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data.kashMetrics}>
                          <PolarGrid strokeOpacity={0.2} />
                          <PolarAngleAxis dataKey="domain" tick={{ fill: '#64748b', fontWeight: 800, fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Average Score" dataKey="score" stroke="#10B981" fill="#10B981" fillOpacity={0.3} strokeWidth={3} />
                          <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontWeight: 'bold' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performers Table */}
                {data.topPerformers.length > 0 && (
                  <Card className="rounded-3xl border-none shadow-lg shadow-black/5">
                    <CardHeader><CardTitle className="font-black text-lg tracking-tight flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" /> Top Performers</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.topPerformers.map((performer: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 font-black flex items-center justify-center">#{i + 1}</div>
                              <span className="font-bold">{performer.name}</span>
                            </div>
                            <div className="font-black text-xl text-primary">{performer.averageScore}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="learners" className="mt-0 outline-none">
              <Card className="rounded-3xl border-none shadow-lg shadow-black/5 overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <CardTitle className="font-black text-xl tracking-tight">Learner Breakdown</CardTitle>
                  <CardDescription>Click on a learner to view their individual course performance within this batch.</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs">Learner Name</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs text-center text-blue-600">Pre Quiz Avg</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs text-center text-amber-600">Post Quiz Avg</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs text-center text-emerald-600">Activity Avg</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.learnerDetails.map((l) => (
                        <React.Fragment key={l.id}>
                          <TableRow
                            className="hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => setExpandedLearnerId(expandedLearnerId === l.id ? null : l.id)}
                          >
                            <TableCell>
                              <div className={cn("transition-transform duration-200", expandedLearnerId === l.id ? "rotate-90" : "")}>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground rotate-45" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-bold text-slate-800">{l.name}</p>
                                <p className="text-[10px] text-muted-foreground font-medium">{l.department}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-black text-blue-600 text-sm">{l.preQuizAvg}%</TableCell>
                            <TableCell className="text-center font-black text-amber-600 text-sm">{l.postQuizAvg}%</TableCell>
                            <TableCell className="text-center font-black text-emerald-600 text-sm">{l.activityScoreAvg}%</TableCell>
                            <TableCell className="text-right">{getStatusBadge(l.status)}</TableCell>
                          </TableRow>
                          {expandedLearnerId === l.id && l.courses?.map((c) => (
                            <TableRow key={c.id} className="bg-slate-50/40 hover:bg-muted/10 border-none transition-colors h-10">
                              <TableCell className="py-2"></TableCell>
                              <TableCell className="py-2 pr-4 font-semibold text-xs text-slate-500 max-w-[240px] truncate pl-6">
                                <span className="text-muted-foreground mr-2 font-mono">↳</span>
                                {c.title}
                              </TableCell>
                              <TableCell className="py-2 text-center font-bold text-blue-600/80 text-xs">
                                {c.preQuizScore}%
                              </TableCell>
                              <TableCell className="py-2 text-center font-bold text-amber-600/80 text-xs">
                                {c.postQuizScore}%
                              </TableCell>
                              <TableCell className="py-2 text-center font-bold text-emerald-600/80 text-xs">
                                {c.activityScore}%
                              </TableCell>
                              <TableCell className="py-2 text-right pr-4">
                                <Badge className={cn(
                                  "font-black uppercase text-[8px] tracking-tighter text-white py-0.5 px-1.5",
                                  c.status === 'Passed' ? "bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-500/10" :
                                  c.status === 'Failed' ? "bg-rose-500 hover:bg-rose-600 shadow-sm shadow-rose-500/10" :
                                  "bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-500/10" // Incomplete
                                )}>
                                  {c.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="mt-0 outline-none">
              <Card className="rounded-3xl border-none shadow-lg shadow-black/5 overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <CardTitle className="font-black text-xl tracking-tight">Course Breakdown</CardTitle>
                  <CardDescription>Click on a course to view the detailed roster and performance of enrolled students.</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs">Course Title</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs text-right">Completion</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs text-right text-blue-600">Quiz Avg</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs text-right text-emerald-600">Activity Avg</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs text-right">Result Summary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.courseDetails.map((c) => (
                        <React.Fragment key={c.id}>
                          <TableRow
                            className="hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => setExpandedCourseId(expandedCourseId === c.id ? null : c.id)}
                          >
                            <TableCell>
                              <div className={cn("transition-transform duration-200", expandedCourseId === c.id ? "rotate-90" : "")}>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground rotate-45" />
                              </div>
                            </TableCell>
                            <TableCell className="max-w-sm">
                              <p className="font-bold text-slate-800 truncate">{c.title}</p>
                              <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                                <span>📅 Schedule:</span>
                                <span className="text-primary">{format(new Date(c.startDate), 'MMM dd, yyyy')}</span>
                                <span>-</span>
                                <span className="text-primary">{format(new Date(c.endDate), 'MMM dd, yyyy')}</span>
                              </p>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${c.completionRate}%` }} />
                                </div>
                                <span className="font-bold text-[10px]">{c.completionRate}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-black text-blue-600">{c.avgQuizScore}</TableCell>
                            <TableCell className="text-right font-black text-emerald-600">{c.avgActivityScore}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-1">
                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[9px] font-black py-0 px-2 h-5">{c.passedCount} Passed</Badge>
                                {c.failedCount > 0 && <Badge variant="destructive" className="text-[9px] font-black py-0 px-2 h-5">{c.failedCount} Failed</Badge>}
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedCourseId === c.id && c.enrolledStudents?.map((s) => (
                            <TableRow key={s.id} className="bg-slate-50/40 hover:bg-muted/10 border-none transition-colors h-10">
                              <TableCell className="py-2"></TableCell>
                              <TableCell className="py-2 pr-4 pl-6">
                                <div className="flex items-start gap-1">
                                  <span className="text-muted-foreground mr-2 font-mono">↳</span>
                                  <div>
                                    <p className="font-semibold text-xs text-slate-500">{s.name}</p>
                                    <p className="text-[9px] text-slate-400 font-medium">{s.department}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-right pr-4">
                                {getStatusBadge(s.status)}
                              </TableCell>
                              <TableCell className="py-2 text-right font-bold text-blue-600/80 text-xs pr-4">
                                {s.quizScore}%
                              </TableCell>
                              <TableCell className="py-2 text-right font-bold text-emerald-600/80 text-xs pr-4">
                                {s.activityScore}%
                              </TableCell>
                              <TableCell className="py-2 text-right pr-4">
                                <Badge className={cn(
                                  "font-black uppercase text-[8px] tracking-tighter text-white py-0.5 px-1.5",
                                  s.result === 'Passed' ? "bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-500/10" :
                                  s.result === 'Failed' ? "bg-rose-500 hover:bg-rose-600 shadow-sm shadow-rose-500/10" :
                                  "bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-500/10" // Incomplete
                                )}>
                                  {s.result || 'Incomplete'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>

          </Tabs>
        ) : null}
      </DialogContent>
      
      {/* Hidden Printable Executive Summary Report Container */}
      <div ref={reportRef} className="absolute left-[-9999px] top-[-9999px] font-sans">
        {/* PAGE 1: Overview & KPIs */}
        <div className="pdf-page w-[800px] h-[1130px] p-12 bg-white text-slate-800 flex flex-col justify-between" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>
          <div className="space-y-6">
            {/* Header Section */}
            <div className="border-b-2 pb-4 flex justify-between items-end" style={{ borderColor: '#d9a72a' }}>
              <div className="flex items-center gap-3">
                <img src="/pdf-logo.png" className="h-10 w-10 object-contain animate-none" style={{ display: 'block', maxWidth: '40px', maxHeight: '40px' }} alt="Standard Insurance Logo" />
                <div>
                  <h1 className="text-2xl font-black tracking-tight" style={{ color: '#d9a72a' }}>Standard Insurance Co., Inc.</h1>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">iLearn Portal • Executive Batch Analytics Report</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black" style={{ color: '#d9a72a' }}>{batchName}</div>
                <div className="text-xs text-slate-400 font-medium">Generated: {format(new Date(), 'MMMM dd, yyyy • hh:mm a')}</div>
              </div>
            </div>

            {/* Active Filters Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
              <div>
                <span className="text-slate-400 uppercase tracking-wider block font-bold text-[10px]">Department Filter</span>
                <span className="text-amber-900 font-bold">{activeDeptName}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block font-bold text-[10px]">Role Filter</span>
                <span className="text-amber-900 font-bold capitalize">{activeRole}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase tracking-wider block font-bold text-[10px]">Status Filter</span>
                <span className="text-amber-900 font-bold capitalize">{activeStatus}</span>
              </div>
            </div>

            {/* Batch Schedule Details Box */}
            {data && (
              <div className="bg-amber-50/30 border border-amber-100 rounded-xl p-4 grid grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-amber-400 uppercase tracking-wider block font-bold text-[10px]">Start Date</span>
                  <span className="text-amber-950 font-bold">{format(new Date(data.startDate), 'MMMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="text-amber-400 uppercase tracking-wider block font-bold text-[10px]">End Date</span>
                  <span className="text-amber-950 font-bold">{format(new Date(data.endDate), 'MMMM dd, yyyy')}</span>
                </div>
                <div>
                  <span className="text-amber-400 uppercase tracking-wider block font-bold text-[10px]">Batch Status</span>
                  <span className={cn(
                    "font-black uppercase text-[10px] tracking-wider",
                    data.status === 'COMPLETED' ? 'text-emerald-600' :
                    data.status === 'ACTIVE' ? 'text-blue-600' : 'text-amber-600'
                  )}>
                    {data.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )}

            {/* SECTION 1: Overview & Performance KPIs */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider">
                1. Batch Overview & KPIs
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block mb-1">Total Enrolled</span>
                  <span className="text-3xl font-black text-amber-900">{data?.totalLearners || 0}</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">Completion Rate</span>
                  <span className="text-3xl font-black text-emerald-900">{data?.completionRate || 0}%</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-1">Average Score</span>
                  <span className="text-3xl font-black text-amber-900">{data?.averageScore || 0}%</span>
                </div>
                <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 block mb-1">Knowledge Gain</span>
                  <span className="text-3xl font-black text-sky-900">{data?.knowledgeDelta?.percentageIncrease || 0}%</span>
                </div>
              </div>

              {/* KASH Metrics Overview */}
              {data?.kashMetrics && data.kashMetrics.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">K.A.S.H. Performance Breakdown</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    {data.kashMetrics.map((m, idx) => (
                      <div key={idx} className="border-r border-slate-200 last:border-r-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">{m.domain}</span>
                        <span className="text-xl font-bold text-slate-800">{m.score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            Confidential • Standard Insurance Portal Analytics Engine • Page 1 of {totalReportPages}
          </div>
        </div>

        {/* PAGE 2+: Learner Performance Breakdown (Dynamic Multi-page Chunked Loop) */}
        {learnerChunks.map((chunk, chunkIdx) => (
          <div key={`pdf-learner-page-${chunkIdx}`} className="pdf-page w-[800px] h-[1130px] p-12 bg-white text-slate-800 flex flex-col justify-between" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>
            <div className="space-y-6">
              {/* Header Section */}
              <div className="border-b-2 pb-4 flex justify-between items-end" style={{ borderColor: '#d9a72a' }}>
                <div className="flex items-center gap-3">
                  <img src="/pdf-logo.png" className="h-10 w-10 object-contain animate-none" style={{ display: 'block', maxWidth: '40px', maxHeight: '40px' }} alt="Standard Insurance Logo" />
                  <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: '#d9a72a' }}>Standard Insurance Co., Inc.</h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">iLearn Portal • Executive Batch Analytics Report</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black" style={{ color: '#d9a72a' }}>{batchName}</div>
                  <div className="text-xs text-slate-400 font-medium">Generated: {format(new Date(), 'MMMM dd, yyyy • hh:mm a')}</div>
                </div>
              </div>

              {/* SECTION 2: Learner Performance Breakdown */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider flex justify-between">
                  <span>2. Learner Breakdown</span>
                  {learnerChunks.length > 1 && (
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest">
                      Part {chunkIdx + 1} of {learnerChunks.length}
                    </span>
                  )}
                </h2>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-600 text-white font-bold uppercase tracking-wider">
                      <th className="p-2 rounded-l-lg">Name</th>
                      <th className="p-2">Department</th>
                      <th className="p-2">Role</th>
                      <th className="p-2">Status</th>
                      <th className="p-2 rounded-r-lg text-right">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk && chunk.length > 0 ? (
                      chunk.map((l, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50" style={{ height: '38px' }}>
                          <td className="p-2 font-bold text-slate-800">{l.name}</td>
                          <td className="p-2 text-slate-600">{l.department}</td>
                          <td className="p-2 text-slate-600 capitalize">{l.role.toLowerCase().replace('_', ' ')}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              l.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                              l.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {l.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-2 text-right font-black text-amber-600">{l.averageScore}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">No learners found matching active filters</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest">
              Confidential • Standard Insurance Portal Analytics Engine • Page {2 + chunkIdx} of {totalReportPages}
            </div>
          </div>
        ))}

        {/* PAGE 3+: Content Insights & Metrics (Dynamic Multi-page Chunked Loop) */}
        {courseChunks.map((chunk, chunkIdx) => (
          <div key={`pdf-course-page-${chunkIdx}`} className="pdf-page w-[800px] h-[1130px] p-12 bg-white text-slate-800 flex flex-col justify-between" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>
            <div className="space-y-6">
              {/* Header Section */}
              <div className="border-b-2 pb-4 flex justify-between items-end" style={{ borderColor: '#d9a72a' }}>
                <div className="flex items-center gap-3">
                  <img src="/pdf-logo.png" className="h-10 w-10 object-contain animate-none" style={{ display: 'block', maxWidth: '40px', maxHeight: '40px' }} alt="Standard Insurance Logo" />
                  <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: '#d9a72a' }}>Standard Insurance Co., Inc.</h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">iLearn Portal • Executive Batch Analytics Report</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black" style={{ color: '#d9a72a' }}>{batchName}</div>
                  <div className="text-xs text-slate-400 font-medium">Generated: {format(new Date(), 'MMMM dd, yyyy • hh:mm a')}</div>
                </div>
              </div>

              {/* SECTION 3: Content Insights */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider flex justify-between">
                  <span>3. Content Insights & Metrics</span>
                  {courseChunks.length > 1 && (
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest">
                      Part {chunkIdx + 1} of {courseChunks.length}
                    </span>
                  )}
                </h2>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-600 text-white font-bold uppercase tracking-wider">
                      <th className="p-2 rounded-l-lg">Course Title</th>
                      <th className="p-2 text-center">Completion Rate</th>
                      <th className="p-2 text-center">Avg Quiz Score</th>
                      <th className="p-2 text-center">Avg Activity Score</th>
                      <th className="p-2 rounded-r-lg text-right">Overall Course Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk && chunk.length > 0 ? (
                      chunk.map((c, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50" style={{ height: '38px' }}>
                          <td className="p-2">
                            <div className="font-bold text-slate-800">{c.title}</div>
                            <div className="text-[9px] text-slate-400 font-medium">
                              Schedule: {format(new Date(c.startDate), 'MMM dd, yyyy')} - {format(new Date(c.endDate), 'MMM dd, yyyy')}
                            </div>
                          </td>
                          <td className="p-2 text-center font-bold text-slate-700">{c.completionRate}%</td>
                          <td className="p-2 text-center text-slate-600">{c.avgQuizScore}%</td>
                          <td className="p-2 text-center text-slate-600">{c.avgActivityScore}%</td>
                          <td className="p-2 text-right font-black text-amber-600">{c.averageScore}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">No course analytics available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Footer Disclaimer */}
              <div className="border-t border-slate-200 pt-4 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Confidential • Standard Insurance Portal Analytics Engine • Page {2 + learnerChunks.length + chunkIdx} of {totalReportPages}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
};
