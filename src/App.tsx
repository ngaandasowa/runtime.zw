import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Hero } from './components/Home/Hero';
import { PlatformModules } from './components/Home/PlatformModules';
import { PricingSection } from './components/Home/PricingSection';
import { DomainRegistrationModal } from './components/DomainRegistrationModal';
import { AuthPage } from './components/AuthPage';
import { DashboardShell } from './components/Dashboard/DashboardShell';
import { LegalPage } from './components/LegalPage';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 selection:bg-[#3120ff]/15 selection:text-[#3120ff]">
    <Navbar />
    <main>{children}</main>
    <Footer />
  </div>
);

const ProtectedDashboard: React.FC = () => {
  const { currentUser, authReady } = useStore();
  if (!authReady) return <div className="min-h-screen bg-white" />;
  return currentUser ? <DashboardShell /> : <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
  const { notification, registrationModalOpen } = useStore();
  const location = useLocation();
  const isAuthRoute = ['/login', '/register'].includes(location.pathname);

  return (
    <>
      <Routes>
        <Route path="/" element={<PublicLayout><Hero /><PlatformModules /><PricingSection /></PublicLayout>} />
        <Route path="/pricing" element={<PublicLayout><PricingSection /></PublicLayout>} />
        <Route path="/terms" element={<PublicLayout><LegalPage type="terms" /></PublicLayout>} />
        <Route path="/privacy" element={<PublicLayout><LegalPage type="privacy" /></PublicLayout>} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/dashboard/*" element={<ProtectedDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {registrationModalOpen && <DomainRegistrationModal />}
      {notification && !isAuthRoute && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start space-x-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl ring-1 ring-black/5">
          {notification.type === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />}
          {notification.type === 'error' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />}
          {notification.type === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />}
          <div className="flex-1 text-xs font-medium text-zinc-800">{notification.message}</div>
        </div>
      )}
    </>
  );
};

export default function App() {
  return <BrowserRouter><StoreProvider><AppContent /></StoreProvider></BrowserRouter>;
}
