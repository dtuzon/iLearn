import React, { useState, useEffect, useRef } from 'react';
import { usersApi } from '../../api/users.api';
import type { UserResponse } from '../../api/users.api';
import { departmentsApi } from '../../api/departments.api';
import type { Department } from '../../api/departments.api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { Loader2, Plus, Upload, Search, Filter, MoreHorizontal, UserX, UserCheck, Shield, Building } from 'lucide-react';
import { toast } from 'sonner';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Create/Edit Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
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

  // Bulk Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [userData, deptData] = await Promise.all([
        usersApi.getAll({ 
          search, 
          role: roleFilter === 'all' ? undefined : roleFilter,
          departmentId: deptFilter === 'all' ? undefined : deptFilter
        }),
        departmentsApi.getAll()
      ]);
      setUsers(userData);
      setDepartments(deptData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300); // Debounce search
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

  const UserFormFields = () => (
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

      {!selectedUser && (
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input 
            id="password" 
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select 
            value={formData.role} 
            onValueChange={(val) => setFormData({...formData, role: val})}
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

        <div className="space-y-2">
          <Label>Department</Label>
          <Select 
            value={formData.departmentId} 
            onValueChange={(val) => setFormData({...formData, departmentId: val})}
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
      </div>

      <div className="space-y-2">
        <Label>Immediate Superior</Label>
        <Select 
          value={formData.immediateSuperiorId} 
          onValueChange={(val) => setFormData({...formData, immediateSuperiorId: val})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Superior" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {supervisorCandidates.map(sup => (
              <SelectItem key={sup.id} value={sup.id}>{sup.firstName} {sup.lastName} ({sup.role.replace('_', ' ')})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage system users, roles, and corporate reporting structure.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Bulk Import
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Create User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create User</DialogTitle>
                  <DialogDescription>Manually add a new user to the system.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <UserFormFields />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if(!open) resetForm(); }}>
            <DialogContent className="max-w-md">
              <form onSubmit={handleUpdate}>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>Update user information and reporting structure.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <UserFormFields />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update User
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name or username..." 
            className="pl-10 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px] bg-background">
              <Filter className="mr-2 h-3 w-3" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
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
            <SelectTrigger className="w-[180px] bg-background">
              <Building className="mr-2 h-3 w-3" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="none">None</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Menu */}
      {selectedUserIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-3 rounded-lg animate-in slide-in-from-top-2">
          <div className="text-sm font-medium text-primary">
            {selectedUserIds.length} users selected
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  Bulk Actions <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Modify Selected</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('ACTIVATE')} className="text-green-600">
                  <UserCheck className="mr-2 h-4 w-4" /> Activate Accounts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('DEACTIVATE')} className="text-destructive">
                  <UserX className="mr-2 h-4 w-4" /> Deactivate Accounts
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                {['EMPLOYEE', 'SUPERVISOR', 'COURSE_CREATOR', 'DEPARTMENT_HEAD', 'LEARNING_MANAGER', 'ADMINISTRATOR'].map(role => (
                  <DropdownMenuItem key={role} onClick={() => handleBulkAction('CHANGE_ROLE', { role })}>
                    <Shield className="mr-2 h-4 w-4" /> {role === 'COURSE_CREATOR' ? 'Course Creator' : role.replace('_', ' ')}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={() => setSelectedUserIds([])}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={users.length > 0 && selectedUserIds.length === users.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Immediate Superior</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : users.length === 0 ? (
               <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No users found matching your criteria.</TableCell></TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={selectedUserIds.includes(user.id) ? "bg-accent/30" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedUserIds.includes(user.id)} 
                      onCheckedChange={() => toggleSelectUser(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{user.firstName} {user.lastName}</div>
                    <div className="text-xs text-muted-foreground">{user.username}</div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-secondary/50 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight">
                      {user.role === 'COURSE_CREATOR' ? 'Course Creator' : user.role.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.immediateSuperior ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{user.immediateSuperior.firstName} {user.immediateSuperior.lastName}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Direct Report</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{user.department?.name || <span className="text-muted-foreground">None</span>}</TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <div className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-600" /> Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-destructive font-medium text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-destructive" /> Inactive
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                      Edit
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
