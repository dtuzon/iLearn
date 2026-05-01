import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

import { SystemSettings } from './pages/admin/SystemSettings';
import { DepartmentManagement } from './pages/admin/DepartmentManagement';
import { UserManagement } from './pages/admin/UserManagement';
import { EvaluationTemplates } from './pages/admin/EvaluationTemplates';

import { RoleGuard } from './components/auth/RoleGuard';
import { Toaster } from './components/ui/sonner';
import { CourseManagement } from './pages/creator/CourseManagement';
import { CourseBuilder } from './pages/creator/CourseBuilder';
import { LearningPaths } from './pages/creator/LearningPaths';
import { LearningPathBuilder } from './pages/creator/LearningPathBuilder';
import { MyLearning } from './pages/employee/MyLearning';
import { CoursePlayer } from './pages/employee/CoursePlayer';
import { MyCertificates } from './pages/employee/MyCertificates';
import { TeamEvaluations } from './pages/supervisor/TeamEvaluations';
import { TeamManagement } from './pages/supervisor/TeamManagement';
import { ActivityApprovals } from './pages/approvals/ActivityApprovals';


import { Dashboard } from './pages/Dashboard';
import { DiscoverCatalog } from './pages/learner/DiscoverCatalog';
import { PathRoadmap } from './pages/learner/PathRoadmap';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                  <Route path="evaluation-templates" element={<EvaluationTemplates />} />

                </Route>

                {/* COURSE_CREATOR Routes */}
                <Route path="/creator" element={
                  <RoleGuard allowedRoles={['ADMINISTRATOR', 'COURSE_CREATOR']}>
                    <Outlet />
                  </RoleGuard>
                }>
                  <Route path="courses" element={<CourseManagement />} />
                  <Route path="courses/:courseId" element={<CourseBuilder />} />
                  <Route path="learning-paths" element={<LearningPaths />} />
                  <Route path="learning-paths/:id" element={<LearningPathBuilder />} />
                </Route>

                {/* Employee Routes */}
                <Route path="/learning" element={
                  <RoleGuard allowedRoles={['EMPLOYEE', 'ADMINISTRATOR']}>
                    <Outlet />
                  </RoleGuard>
                }>
                  <Route path="my-courses" element={<MyLearning />} />
                  <Route path="course/:courseId" element={<CoursePlayer />} />
                  <Route path="certificates" element={<MyCertificates />} />
                  <Route path="discover" element={<DiscoverCatalog />} />
                  <Route path="paths/:id" element={<PathRoadmap />} />
                </Route>

                {/* Supervisor Routes */}
                <Route path="/supervisor" element={
                  <RoleGuard allowedRoles={['SUPERVISOR', 'DEPARTMENT_HEAD', 'ADMINISTRATOR']}>
                    <Outlet />
                  </RoleGuard>
                }>
                  <Route path="team-evaluations" element={<TeamEvaluations />} />
                  <Route path="team-management" element={<TeamManagement />} />
                </Route>

                {/* Shared Approval Routes */}
                <Route path="/approvals" element={
                  <RoleGuard allowedRoles={['SUPERVISOR', 'DEPARTMENT_HEAD', 'COURSE_CREATOR', 'ADMINISTRATOR']}>
                    <Outlet />
                  </RoleGuard>
                }>
                  <Route path="activities" element={<ActivityApprovals />} />
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
