import React from 'react';

import {
  ArrowLeft,
  Bell,
  Braces,
  Cloud,
  Database,
  Sparkles,
  Wrench,
} from 'lucide-react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

type ServiceConfig = {
  title: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
};

const SERVICES: Record<
  string,
  ServiceConfig
> = {
  cloud: {
    title: 'Cloud Hosting',
    description:
      'Simple cloud infrastructure for deploying and running your applications.',
    icon: Cloud,
  },

  api: {
    title: 'API Services',
    description:
      'Developer-friendly APIs designed to connect services and simplify your builds.',
    icon: Braces,
  },

  data: {
    title: 'Data Services',
    description:
      'Tools for storing, managing and working with application data.',
    icon: Database,
  },

  developer: {
    title: 'Developer Tools',
    description:
      'Practical tools built to make development and deployment easier.',
    icon: Wrench,
  },

  ai: {
    title: 'AI & Automation',
    description:
      'Simple AI and automation tools for modern digital workflows.',
    icon: Sparkles,
  },
};

export const ComingSoon: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const params =
    new URLSearchParams(
      location.search
    );

  const serviceKey =
    params.get('service') ||
    'cloud';

  const service =
    SERVICES[serviceKey] ||
    SERVICES.cloud;

  const Icon =
    service.icon;

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center bg-[linear-gradient(135deg,#f8f9ff_0%,#ffffff_55%,#eef0ff_100%)] px-4 py-16 sm:px-6 lg:px-8">

      <div className="mx-auto w-full max-w-3xl text-center">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3120ff]/10 text-[#3120ff]">
          <Icon className="h-6 w-6" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#3120ff]">
          Coming Soon
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
          {service.title}
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-600">
          {service.description}
        </p>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-500">
          We’re building this service as part of the growing Runtime platform.
          Domain registration and management are already available today.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">

          <button
            type="button"
            onClick={() =>
              navigate(
                '/#domain-search'
              )
            }
            className="w-full rounded-xl bg-[#3120ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2819d9] sm:w-auto"
          >
            Search Domains
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('/')
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back Home
          </button>

        </div>

        <div className="mx-auto mt-10 flex max-w-md items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm">

          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#3120ff]" />

          <p className="text-xs leading-5 text-zinc-500">
            New Runtime services will be announced as they become available.
          </p>

        </div>

      </div>

    </main>
  );
};