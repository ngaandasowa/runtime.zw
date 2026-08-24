import React, { useEffect } from 'react';

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import {
  StoreProvider,
  useStore,
} from './context/StoreContext';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

import { Hero } from './components/Home/Hero';
import { PlatformModules } from './components/Home/PlatformModules';
import { PricingSection } from './components/Home/PricingSection';

import { DomainPricing } from './pages/DomainPricing';
import { WhoisLookup } from './pages/WhoisLookup';
import { ContactUs } from './pages/ContactUs';
import { NotFound } from './pages/NotFound';

import { DomainRegistrationModal } from './components/DomainRegistrationModal';
import { AuthPage } from './components/AuthPage';
import { AdminShell } from './components/Admin/AdminShell';
import { DashboardShell } from './components/Dashboard/DashboardShell';
import { LegalPage } from './components/LegalPage';

import AuthAction from "./pages/AuthAction";

import {
  ComingSoon,
} from './pages/ComingSoon';

import {
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

/*
 * ------------------------------------------------------------
 * PUBLIC LAYOUT
 *
 * All public-facing pages automatically get:
 *
 * Navbar
 * Page content
 * Footer
 * ------------------------------------------------------------
 */

const PublicLayout: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 selection:bg-[#3120ff]/15 selection:text-[#3120ff]">
      <Navbar />

      <main>
        {children}
      </main>

      <Footer />
    </div>
  );
};

/*
 * ------------------------------------------------------------
 * PROTECTED DASHBOARD
 * ------------------------------------------------------------
 */

const ProtectedDashboard: React.FC = () => {
  const {
    currentUser,
    authReady,
  } = useStore();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-white" />
    );
  }

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (currentUser.role === 'super_admin') {
    return <AdminShell />;
  }

  return <DashboardShell />;
};

/*
 * ------------------------------------------------------------
 * AUTH ROUTES
 *
 * Logged-in users should not remain on login/register pages.
 * ------------------------------------------------------------
 */

const AuthRoute: React.FC<{
  mode: 'login' | 'register';
}> = ({ mode }) => {
  const {
    currentUser,
    authReady,
  } = useStore();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-white" />
    );
  }

  return currentUser ? (
    <Navigate
      to="/dashboard"
      replace
    />
  ) : (
    <AuthPage mode={mode} />
  );
};

/*
 * ------------------------------------------------------------
 * APP CONTENT
 * ------------------------------------------------------------
 */

const AppContent: React.FC = () => {
  const {
    notification,
    registrationModalOpen,
  } = useStore();

  const location = useLocation();

  const isAuthRoute = [
  '/login',
  '/register',
  '/auth/action',
].includes(location.pathname);
  /*
   * ----------------------------------------------------------
   * AUTOMATIC SCROLL BEHAVIOUR
   * ----------------------------------------------------------
   *
   * Normal route:
   *
   * /whois
   * /domain-pricing
   * /terms
   *
   * → automatically starts at the top.
   *
   *
   * Hash route:
   *
   * /#domain-search
   *
   * → automatically scrolls to the domain search section.
   *
   * No extra button or user action is required.
   * ----------------------------------------------------------
   */

  useEffect(() => {
    /*
     * Prevent browser scroll restoration from fighting
     * against our route-based scroll behaviour.
     */
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration =
        'manual';
    }

    /*
     * HASH NAVIGATION
     *
     * Example:
     * /#domain-search
     */
    if (location.hash) {
      const id = decodeURIComponent(
        location.hash.replace(
          '#',
          ''
        )
      );

      /*
       * Wait until React has rendered the new route.
       */
      let attempts = 0;

      const scrollToHash = () => {
        const element =
          document.getElementById(
            id
          );

        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          return;
        }

        /*
         * The homepage may still be rendering.
         * Retry a few times rather than leaving
         * the user at the previous scroll position.
         */
        attempts += 1;

        if (attempts < 10) {
          window.setTimeout(
            scrollToHash,
            50
          );
        } else {
          window.scrollTo(
            0,
            0
          );
        }
      };

      requestAnimationFrame(
        scrollToHash
      );

      return;
    }

    /*
     * NORMAL PAGE NAVIGATION
     *
     * Always move to the top immediately when
     * pathname changes.
     */
    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      });
    });
  }, [
    location.pathname,
    location.hash,
  ]);

  return (
    <>
      <Routes>

        {/* -------------------------------------------------- */}
        {/* HOME */}
        {/* -------------------------------------------------- */}

        <Route
          path="/"
          element={
            <PublicLayout>
              <Hero />
              <PlatformModules />
              <PricingSection />
            </PublicLayout>
          }
        />

        <Route path="/auth/action" element={<AuthAction />} />

        <Route
          path="/coming-soon"
          element={
            <PublicLayout>
              <ComingSoon />
            </PublicLayout>
          }
        />

        {/* -------------------------------------------------- */}
        {/* GENERAL PRICING */}
        {/* -------------------------------------------------- */}

        <Route
          path="/pricing"
          element={
            <PublicLayout>
              <PricingSection />
            </PublicLayout>
          }
        />

        {/* -------------------------------------------------- */}
        {/* DOMAIN PRICING */}
        {/* -------------------------------------------------- */}

        <Route
          path="/domain-pricing"
          element={
            <PublicLayout>
              <DomainPricing />
            </PublicLayout>
          }
        />

        {/* -------------------------------------------------- */}
        {/* WHOIS LOOKUP */}
        {/* -------------------------------------------------- */}

        <Route
          path="/whois"
          element={
            <PublicLayout>
              <WhoisLookup />
            </PublicLayout>
          }
        />

        <Route
          path="/contact"
          element={
            <PublicLayout>
              <ContactUs />
            </PublicLayout>
          }
        />

        {/* -------------------------------------------------- */}
        {/* TERMS */}
        {/* -------------------------------------------------- */}

        <Route
          path="/terms"
          element={
            <PublicLayout>
              <LegalPage type="terms" />
            </PublicLayout>
          }
        />

        {/* -------------------------------------------------- */}
        {/* PRIVACY */}
        {/* -------------------------------------------------- */}

        <Route
          path="/privacy"
          element={
            <PublicLayout>
              <LegalPage type="privacy" />
            </PublicLayout>
          }
        />

        {/* -------------------------------------------------- */}
        {/* LOGIN */}
        {/* -------------------------------------------------- */}

        <Route
          path="/login"
          element={
            <AuthRoute mode="login" />
          }
        />

        {/* -------------------------------------------------- */}
        {/* REGISTER */}
        {/* -------------------------------------------------- */}

        <Route
          path="/register"
          element={
            <AuthRoute mode="register" />
          }
        />

        {/* -------------------------------------------------- */}
        {/* DASHBOARD */}
        {/* -------------------------------------------------- */}

        <Route
          path="/dashboard/*"
          element={
            <ProtectedDashboard />
          }
        />

        {/* -------------------------------------------------- */}
        {/* UNKNOWN ROUTES */}
        {/* -------------------------------------------------- */}

        <Route
          path="*"
          element={
            <PublicLayout>
              <NotFound />
            </PublicLayout>
          }
        />
      </Routes>

      {/* -------------------------------------------------- */}
      {/* DOMAIN REGISTRATION MODAL */}
      {/* -------------------------------------------------- */}

      {registrationModalOpen && (
        <DomainRegistrationModal />
      )}

      {/* -------------------------------------------------- */}
      {/* NOTIFICATIONS */}
      {/* -------------------------------------------------- */}

      {notification &&
        !isAuthRoute && (
          <div className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start space-x-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl ring-1 ring-black/5">

            {notification.type ===
              'success' && (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />
            )}

            {notification.type ===
              'error' && (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            )}

            {notification.type ===
              'info' && (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />
            )}

            <div className="flex-1 text-xs font-medium text-zinc-800">
              {notification.message}
            </div>
          </div>
        )}
    </>
  );
};

/*
 * ------------------------------------------------------------
 * APP
 * ------------------------------------------------------------
 */

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </BrowserRouter>
  );
}