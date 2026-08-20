import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Server, 
  ChevronRight, 
  UserCircle, 
  LogOut, 
  ShieldCheck,
  Zap
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    currentUser, 
    activeView, 
    setActiveView, 
    setAuthModalOpen, 
    logout, 
    switchUserRole,
    setRegistrationModalOpen 
  } = useStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      {/* Top micro-bar for developer mode & role switcher */}
      <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-1.5 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#FF2D20] animate-pulse"></span>
            <span className="font-mono text-[11px] text-zinc-600">
              NGAATEC REGISTRAR ENGINE: <span className="text-[#FF2D20] font-semibold">ZISPA .CO.ZW GATEWAY ACTIVE</span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-zinc-500 hidden sm:inline">Role Switcher:</span>
            <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 text-[11px] shadow-2xs">
              <button
                id="role-btn-customer"
                onClick={() => switchUserRole('customer')}
                className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                  currentUser?.role === 'customer' 
                    ? 'bg-[#FF2D20]/10 text-[#FF2D20]' 
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Customer
              </button>
              <button
                id="role-btn-superadmin"
                onClick={() => switchUserRole('super_admin')}
                className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                  currentUser?.role === 'super_admin' 
                    ? 'bg-zinc-900 text-white' 
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Super Admin
              </button>
              <button
                id="role-btn-registryadmin"
                onClick={() => switchUserRole('registry_admin')}
                className={`px-2.5 py-0.5 rounded-md font-medium transition ${
                  currentUser?.role === 'registry_admin' 
                    ? 'bg-[#FF2D20] text-white' 
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Registry Ops
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div 
          onClick={() => setActiveView('home')} 
          className="flex cursor-pointer items-center space-x-3 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF2D20] text-white shadow-sm transition group-hover:scale-105">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-base font-bold tracking-tight text-zinc-900">
                RUNTIME
              </span>
              <span className="rounded-full bg-[#FF2D20]/10 px-2 py-0.5 text-[10px] font-bold text-[#FF2D20] border border-[#FF2D20]/20">
                v1.0
              </span>
            </div>
            <p className="text-[10px] tracking-wide text-zinc-400 font-medium">
              Build • Deploy • Run
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 text-xs font-semibold text-zinc-600">
          <button
            id="nav-home"
            onClick={() => setActiveView('home')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeView === 'home' 
                ? 'text-zinc-900 bg-zinc-100 font-bold' 
                : 'hover:text-zinc-900 hover:bg-zinc-100/60'
            }`}
          >
            Home
          </button>
          <button
            id="nav-domains"
            onClick={() => {
              if (currentUser) {
                setActiveView('dashboard');
              } else {
                setActiveView('home');
                const el = document.getElementById('domain-search-hero');
                el?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
              activeView === 'domains' 
                ? 'text-zinc-900 bg-zinc-100 font-bold' 
                : 'hover:text-zinc-900 hover:bg-zinc-100/60'
            }`}
          >
            <span>Domains</span>
            <span className="text-[10px] font-bold bg-[#FF2D20]/10 text-[#FF2D20] px-1.5 py-0.2 rounded-full">
              $2/yr
            </span>
          </button>
          <button
            id="nav-platform"
            onClick={() => setActiveView('platform')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeView === 'platform' 
                ? 'text-zinc-900 bg-zinc-100 font-bold' 
                : 'hover:text-zinc-900 hover:bg-zinc-100/60'
            }`}
          >
            Platform
          </button>
          <button
            id="nav-developers"
            onClick={() => setActiveView('docs')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeView === 'developers' 
                ? 'text-zinc-900 bg-zinc-100 font-bold' 
                : 'hover:text-zinc-900 hover:bg-zinc-100/60'
            }`}
          >
            Developers
          </button>
          <button
            id="nav-docs"
            onClick={() => setActiveView('docs')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeView === 'docs' 
                ? 'text-zinc-900 bg-zinc-100 font-bold' 
                : 'hover:text-zinc-900 hover:bg-zinc-100/60'
            }`}
          >
            Documentation
          </button>
          <button
            id="nav-pricing"
            onClick={() => setActiveView('pricing')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeView === 'pricing' 
                ? 'text-zinc-900 bg-zinc-100 font-bold' 
                : 'hover:text-zinc-900 hover:bg-zinc-100/60'
            }`}
          >
            Pricing
          </button>
        </nav>

        {/* Right side authentication & CTA */}
        <div className="flex items-center space-x-2.5">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              {currentUser.role.includes('admin') ? (
                <button
                  id="nav-admin-btn"
                  onClick={() => setActiveView('admin')}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
                    activeView === 'admin'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-200 shadow-2xs'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#FF2D20]" />
                  <span>Admin Panel</span>
                </button>
              ) : null}

              <button
                id="nav-dashboard-btn"
                onClick={() => setActiveView('dashboard')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition border ${
                  activeView === 'dashboard'
                    ? 'bg-[#FF2D20]/10 text-[#FF2D20] border-[#FF2D20]/30'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-200 shadow-2xs'
                }`}
              >
                <UserCircle className="h-3.5 w-3.5 text-zinc-500" />
                <span className="hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
                <span className="sm:hidden">Dashboard</span>
              </button>

              <button
                id="nav-logout-btn"
                onClick={logout}
                title="Log out"
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="nav-login-btn"
              onClick={() => setAuthModalOpen(true)}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-3 py-1.5 transition"
            >
              Sign In
            </button>
          )}

          <button
            id="nav-get-started-btn"
            onClick={() => {
              if (currentUser) {
                setActiveView('dashboard');
              } else {
                setRegistrationModalOpen(true);
              }
            }}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-[#FF2D20] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#E0241A] active:scale-95 shadow-sm"
          >
            <span>Get Started</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
