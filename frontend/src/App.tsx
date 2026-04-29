import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { SystemSettings } from './pages/admin/SystemSettings';
import { DepartmentManagement } from './pages/admin/DepartmentManagement';
import { UserManagement } from './pages/admin/UserManagement';
import { RoleGuard } from './components/auth/RoleGuard';
import { Toaster } from './components/ui/sonner';
import { CourseManagement } from './pages/creator/CourseManagement';
import { CourseBuilder } from './pages/creator/CourseBuilder';
import { MyLearning } from './pages/employee/MyLearning';
import { CoursePlayer } from './pages/employee/CoursePlayer';
import { MyCertificates } from './pages/employee/MyCertificates';
import { TeamEvaluations } from './pages/supervisor/TeamEvaluations';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                
                {/* Admin & HR Routes */}
                <Route path="/admin" element={
                  <RoleGuard allowedRoles={['ADMINISTRATOR', 'LEARNING_MANAGER']}>
                    <Outlet />
                  </RoleGuard>
                }>
                  <Route path="settings" element={<SystemSettings />} />
                  <Route path="departments" element={<DepartmentManagement />} />
                  <Route path="users" element={<UserManagement />} />
                </Route>

                {/* COURSE_CREATOR Routes */}
                <Route path="/creator" element={
                  <RoleGuard allowedRoles={['ADMINISTRATOR', 'COURSE_CREATOR']}>
                    <Outlet />
                  </RoleGuard>
                }>
                  <Route path="courses" element={<CourseManagement />} />
                  <Route path="courses/:courseId" element={<CourseBuilder />} />
                </Route>

                {/* Employee Routes */}
                <Route path="/learning" element={
                  <RoleGuard allowedRoles={['EMPLOYEE']}>
                    <Outlet />
                  </RoleGuard>
                }>
                  <Route path="my-courses" element={<MyLearning />} />
                  <Route path="course/:courseId" element={<CoursePlayer />} />
                  <Route path="certificates" element={<MyCertificates />} />
                </Route>

                {/* Supervisor Routes */}
                <Route path="/supervisor" element={
                  <RoleGuard allowedRoles={['SUPERVISOR', 'DEPARTMENT_HEAD', 'ADMINISTRATOR']}>
                    <Outlet />
                  </RoleGuard>
                }>
                  <Route path="team-evaluations" element={<TeamEvaluations />} />
                </Route>

                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
