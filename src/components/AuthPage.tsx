import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Link, useNavigate } from 'react-router-dom';

interface AuthPageProps { mode: 'login' | 'register'; }

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const { login, register, loginWithGoogle, resetPassword } = useStore();
  const navigate = useNavigate();
  const isLogin = mode === 'login';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      if (isLogin) await login(email, password, remember);
      else await register(name, email, password);
      navigate('/dashboard', { replace: true });
    }
    catch (authError) { setError(authError instanceof Error ? authError.message : 'Unable to authenticate.'); }
    finally { setLoading(false); }
  };

  const googleSignIn = async () => {
    setError(''); setLoading(true);
    try { await loginWithGoogle(); navigate('/dashboard', { replace: true }); }
    catch (authError) { setError(authError instanceof Error ? authError.message : 'Unable to sign in with Google.'); }
    finally { setLoading(false); }
  };

  const forgotPassword = async () => {
    if (!email) { setError('Enter your email address first.'); return; }
    setError(''); setLoading(true);
    try { await resetPassword(email); } catch (authError) { setError(authError instanceof Error ? authError.message : 'Unable to send the reset email.'); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-zinc-950 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 opacity-80" style={{ background: 'radial-gradient(ellipse at 20% 20%, #3120ff 0%, transparent 45%), radial-gradient(ellipse at 80% 70%, #734bff 0%, transparent 42%), linear-gradient(135deg, #070711 10%, #19113e 52%, #050509 100%)' }} />
        <div className="relative z-10 flex items-center gap-2 text-sm font-bold tracking-wide text-white"><span className="h-2 w-2 rounded-full bg-[#3120FF]" /> RUNTIME</div>
        <div className="relative z-10 max-w-lg"><p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Runtime domains</p><h2 className="text-5xl font-bold leading-[1.05] tracking-tight text-white">Your name belongs on the web.</h2><p className="mt-5 max-w-md text-base leading-7 text-white/65">Manage your Zimbabwean domain names from one clear, dependable workspace.</p></div>
      </aside>
      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-100">
          <button onClick={() => navigate('/')} aria-label="Back to homepage" className="absolute right-5 top-5 flex h-11 items-center rounded-lg px-3 text-sm font-medium text-zinc-500 hover:text-zinc-950 sm:right-8">Back</button>
          <button onClick={() => navigate('/')} className="mb-10 flex items-center gap-2 text-sm font-bold tracking-wide text-zinc-950"><span className="h-2 w-2 rounded-full bg-[#3120FF]" /> RUNTIME</button>
          <div className="mb-8"><div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-[#3120FF] text-white"><Lock className="h-4 w-4" /></div><h1 className="text-3xl font-bold tracking-tight text-zinc-950">{isLogin ? 'Welcome Back' : 'Create your account'}</h1><p className="mt-2 text-sm text-zinc-500">{isLogin ? 'Sign in to manage your domains.' : 'Start managing your domains with Runtime.'}</p></div>
          <form onSubmit={submit} className="space-y-5">
            {!isLogin && <label className="block text-sm font-medium text-zinc-800">Name<span className="relative mt-2 block"><UserRound className="absolute left-3 top-3 h-5 w-5 text-zinc-400" /><input required value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-transparent bg-zinc-100 pl-11 pr-3 outline-none transition focus:border-[#3120FF] focus:bg-white" /></span></label>}
            <label className="block text-sm font-medium text-zinc-800">Email<span className="relative mt-2 block"><Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-400" /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full rounded-xl border border-transparent bg-zinc-100 pl-11 pr-3 outline-none transition focus:border-[#3120FF] focus:bg-white" /></span></label>
            <label className="block text-sm font-medium text-zinc-800">Password<span className="relative mt-2 block"><Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" /><input type={showPassword ? 'text' : 'password'} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-xl border border-transparent bg-zinc-100 pl-11 pr-11 outline-none transition focus:border-[#3120FF] focus:bg-white" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-1 h-9 w-9 rounded-lg text-zinc-500 hover:text-zinc-950">{showPassword ? <EyeOff className="mx-auto h-5 w-5" /> : <Eye className="mx-auto h-5 w-5" />}</button></span></label>
            {isLogin && <div className="flex items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 text-zinc-600"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 accent-[#3120FF]" /> Remember me</label><button type="button" onClick={forgotPassword} className="font-semibold text-[#3120FF] hover:underline">Forgot password?</button></div>}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button disabled={loading} type="submit" className="h-11 w-full rounded-xl bg-[#3120FF] text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:opacity-50">{loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}</button>
            <button disabled={loading} type="button" onClick={googleSignIn} className="h-11 w-full rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50">Sign in with Google</button>
          </form>
          <Link to="/" className="mt-5 block min-h-11 py-3 text-center text-sm font-semibold text-[#3120FF] hover:underline">Continue without an account</Link>
          <p className="mt-3 text-center text-sm text-zinc-500">{isLogin ? 'New to Runtime?' : 'Already have an account?'} <Link to={isLogin ? '/register' : '/login'} className="font-semibold text-[#3120FF] hover:underline">{isLogin ? 'Create an account' : 'Sign in'}</Link></p>
        </div>
      </section>
    </main>
  );
};
