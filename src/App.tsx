import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Assessments } from './pages/Assessments';
import { AssessmentDetail } from './pages/AssessmentDetail';
import { AssessmentEvaluate } from './pages/AssessmentEvaluate';
import { Compliance } from './pages/Compliance';
import { ActionPlans } from './pages/ActionPlans';
import { Reporting } from './pages/Reporting';
import { RegulatoryIntel } from './pages/RegulatoryIntel';
import { Settings } from './pages/Settings';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-slate-50">
      <div className="animate-spin w-10 h-10 border-4 border-brand-green-500 border-t-transparent rounded-full" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, initialized, loading } = useAuthStore();
  if (!initialized || loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  // Redirect to onboarding if no org
  if (profile && !profile.organization_id) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, initialized, loading } = useAuthStore();
  if (!initialized || loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  // If already has org, redirect to home
  if (profile?.organization_id) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  const { initialize, initialized } = useAuthStore();
  useEffect(() => { if (!initialized) initialize(); }, [initialize, initialized]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="assessments" element={<Assessments />} />
            <Route path="assessments/:id" element={<AssessmentDetail />} />
            <Route path="assessments/:id/evaluate" element={<AssessmentEvaluate />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="action-plans" element={<ActionPlans />} />
            <Route path="reporting" element={<Reporting />} />
            <Route path="regulatory-intel" element={<RegulatoryIntel />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
