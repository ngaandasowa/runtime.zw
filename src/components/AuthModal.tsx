import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ArrowRight, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const AuthModal: React.FC = () => {
  const { 
    authModalOpen, 
    setAuthModalOpen, 
    login, 
    register, 
    switchUserRole,
    currentUser,
    users 
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register' | 'switch'>('login');
  const [email, setEmail] = useState('ngaandasowa@gmail.com');
  const [name, setName] = useState('Ngaa Ndasowa');
  const [password, setPassword] = useState('••••••••');

  if (!authModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      login(email);
    } else if (mode === 'register') {
      register(name, email, password);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 text-zinc-900 shadow-2xl ring-1 ring-black/5">
        
        {/* Close Button */}
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="mb-6">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#FF2D20] uppercase tracking-wider mb-1">
            <Lock className="h-3.5 w-3.5" />
            <span>Authentication Portal</span>
          </div>
          <h3 className="text-xl font-extrabold text-zinc-950 tracking-tight">
            {mode === 'login' && 'Sign In to Runtime'}
            {mode === 'register' && 'Create Developer Account'}
            {mode === 'switch' && 'Switch Active Role Context'}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            {mode === 'login' && 'Access domains, cloud resources, and billing invoices.'}
            {mode === 'register' && 'Start registering .co.zw domains and exploring cloud compute.'}
            {mode === 'switch' && 'Toggle between customer, registrar desk, and root admin profiles.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 mb-6 text-xs font-bold">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 pb-2 text-center border-b-2 transition ${
              mode === 'login'
                ? 'border-[#FF2D20] text-[#FF2D20]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 pb-2 text-center border-b-2 transition ${
              mode === 'register'
                ? 'border-[#FF2D20] text-[#FF2D20]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Register
          </button>
          <button
            onClick={() => setMode('switch')}
            className={`flex-1 pb-2 text-center border-b-2 transition ${
              mode === 'switch'
                ? 'border-[#FF2D20] text-[#FF2D20]'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Role Switcher
          </button>
        </div>

        {/* Forms */}
        {mode !== 'switch' ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'register' && (
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ngaa Ndasowa"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.co.zw"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 py-2.5 text-zinc-900 placeholder-zinc-400 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-[#FF2D20] py-3 font-bold text-white hover:bg-[#E0241A] transition active:scale-98 shadow-sm"
            >
              <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          /* Role Switcher */
          <div className="space-y-2.5 text-xs">
            {users.map((u) => {
              const isSelected = currentUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    switchUserRole(u.role);
                    setAuthModalOpen(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'border-[#FF2D20] bg-red-50/50'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-zinc-900">{u.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border border-zinc-200 bg-white text-zinc-600">
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">{u.email}</div>
                  </div>

                  {isSelected ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF2D20] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-[#FF2D20] hover:underline">Select</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
