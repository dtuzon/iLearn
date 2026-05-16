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
import html2canvas from 'html2canvas';
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

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    toast.info('Generating PDF Report...');
    try {
      setActiveTab('overview');
      // Small timeout to allow tab render and chart animations to finish
      setTimeout(async () => {
        const element = printRef.current!;
        const canvas = await html2canvas(element, { 
          scale: 2, 
          useCORS: true,
          logging: false,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // If content is too long for one page, we might need multiple pages
        // For now, we'll just scale it to fit width
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${batchName.replace(/\s+/g, '_')}_Analytics.pdf`);
        toast.success('PDF Exported Successfully');
        setIsExporting(false);
      }, 800);
    } catch (e) {
      toast.error('Failed to generate PDF');
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
        ['Total Learners', data.totalLearners],
        ['Completion Rate', `${data.completionRate}%`],
        ['Average Score', data.averageScore],
        ['Knowledge Gain', `${data.knowledgeDelta?.percentageIncrease || 0}%`]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary KPIs');

      // Tab 2: Top Performers
      const topPerformersSheet = XLSX.utils.json_to_sheet(data.topPerformers);
      XLSX.utils.book_append_sheet(wb, topPerformersSheet, 'Top Performers');

      // Tab 3: Learner Breakdown
      const learnersSheet = XLSX.utils.json_to_sheet(data.learnerDetails.map((l) => ({
        Name: l.name,
        Department: l.department,
        Role: l.role,
        Status: l.status,
        'Enrolled At': format(new Date(l.enrolledAt), 'MMM dd, yyyy'),
        'Average Score': l.averageScore
      })));
      XLSX.utils.book_append_sheet(wb, learnersSheet, 'Learners');

      // Tab 4: Course Breakdown
      const contentSheet = XLSX.utils.json_to_sheet(data.courseDetails.map(c => ({
        Title: c.title,
        'Completion Rate': `${c.completionRate}%`,
        'Average Score': c.averageScore
      })));
      XLSX.utils.book_append_sheet(wb, contentSheet, 'Courses');

      XLSX.writeFile(wb, `${batchName.replace(/\s+/g, '_')}_RawData.xlsx`);
      toast.success('Excel Data Exported Successfully');
    } catch (e) {
      toast.error('Failed to export Excel');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-blue-500 hover:bg-blue-600">In Progress</Badge>;
      case 'PENDING_GRADING': return <Badge className="bg-amber-500 hover:bg-amber-600">Pending Grading</Badge>;
      default: return <Badge variant="secondary">Not Started</Badge>;
    }
  };

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
                          <Bar dataKey="score" fill="#4F46E5" radius={[10, 10, 0, 0]}>
                            {
                              [0, 1].map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#9CA3AF' : '#4F46E5'} />
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
                        <TableHead className="font-bold tracking-widest uppercase text-xs">Department</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs">Status</TableHead>
                        <TableHead className="font-bold tracking-widest uppercase text-xs text-right">Avg Score</TableHead>
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
                            <TableCell className="font-bold">{l.name}</TableCell>
                            <TableCell className="text-xs font-medium">{l.department}</TableCell>
                            <TableCell>{getStatusBadge(l.status)}</TableCell>
                            <TableCell className="text-right font-black text-primary text-lg">{l.averageScore}</TableCell>
                          </TableRow>
                          {expandedLearnerId === l.id && (
                            <TableRow className="bg-muted/5 hover:bg-muted/5">
                              <TableCell colSpan={5} className="p-0">
                                <div className="p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className="bg-background text-primary border-primary/20">Enrolled Content</Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {l.courses?.map((c) => (
                                      <div key={c.id} className="bg-background p-4 rounded-2xl border border-primary/5 flex justify-between items-center shadow-sm">
                                        <div className="flex-1">
                                          <p className="font-bold text-sm truncate">{c.title}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            {getStatusBadge(c.status)}
                                          </div>
                                        </div>
                                        <div className="text-right ml-4">
                                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Score</p>
                                          <p className="text-lg font-black text-primary">{c.averageScore}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
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
                            <TableCell className="font-bold max-w-sm truncate">{c.title}</TableCell>
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
                          {expandedCourseId === c.id && (
                            <TableRow className="bg-muted/5 hover:bg-muted/5">
                              <TableCell colSpan={6} className="p-0">
                                <div className="p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                  <div className="rounded-[1.5rem] border bg-background overflow-hidden shadow-sm">
                                    <Table>
                                      <TableHeader className="bg-muted/20">
                                        <TableRow>
                                          <TableHead className="text-[10px] font-black uppercase h-10">Learner</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase h-10">Status</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase h-10 text-right">Quiz Score</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase h-10 text-right">Activity Score</TableHead>
                                          <TableHead className="text-[10px] font-black uppercase h-10 text-right">Result</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {c.enrolledStudents?.map((s) => (
                                          <TableRow key={s.id} className="h-12">
                                            <TableCell className="py-2">
                                              <p className="font-bold text-xs">{s.name}</p>
                                              <p className="text-[10px] text-muted-foreground">{s.department}</p>
                                            </TableCell>
                                            <TableCell className="py-2">{getStatusBadge(s.status)}</TableCell>
                                            <TableCell className="py-2 text-right font-black text-blue-600">{s.quizScore}</TableCell>
                                            <TableCell className="py-2 text-right font-black text-emerald-600">{s.activityScore}</TableCell>
                                            <TableCell className="py-2 text-right">
                                              <Badge className={cn(
                                                "font-black uppercase text-[9px] tracking-tighter",
                                                s.result === 'Passed' ? "bg-emerald-500 hover:bg-emerald-600" :
                                                s.result === 'Failed' ? "bg-rose-500 hover:bg-rose-600" :
                                                "bg-muted text-muted-foreground"
                                              )}>
                                                {s.result}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
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
    </Dialog>
  );
};
