import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserRound,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Link, useNavigate } from 'react-router-dom';
import runtimeLogo from '../assets/runtime-logo.svg';
import runtimeLogoWhite from '../assets/runtime-logo-white.svg';
import {
  isValidEmailAddress,
  normalizeEmail,
} from '../services/FirebaseAuthService';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const {
    login,
    register,
    loginWithGoogle,
    resetPassword,
    pendingRegisterDomain,
    setRegistrationModalOpen,
  } = useStore();

  const navigate = useNavigate();
  const isLogin = mode === 'login';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmailAddress, setResetEmailAddress] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail =
      normalizeEmail(email);

    setEmailTouched(true);
    setError('');

    if (
      !isValidEmailAddress(
        normalizedEmail
      )
    ) {
      setError(
        'Enter a valid email address, for example name@example.com.'
      );
      return;
    }

    if (
      !isLogin &&
      name.trim().length < 2
    ) {
      setError(
        'Enter your full name.'
      );
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(
          normalizedEmail,
          password
        );
      } else {
        await register(
          name.trim(),
          normalizedEmail,
          password
        );
      }

      if (pendingRegisterDomain) {
        setRegistrationModalOpen(true);
      }

      navigate('/dashboard', {
        replace: true,
      });
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Unable to authenticate.'
      );
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle();

      if (pendingRegisterDomain) {
        setRegistrationModalOpen(true);
      }

      navigate('/dashboard', {
        replace: true,
      });
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Unable to sign in with Google.'
      );
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    const normalizedEmail =
      normalizeEmail(email);

    if (
      !isValidEmailAddress(
        normalizedEmail
      )
    ) {
      setResetEmailSent(false);
      setEmailTouched(true);
      setError(
        'Enter a valid email address first.'
      );
      return;
    }

    setError('');
    setResetEmailSent(false);
    setLoading(true);

    try {
      await resetPassword(normalizedEmail);

      setResetEmailAddress(normalizedEmail);
      setResetEmailSent(true);
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Unable to send the reset email.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEmail(event.target.value);

    if (resetEmailSent) {
      setResetEmailSent(false);
      setResetEmailAddress('');
    }

    if (error) {
      setError('');
    }
  };


  const emailIsValid =
    !email.trim() ||
    isValidEmailAddress(
      email
    );

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-zinc-950 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(ellipse at 20% 20%, #3120ff 0%, transparent 45%), radial-gradient(ellipse at 80% 70%, #734bff 0%, transparent 42%), linear-gradient(135deg, #070711 10%, #19113e 52%, #050509 100%)',
          }}
        />

        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Runtime home"
          className="relative z-10 flex w-fit items-center"
        >
          <img
            src={runtimeLogoWhite}
            alt="Runtime"
            className="h-9 w-auto"
          />
        </button>

        <div className="relative z-10 max-w-lg">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
            Runtime domains
          </p>

          <h2 className="text-5xl font-bold leading-[1.05] tracking-tight text-white">
            Your name belongs on the web.
          </h2>

          <p className="mt-5 max-w-md text-base leading-7 text-white/65">
            Manage your Zimbabwean domain names from one clear,
            dependable workspace.
          </p>
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-100">
          <button
            onClick={() => navigate('/')}
            aria-label="Back to homepage"
            className="absolute right-5 top-5 flex h-11 items-center rounded-lg px-3 text-sm font-medium text-zinc-500 hover:text-zinc-950 sm:right-8"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Runtime home"
            className="mb-10 w-fit"
          >
            <img
              src={runtimeLogo}
              alt="Runtime"
              className="h-9 w-auto"
            />
          </button>

          <div className="mb-8">
            <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-[#3120FF] text-white">
              <Lock className="h-4 w-4" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
              {isLogin
                ? 'Welcome Back'
                : 'Create your account'}
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              {isLogin
                ? 'Sign in to manage your domains.'
                : 'Start managing your domains with Runtime.'}
            </p>
          </div>

          {resetEmailSent && isLogin && (
            <div
              role="status"
              className="mb-6 rounded-2xl border border-[#3120FF]/15 bg-[#3120FF]/5 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3120FF]/10 text-[#3120FF]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    Check your email
                  </p>

                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    We sent a password reset link to{' '}
                    <span className="font-semibold text-zinc-800">
                      {resetEmailAddress}
                    </span>
                    .
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Open the email and follow the link to create a
                    new password.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form
            onSubmit={submit}
            className="space-y-5"
          >
            {!isLogin && (
              <label className="block text-sm font-medium text-zinc-800">
                Name

                <span className="relative mt-2 block">
                  <UserRound className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />

                  <input
                    required
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    className="h-11 w-full rounded-xl border border-transparent bg-zinc-100 pl-11 pr-3 outline-none transition focus:border-[#3120FF] focus:bg-white"
                  />
                </span>
              </label>
            )}

            <label className="block text-sm font-medium text-zinc-800">
              Email

              <span className="relative mt-2 block">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() =>
                    setEmailTouched(true)
                  }
                  autoComplete="email"
                  className={`h-11 w-full rounded-xl border bg-zinc-100 pl-11 pr-3 outline-none transition focus:bg-white ${
                    emailTouched &&
                    !emailIsValid
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-transparent focus:border-[#3120FF]'
                  }`}
                />
              </span>

              {emailTouched &&
                email.trim() &&
                !emailIsValid && (
                <span className="mt-1.5 block text-xs text-red-600">
                  Enter a valid email address.
                </span>
              )}

              {!isLogin &&
                emailTouched &&
                emailIsValid &&
                email.trim() && (
                <span className="mt-1.5 block text-xs text-zinc-500">
                  You can use Runtime immediately. We will send a verification link to confirm that you own this email address.
                </span>
              )}
            </label>

            <label className="block text-sm font-medium text-zinc-800">
              Password

              <span className="relative mt-2 block">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete={
                    isLogin
                      ? 'current-password'
                      : 'new-password'
                  }
                  className="h-11 w-full rounded-xl border border-transparent bg-zinc-100 pl-11 pr-11 outline-none transition focus:border-[#3120FF] focus:bg-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className="absolute right-2 top-1 h-9 w-9 rounded-lg text-zinc-500 hover:text-zinc-950"
                >
                  {showPassword ? (
                    <EyeOff className="mx-auto h-5 w-5" />
                  ) : (
                    <Eye className="mx-auto h-5 w-5" />
                  )}
                </button>
              </span>
            </label>

            {isLogin && (
              <div className="flex justify-end text-sm">
                <button
                  type="button"
                  onClick={forgotPassword}
                  disabled={
                    loading ||
                    resetEmailSent
                  }
                  className="font-semibold text-[#3120FF] hover:underline disabled:cursor-default disabled:text-zinc-400 disabled:no-underline"
                >
                  {resetEmailSent
                    ? 'Reset email sent'
                    : 'Forgot password?'}
                </button>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="text-sm text-red-600"
              >
                {error}
              </p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="h-11 w-full rounded-xl bg-[#3120FF] text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : isLogin
                  ? 'Sign in'
                  : 'Create account'}
            </button>

            <button
              disabled={loading}
              type="button"
              onClick={googleSignIn}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Sign in with Google
            </button>
          </form>

          <Link
            to="/"
            className="mt-5 block min-h-11 py-3 text-center text-sm font-semibold text-[#3120FF] hover:underline"
          >
            Continue without an account
          </Link>

          <p className="mt-3 text-center text-sm text-zinc-500">
            {isLogin
              ? 'New to Runtime?'
              : 'Already have an account?'}{' '}
            <Link
              to={
                isLogin
                  ? '/register'
                  : '/login'
              }
              className="font-semibold text-[#3120FF] hover:underline"
            >
              {isLogin
                ? 'Create an account'
                : 'Sign in'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};