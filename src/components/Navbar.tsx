import React from 'react';
import { MessageCircle, Server } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Navbar: React.FC = () => {
  const { currentUser, setActiveView, logout } = useStore();
  const whatsappUrl = 'https://wa.me/263788350229';

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={() => setActiveView('home')} className="flex items-center gap-2 font-bold text-zinc-950">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3120ff] text-white"><Server className="h-4 w-4" /></span>
          Runtime
        </button>
        <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
          <button onClick={() => setActiveView('home')} className="hover:text-zinc-950">Home</button>
          <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-zinc-950">Domains</button>
          <button onClick={() => document.getElementById('coming-soon')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-zinc-950">Coming soon</button>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-zinc-950"><MessageCircle className="h-4 w-4" /> Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <button onClick={() => setActiveView('dashboard')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Dashboard</button>
              <button onClick={logout} className="hidden text-sm text-zinc-500 hover:text-zinc-950 sm:block">Sign out</button>
            </>
          ) : (
            <a href="/login" className="hidden px-3 py-2 text-sm font-semibold text-zinc-700 sm:block">Sign in</a>
          )}
          <button onClick={() => currentUser ? setActiveView('dashboard') : (window.location.href = '/register')} className="rounded-lg bg-[#3120ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2819d9]">Register a domain</button>
        </div>
      </div>
    </header>
  );
};
