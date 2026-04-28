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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<div>Dashboard Placeholder</div>} />
                
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
