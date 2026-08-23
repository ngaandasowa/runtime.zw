import React from 'react';

import {
  Cloud,
  Code2,
  Database,
  FileText,
  Sparkles,
} from 'lucide-react';

import {
  useNavigate,
} from 'react-router-dom';

import SpotlightCard from '../SpotlightCard';

const services = [
  {
    title:
      'Cloud hosting',

    description:
      'Deploy and run applications on Runtime.',

    icon:
      Cloud,

    service:
      'cloud',
  },

  {
    title:
      'API services',

    description:
      'Connect your products with reliable APIs.',

    icon:
      Code2,

    service:
      'api',
  },

  {
    title:
      'Data services',

    description:
      'Store and manage application data.',

    icon:
      Database,

    service:
      'data',
  },

  {
    title:
      'Developer tools',

    description:
      'Tools for building and shipping software.',

    icon:
      FileText,

    service:
      'developer',
  },

  {
    title:
      'AI and automation',

    description:
      'Build intelligent workflows and products.',

    icon:
      Sparkles,

    service:
      'ai',
  },
] as const;

export const PlatformModules:
  React.FC = () => {
    const navigate =
      useNavigate();

    const openService = (
      service: string
    ) => {
      navigate(
        `/coming-soon?service=${service}`
      );

      requestAnimationFrame(
        () => {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto',
          });
        }
      );
    };

    return (
      <section
        id="coming-soon"
        className="
          border-b
          border-zinc-200
          bg-white
          px-4
          py-16
          sm:px-6
          lg:px-8
          lg:py-24
        "
      >
        <div className="mx-auto max-w-6xl">

          {/* HEADER */}
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#3120ff]">
              Coming soon
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              More tools are on the way.
            </h2>

            <p className="mt-4 leading-7 text-zinc-600">
              Domains are available now.
              Hosting, APIs, data,
              developer tools and
              automation will be added
              as Runtime grows.
            </p>
          </div>

          {/* SERVICES */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {services.map(
              ({
                title,
                description,
                icon: Icon,
                service,
              }) => (
                <button
                  key={
                    service
                  }
                  type="button"
                  onClick={() =>
                    openService(
                      service
                    )
                  }
                  className="
                    group
                    text-left
                    outline-none
                  "
                >
                  <SpotlightCard
                    spotlightColor="rgba(49, 32, 255, 0.12)"
                    className="
                      h-full
                      min-h-58.75
                      p-5
                      transition-all
                      duration-300

                      hover:border-[#3120ff]/30
                      hover:shadow-lg
                      hover:shadow-[#3120ff]/5

                      focus-visible:border-[#3120ff]
                      focus-visible:ring-2
                      focus-visible:ring-[#3120ff]/15
                    "
                  >
                    <div className="flex h-full flex-col">

                      <div
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-zinc-200
                          bg-white
                          text-zinc-500
                          shadow-sm
                          transition-colors

                          group-hover:border-[#3120ff]/20
                          group-hover:text-[#3120ff]
                        "
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <h3 className="mt-5 font-semibold text-zinc-950">
                        {title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        {description}
                      </p>

                      <div className="mt-auto pt-5">
                        <span
                          className="
                            inline-flex
                            rounded-full
                            border
                            border-zinc-200
                            bg-white
                            px-2.5
                            py-1
                            text-[11px]
                            font-semibold
                            text-zinc-400
                            transition-colors

                            group-hover:border-[#3120ff]/20
                            group-hover:text-[#3120ff]
                          "
                        >
                          Coming soon
                        </span>
                      </div>

                    </div>
                  </SpotlightCard>
                </button>
              )
            )}
          </div>
        </div>
      </section>
    );
  };