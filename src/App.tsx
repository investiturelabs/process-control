import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Toaster } from 'sonner';
import { StoreProvider } from '@/context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { config } from '@/lib/config';
import { ClipboardCheck, Shield, BarChart3, Users } from 'lucide-react';
import { DashboardPage } from '@/pages/DashboardPage';
import { AuditPage } from '@/pages/AuditPage';
import { AuditStartPage } from '@/pages/AuditStartPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TeamPage } from '@/pages/TeamPage';
import { QuestionsPage } from '@/pages/QuestionsPage';
import { ActivityLogPage } from '@/pages/ActivityLogPage';
import { Layout } from '@/components/Layout';

function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-12 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <ClipboardCheck size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight">AuditFlows</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold leading-tight mb-3">
              Streamline your<br />audit process
            </h1>
            <p className="text-blue-100 text-base leading-relaxed max-w-md">
              Run standardized audits, track compliance scores, and surface trends across every department.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={16} />
              </div>
              <div>
                <p className="font-medium text-sm">Standardized Scoring</p>
                <p className="text-blue-200 text-xs">Consistent criteria across all departments</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <BarChart3 size={16} />
              </div>
              <div>
                <p className="font-medium text-sm">Real-time Analytics</p>
                <p className="text-blue-200 text-xs">Track trends and spot compliance gaps instantly</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <Users size={16} />
              </div>
              <div>
                <p className="font-medium text-sm">Team Collaboration</p>
                <p className="text-blue-200 text-xs">Manage auditors and assign roles with ease</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-blue-300/70 text-xs">
          An <span className="text-blue-200/80">Investiture Labs</span> product
        </p>
      </div>

      {/* Right sign-in panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-white lg:bg-gradient-to-br lg:from-slate-50/80 lg:to-white">
        {/* Mobile-only branding */}
        <div className="lg:hidden mb-8 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <ClipboardCheck size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">AuditFlows</span>
          </div>
          <p className="text-sm text-slate-500">Streamline your audit process</p>
        </div>

        <SignIn forceRedirectUrl="/" />

        <p className="mt-8 text-xs text-slate-400">
          An <span className="text-slate-500">Investiture Labs</span> product
        </p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignIn forceRedirectUrl="/" />} />
      <Route path="/sign-up" element={<SignUp forceRedirectUrl="/" />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="audit" element={<AuditStartPage />} />
        <Route path="audit/:departmentId" element={<AuditPage />} />
        <Route path="results/:sessionId" element={<ResultsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="questions" element={<QuestionsPage />} />
        <Route path="activity" element={<ActivityLogPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={config.basePath.replace(/\/+$/, '')}>
      <ErrorBoundary>
        <SignedOut>
          <AuthPage />
        </SignedOut>
        <SignedIn>
          <StoreProvider>
            <AppRoutes />
            <Toaster />
          </StoreProvider>
        </SignedIn>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
