import React from 'react';
import { MessageCircle, Server } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const { setActiveView } = useStore();

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 text-sm text-zinc-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <div className="flex items-center gap-2 font-bold text-zinc-950">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3120ff] text-white"><Server className="h-4 w-4" /></span>
            Runtime
          </div>
          <p className="mt-3 max-w-sm">Simple .zw domain registration for businesses, organisations, and institutions.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3">
          <button onClick={() => setActiveView('home')} className="hover:text-[#3120ff]">Home</button>
          <button onClick={() => setActiveView('pricing')} className="hover:text-[#3120ff]">Pricing</button>
          <button onClick={() => document.getElementById('coming-soon')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-[#3120ff]">Coming soon</button>
          <a href="tel:+263788350229" className="hover:text-[#3120ff]">+263 788 350 229</a>
          <a href="https://wa.me/263788350229" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#3120ff]"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          <Link to="/terms" className="hover:text-[#3120ff]">Terms</Link>
          <Link to="/privacy" className="hover:text-[#3120ff]">Privacy</Link>
        </nav>
        <p>© {new Date().getFullYear()} Runtime</p>
      </div>
    </footer>
  );
};
