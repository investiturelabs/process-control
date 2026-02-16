import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Toaster } from 'sonner';
import { StoreProvider } from '@/context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { config } from '@/lib/config';
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
          <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <SignIn forceRedirectUrl="/" />
          </div>
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
