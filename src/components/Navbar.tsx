import React, { useState } from 'react';

import {
  Menu,
  Server,
  UserCircle2,
  X,
} from 'lucide-react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  useStore,
} from '../context/StoreContext';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    setActiveView,
  } = useStore();

  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  /*
   * Go to homepage
   */
  const goHome = () => {
    closeMenu();
    setActiveView('home');
    navigate('/');
  };

  /*
   * Dashboard
   */
  const goToDashboard = () => {
    closeMenu();

    if (currentUser) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  /*
   * Domains
   *
   * Goes directly to the domain search
   * section on the homepage.
   */
  const goToDomains = () => {
    closeMenu();
    navigate('/#domain-search');
  };

  /*
   * Tools
   *
   * Goes to the tools section on the homepage.
   */
  const goToTools = () => {
    closeMenu();
    navigate('/#coming-soon');
  };

  /*
   * Register domain
   */
  const registerDomain = () => {
    closeMenu();

    if (currentUser) {
      setActiveView('dashboard');
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* LEFT SIDE */}
        <div className="flex items-center">

          {/* LOGO */}
          <button
            onClick={goHome}
            className="flex items-center gap-2 font-bold text-zinc-950"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3120ff] text-white">
              <Server className="h-4 w-4" />
            </span>

            <span>
              Runtime
            </span>
          </button>

          {/* DESKTOP NAVIGATION */}
          <nav className="ml-10 hidden items-center gap-7 text-sm font-medium text-zinc-600 md:flex">

            {currentUser && (
              <button
                onClick={goToDashboard}
                className="transition-colors hover:text-zinc-950"
              >
                Dashboard
              </button>
            )}

            <button
              onClick={goToDomains}
              className="transition-colors hover:text-zinc-950"
            >
              Domains
            </button>

            <button
              onClick={goToTools}
              className="transition-colors hover:text-zinc-950"
            >
              Tools
            </button>

          </nav>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-1.5">

          {/* ACCOUNT */}
          <button
            onClick={
              currentUser
                ? goToDashboard
                : () => {
                    closeMenu();
                    navigate('/login');
                  }
            }
            aria-label={
              currentUser
                ? 'Open dashboard'
                : 'Sign in'
            }
            title={
              currentUser
                ? 'Dashboard'
                : 'Sign in'
            }
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            <UserCircle2 className="h-6 w-6" />
          </button>

          {/* MOBILE MENU */}
          <button
            onClick={() =>
              setMenuOpen(
                (value) => !value
              )
            }
            aria-label={
              menuOpen
                ? 'Close menu'
                : 'Open menu'
            }
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 md:hidden"
          >
            {menuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* DESKTOP REGISTER BUTTON */}
          <button
            onClick={registerDomain}
            className="hidden rounded-lg bg-[#3120ff] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2819d9] md:block"
          >
            Register a domain
          </button>

        </div>
      </div>

      {/* MOBILE NAVIGATION */}
      {menuOpen && (
        <div className="border-t border-zinc-200 bg-white md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">

            <nav className="flex flex-col gap-1 text-sm font-medium text-zinc-600">

              {currentUser && (
                <button
                  onClick={goToDashboard}
                  className="rounded-lg px-3 py-3 text-left transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                >
                  Dashboard
                </button>
              )}

              <button
                onClick={goToDomains}
                className="rounded-lg px-3 py-3 text-left transition-colors hover:bg-zinc-100 hover:text-zinc-950"
              >
                Domains
              </button>

              <button
                onClick={goToTools}
                className="rounded-lg px-3 py-3 text-left transition-colors hover:bg-zinc-100 hover:text-zinc-950"
              >
                Tools
              </button>

            </nav>

            <button
              onClick={registerDomain}
              className="mt-3 w-full rounded-lg bg-[#3120ff] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2819d9]"
            >
              Register a domain
            </button>

          </div>
        </div>
      )}
    </header>
  );
};