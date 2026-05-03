import React, { useState, useEffect, useRef } from 'react';
import { usersApi } from '../../api/users.api';
import type { UserResponse } from '../../api/users.api';
import { departmentsApi } from '../../api/departments.api';
import type { Department } from '../../api/departments.api';
import { learningPathsApi } from '../../api/learning-paths.api';
import type { LearningPath } from '../../api/learning-paths.api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { format } from 'date-fns';


import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { 
  Building,
  Route,
  CheckCircle2,
  Copy,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Upload,
  Search,
  Filter,
  UserCheck,
  Shield,
  Calendar as CalendarIcon,
  BookOpen,
  MoreHorizontal
} from 'lucide-react';



import { generateSecurePassword } from '../../lib/password-utils';

import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface UserFormFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
  departments: Department[];
  supervisorCandidates: UserResponse[];
  selectedUser: UserResponse | null;
}

const UserFormFields: React.FC<UserFormFieldsProps> = ({ 
  formData, 
  setFormData, 
  departments, 
  supervisorCandidates, 
  selectedUser 
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleGeneratePassword = () => {
    const newPass = generateSecurePassword();
    setFormData({ ...formData, password: newPass });
    setShowPassword(true);
    toast.info('Temporary password generated. Be sure to copy it!');
  };

  const copyToClipboard = () => {
    if (!formData.password) return;
    navigator.clipboard.writeText(formData.password);
    toast.success('Password copied to clipboard');
  };

  const isEmployee = formData.role === 'EMPLOYEE';
  const isSupervisor = formData.role === 'SUPERVISOR';
  const isDeptHead = formData.role === 'DEPARTMENT_HEAD';
  const isCourseCreator = formData.role === 'COURSE_CREATOR';
  const isLearningManager = formData.role === 'LEARNING_MANAGER';
  const isAdministrator = formData.role === 'ADMINISTRATOR';

  // Dynamic field logic
  const showDept = !isAdministrator && !isLearningManager;
  const showSuperior = isEmployee || isSupervisor;
  const superiorDisabled = isDeptHead || isCourseCreator;
  const superiorLabel = isEmployee ? "Immediate Superior (Supervisor/Dept Head) *" : "Immediate Superior (Dept Head) *";
  
  const filteredSuperiors = supervisorCandidates.filter(u => {
    if (isEmployee) return u.role === 'SUPERVISOR' || u.role === 'DEPARTMENT_HEAD';
    if (isSupervisor) return u.role === 'DEPARTMENT_HEAD';
    return false;
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input 
            id="firstName" 
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input 
            id="lastName" 
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="username">Username *</Label>
        <Input 
          id="username" 
          required
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email" 
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{selectedUser ? 'New Password (Leave blank to keep old)' : 'Temporary Password *'}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"}
              required={!selectedUser}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={copyToClipboard}
                disabled={!formData.password}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleGeneratePassword}
            className="flex-shrink-0"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select 
            value={formData.role} 
            onValueChange={(val) => setFormData({...formData, role: val, immediateSuperiorId: 'none'})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMPLOYEE">Employee</SelectItem>
              <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
              <SelectItem value="COURSE_CREATOR">Course Creator</SelectItem>
              <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
              <SelectItem value="LEARNING_MANAGER">Learning Manager</SelectItem>
              <SelectItem value="ADMINISTRATOR">Administrator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showDept && (
          <div className="space-y-2">
            <Label>Department {isAdministrator || isLearningManager ? "" : "*"}</Label>
            <Select 
              value={formData.departmentId} 
              onValueChange={(val) => setFormData({...formData, departmentId: val})}
              required={showDept}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {(showSuperior || superiorDisabled) && (
        <div className="space-y-2">
          <Label className={superiorDisabled ? "opacity-50" : ""}>{superiorLabel}</Label>
          <Select 
            value={formData.immediateSuperiorId} 
            onValueChange={(val) => setFormData({...formData, immediateSuperiorId: val})}
            disabled={superiorDisabled}
            required={showSuperior && !superiorDisabled}
          >
            <SelectTrigger className={superiorDisabled ? "bg-muted opacity-50" : ""}>
              <SelectValue placeholder={superiorDisabled ? "None (Direct Access)" : "Select Superior"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {filteredSuperiors.map(sup => (
                <SelectItem key={sup.id} value={sup.id}>{sup.firstName} {sup.lastName} ({sup.role.replace('_', ' ')})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
};


export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  
  // Filtering State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assignType, setAssignType] = useState<'PATH' | 'COURSE'>('PATH');

  
  const [formData, setFormData] = useState({
    username: '', 
    email: '', 
    firstName: '', 
    lastName: '', 
    role: 'EMPLOYEE', 
    departmentId: 'none', 
    password: '',
    immediateSuperiorId: 'none'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [userData, deptData, pathData] = await Promise.all([
        usersApi.getAll({ 
          search, 
          role: roleFilter === 'all' ? undefined : roleFilter,
          departmentId: deptFilter === 'all' ? undefined : deptFilter
        }),
        departmentsApi.getAll(),
        learningPathsApi.getAll(),
        import('../../api/courses.api').then(m => m.coursesApi.getAll('active'))
      ]);
      setUsers(userData);
      setDepartments(deptData);
      setLearningPaths(pathData.filter(p => p.isPublished));
      setCourses(courseData);

    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, deptFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await usersApi.create({
        ...formData,
        departmentId: formData.departmentId === 'none' ? undefined : formData.departmentId,
        immediateSuperiorId: formData.immediateSuperiorId === 'none' ? undefined : formData.immediateSuperiorId
      });
      toast.success('User created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsProcessing(true);
    try {
      await usersApi.update(selectedUser.id, {
        ...formData,
        departmentId: formData.departmentId === 'none' ? null : formData.departmentId,
        immediateSuperiorId: formData.immediateSuperiorId === 'none' ? null : formData.immediateSuperiorId
      });
      toast.success('User updated successfully');
      setIsEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser || (assignType === 'PATH' && !selectedPathId) || (assignType === 'COURSE' && !selectedCourseId)) return;
    setIsProcessing(true);
    try {
      if (assignType === 'PATH') {
        await learningPathsApi.enroll(selectedPathId, selectedUser.id, dueDate);
        toast.success(`Path assigned to ${selectedUser.firstName}`);
      } else {
        const { enrollmentsApi } = await import('../../api/enrollments.api');
        await enrollmentsApi.enroll(selectedCourseId, selectedUser.id, dueDate);
        toast.success(`Course assigned to ${selectedUser.firstName}`);
      }
      setIsAssignOpen(false);
      setSelectedPathId("");
      setSelectedCourseId("");
      setDueDate(undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Assignment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '', email: '', firstName: '', lastName: '', role: 'EMPLOYEE', departmentId: 'none', password: '', immediateSuperiorId: 'none'
    });
    setSelectedUser(null);
  };

  const openEdit = (user: UserResponse) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
      departmentId: user.departmentId || 'none',
      password: '',
      immediateSuperiorId: user.immediateSuperiorId || 'none'
    });
    setIsEditOpen(true);
  };

  const openAssign = (user: UserResponse, type: 'PATH' | 'COURSE' = 'PATH') => {
    setSelectedUser(user);
    setAssignType(type);
    setSelectedPathId("");
    setSelectedCourseId("");
    setDueDate(undefined);
    setIsAssignOpen(true);
  };

  const handleBulkAction = async (action: string, extraData: any = {}) => {
    if (selectedUserIds.length === 0) return;
    setIsLoading(true);
    try {
      await usersApi.bulkUpdate(selectedUserIds, { action, ...extraData });
      toast.success('Bulk update successful');
      setSelectedUserIds([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(i => i !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const results = await usersApi.bulkImport(file);
      toast.success(`Bulk import complete. Imported ${results.importedCount || 0} users.`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import users');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const supervisorCandidates = users.filter(u => u.role === 'SUPERVISOR' || u.role === 'DEPARTMENT_HEAD');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">User Management</h1>
          <p className="text-muted-foreground text-lg italic">Manage system users, roles, and corporate reporting structure.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Button variant="outline" className="rounded-xl shadow-sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Bulk Import
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-lg shadow-primary/20"><Plus className="mr-2 h-4 w-4" /> Create User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Create User</DialogTitle>
                  <DialogDescription>Manually add a new user to the system.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <UserFormFields 
                    formData={formData} 
                    setFormData={setFormData} 
                    departments={departments} 
                    supervisorCandidates={supervisorCandidates} 
                    selectedUser={selectedUser} 
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" className="rounded-xl" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if(!open) resetForm(); }}>
            <DialogContent className="max-w-md rounded-3xl">
              <form onSubmit={handleUpdate}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Edit User</DialogTitle>
                  <DialogDescription>Update user information and reporting structure.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <UserFormFields 
                    formData={formData} 
                    setFormData={setFormData} 
                    departments={departments} 
                    supervisorCandidates={supervisorCandidates} 
                    selectedUser={selectedUser} 
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button type="submit" className="rounded-xl" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update User
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Assign Dialog */}
          <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                  {assignType === 'PATH' ? <Route className="h-6 w-6 text-primary" /> : <BookOpen className="h-6 w-6 text-primary" />}
                  {assignType === 'PATH' ? 'Assign Learning Path' : 'Assign Individual Course'}
                </DialogTitle>
                <DialogDescription>
                  Enroll <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> in a {assignType === 'PATH' ? 'sequenced path' : 'specific course'}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-6">
                <div className="space-y-2">
                  <Label>Target Content</Label>
                  {assignType === 'PATH' ? (
                    <Select value={selectedPathId} onValueChange={setSelectedPathId}>
                      <SelectTrigger className="rounded-xl h-12 bg-muted/30">
                        <SelectValue placeholder="Choose a path..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {learningPaths.map(path => (
                          <SelectItem key={path.id} value={path.id}>{path.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger className="rounded-xl h-12 bg-muted/30">
                        <SelectValue placeholder="Choose a course..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    Target Completion Date (Optional)
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal rounded-xl bg-muted/30 border-none",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : <span>Set a strict deadline</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-primary/10" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-[10px] text-muted-foreground italic px-1">Learners will receive reminders before this date.</p>
                </div>
                
                {((assignType === 'PATH' && selectedPathId) || (assignType === 'COURSE' && selectedCourseId)) && (
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-primary">Ready to Assign</p>
                      <p className="text-muted-foreground">
                        {dueDate 
                          ? `Due by ${format(dueDate, "MMMM d, yyyy")}.` 
                          : "No specific deadline set."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-xl" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                <Button 
                  className="rounded-xl shadow-lg shadow-primary/20"
                  disabled={isProcessing || (assignType === 'PATH' ? !selectedPathId : !selectedCourseId)}
                  onClick={handleAssign}
                >
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign Now
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-2xl border shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or username..." 
            className="pl-10 h-11 bg-background rounded-xl border-primary/5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px] h-11 bg-background rounded-xl border-primary/5">
              <Filter className="mr-2 h-3 w-3" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="EMPLOYEE">Employee</SelectItem>
              <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
              <SelectItem value="COURSE_CREATOR">Course Creator</SelectItem>
              <SelectItem value="DEPARTMENT_HEAD">Dept Head</SelectItem>
              <SelectItem value="LEARNING_MANAGER">Manager</SelectItem>
              <SelectItem value="ADMINISTRATOR">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[180px] h-11 bg-background rounded-xl border-primary/5">
              <Building className="mr-2 h-3 w-3" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="none">None</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedUserIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-3 rounded-2xl animate-in slide-in-from-top-2 shadow-sm">
          <div className="text-sm font-bold text-primary pl-2">
            {selectedUserIds.length} users selected
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="rounded-lg">
                  Bulk Actions <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>Modify Selected</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('ACTIVATE')} className="text-green-600 rounded-lg">
                  <UserCheck className="mr-2 h-4 w-4" /> Activate Accounts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('DEACTIVATE')} className="text-destructive rounded-lg">
                  <UserX className="mr-2 h-4 w-4" /> Deactivate Accounts
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                {['EMPLOYEE', 'SUPERVISOR', 'COURSE_CREATOR', 'DEPARTMENT_HEAD', 'LEARNING_MANAGER', 'ADMINISTRATOR'].map(role => (
                  <DropdownMenuItem key={role} onClick={() => handleBulkAction('CHANGE_ROLE', { role })} className="rounded-lg">
                    <Shield className="mr-2 h-4 w-4" /> {role.replace('_', ' ')}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setSelectedUserIds([])}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="border rounded-2xl bg-card overflow-hidden shadow-xl bg-background/50 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={users.length > 0 && selectedUserIds.length === users.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-bold">Employee</TableHead>
              <TableHead className="font-bold">Role</TableHead>
              <TableHead className="font-bold">Reporting Line</TableHead>
              <TableHead className="font-bold">Department</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right px-6 font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/50" /></TableCell></TableRow>
            ) : users.length === 0 ? (
               <TableRow><TableCell colSpan={7} className="h-64 text-center text-muted-foreground italic">No users found matching your criteria.</TableCell></TableRow>
            ) : (
              users.map((user) => (

                <TableRow 
                  key={user.id} 
                  className={cn(
                    "hover:bg-primary/5 transition-colors cursor-pointer group",
                    selectedUserIds.includes(user.id) && "bg-primary/10"
                  )}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedUserIds.includes(user.id)} 
                      onCheckedChange={() => toggleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell onClick={() => openEdit(user)}>
                    <div className="font-bold group-hover:text-primary transition-colors">{user.firstName} {user.lastName}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{user.username}</div>
                  </TableCell>
                  <TableCell onClick={() => openEdit(user)}>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm" onClick={() => openEdit(user)}>
                    {user.immediateSuperior ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">{user.immediateSuperior.firstName} {user.immediateSuperior.lastName}</span>
                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest opacity-50">Superior</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs opacity-50">Independent</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm" onClick={() => openEdit(user)}>{user.department?.name || <span className="text-muted-foreground opacity-50">N/A</span>}</TableCell>
                  <TableCell onClick={() => openEdit(user)}>
                    {user.isActive ? (
                      <Badge className="bg-success/10 text-success hover:bg-success/20 border-none px-3 py-1">Active</Badge>
                    ) : (
                      <Badge variant="destructive" className="px-3 py-1">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right px-6" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem onClick={() => openEdit(user)} className="rounded-lg">
                          <Shield className="mr-2 h-4 w-4" /> Edit Profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>

                    </DropdownMenu>
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

