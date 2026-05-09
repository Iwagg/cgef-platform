import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { CyberMaturity } from './pages/CyberMaturity';
import { RiskRegister } from './pages/RiskRegister';
import { ControlsLibrary } from './pages/ControlsLibrary';
import { IncidentsActions } from './pages/IncidentsActions';
import { ComplianceCenter } from './pages/ComplianceCenter';
import { AuditEvidence } from './pages/AuditEvidence';
import { PoliciesDocuments } from './pages/PoliciesDocuments';
import { AssetsThirdParties } from './pages/AssetsThirdParties';
import { RoadmapProjects } from './pages/RoadmapProjects';
import { Reporting } from './pages/Reporting';
import { ClientsOrganisations } from './pages/ClientsOrganisations';
import { Settings } from './pages/Settings';
// Legacy pages kept for compatibility
import { Assessments } from './pages/Assessments';
import { AssessmentDetail } from './pages/AssessmentDetail';
import { AssessmentEvaluate } from './pages/AssessmentEvaluate';
import { ActionPlans } from './pages/ActionPlans';
import { RegulatoryIntel } from './pages/RegulatoryIntel';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Loading CGEF Platform...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, initialized, loading } = useAuthStore();
  if (!initialized || loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.organization_id) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, initialized, loading } = useAuthStore();
  if (!initialized || loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
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
            <Route path="maturity" element={<CyberMaturity />} />
            <Route path="risks" element={<RiskRegister />} />
            <Route path="controls" element={<ControlsLibrary />} />
            <Route path="incidents" element={<IncidentsActions />} />
            <Route path="compliance" element={<ComplianceCenter />} />
            <Route path="audit" element={<AuditEvidence />} />
            <Route path="policies" element={<PoliciesDocuments />} />
            <Route path="assets" element={<AssetsThirdParties />} />
            <Route path="roadmap" element={<RoadmapProjects />} />
            <Route path="reporting" element={<Reporting />} />
            <Route path="clients" element={<ClientsOrganisations />} />
            <Route path="settings" element={<Settings />} />
            {/* Legacy routes */}
            <Route path="assessments" element={<Assessments />} />
            <Route path="assessments/:id" element={<AssessmentDetail />} />
            <Route path="assessments/:id/evaluate" element={<AssessmentEvaluate />} />
            <Route path="action-plans" element={<ActionPlans />} />
            <Route path="regulatory-intel" element={<RegulatoryIntel />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
