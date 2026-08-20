import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Hero } from './components/Home/Hero';
import { PlatformModules } from './components/Home/PlatformModules';
import { PricingSection } from './components/Home/PricingSection';
import { PoweredByNgaatec } from './components/Home/PoweredByNgaatec';
import { DomainRegistrationModal } from './components/DomainRegistrationModal';
import { AuthModal } from './components/AuthModal';
import { DashboardShell } from './components/Dashboard/DashboardShell';
import { AdminShell } from './components/Admin/AdminShell';
import { DocsView } from './components/Docs/DocsView';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    activeView, 
    notification, 
    showNotification,
    registrationModalOpen,
    authModalOpen 
  } = useStore();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col selection:bg-[#FF2D20]/15 selection:text-[#FF2D20]">
      
      {/* Navbar (Shown on public pages and dashboard header) */}
      {activeView !== 'admin' && <Navbar />}

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {activeView === 'home' && (
          <>
            <Hero />
            <PlatformModules />
            <PricingSection />
            <PoweredByNgaatec />
          </>
        )}

        {activeView === 'pricing' && (
          <div className="py-12">
            <PricingSection />
            <PoweredByNgaatec />
          </div>
        )}

        {activeView === 'dashboard' && <DashboardShell />}

        {activeView === 'admin' && <AdminShell />}

        {activeView === 'docs' && <DocsView />}
      </main>

      {/* Public Footer */}
      {activeView !== 'admin' && activeView !== 'dashboard' && <Footer />}

      {/* Domain Registration Modal (4-step checkout & ZISPA wizard) */}
      {registrationModalOpen && <DomainRegistrationModal />}

      {/* Authentication Modal */}
      {authModalOpen && <AuthModal />}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-xl ring-1 ring-black/5 flex items-start space-x-3 transition-all duration-300">
          {notification.type === 'success' && (
            <CheckCircle2 className="h-5 w-5 text-[#FF2D20] shrink-0 mt-0.5" />
          )}
          {notification.type === 'error' && (
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          )}
          {notification.type === 'info' && (
            <Info className="h-5 w-5 text-[#FF2D20] shrink-0 mt-0.5" />
          )}

          <div className="flex-1 text-xs font-medium text-zinc-800">
            {notification.message}
          </div>
        </div>
      )}

    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
