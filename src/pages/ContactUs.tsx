import React, {
  useEffect,
} from 'react';
import { Mail } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

import {
  analyticsService,
} from '../services/AnalyticsService';

export const ContactUs: React.FC = () => {
  const whatsappNumber = '263788350229';

  useEffect(() => {
    analyticsService.trackPageView(
      'Contact Us'
    );
  }, []);

  return (
    <div className="bg-white">
      <section
        className="
          relative
          flex
          min-h-[calc(100vh-4rem)]
          items-center
          overflow-hidden
          bg-[linear-gradient(135deg,#f8f9ff_0%,#ffffff_55%,#eef0ff_100%)]
          px-4
          sm:px-6
          lg:px-8
        "
      >
        <div
          className="
            mx-auto
            grid
            w-full
            max-w-6xl
            items-center
            gap-12
            py-12
            lg:grid-cols-2
            lg:gap-20
            lg:py-16
          "
        >

          {/* LEFT CONTENT */}
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            <p className="text-sm font-semibold text-[#3120ff]">
              Support
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              Contact us
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-zinc-600 lg:mx-0">
              If you have any questions or need some help, email us at{' '}
              <a
                href="mailto:support@runtime.co.zw"
                className="font-semibold text-[#3120ff] hover:underline"
              >
                support@runtime.co.zw
              </a>{' '}
              or message us on WhatsApp.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#3120ff]
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-white
                  transition-colors
                  hover:bg-[#2819d9]
                "
              >
                <FaWhatsapp  className="h-4 w-4" />
                Chat on WhatsApp
              </a>

              <a
                href="mailto:support@runtime.co.zw"
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-zinc-200
                  bg-white
                  px-5
                  py-3
                  text-sm
                  font-semibold
                  text-zinc-700
                  transition-colors
                  hover:bg-zinc-50
                  hover:text-zinc-950
                "
              >
                <Mail className="h-4 w-4" />
                Send an email
              </a>
            </div>
          </div>

          {/* RIGHT VISUAL */}
          <div className="relative flex items-center justify-center">

            {/* LARGE SOFT GLOW */}
            <div
              aria-hidden="true"
              className="
                absolute
                h-72
                w-72
                rounded-full
                bg-[#3120ff]/10
                blur-3xl
                sm:h-96
                sm:w-96
              "
            />

            <div className="relative">

              {/* OUTER GLOW */}
              <div
                aria-hidden="true"
                className="
                  absolute
                  inset-0
                  scale-[1.25]
                  rounded-full
                  bg-[#3120ff]/10
                  blur-2xl
                "
              />

              {/* MAIN CIRCLE */}
              <div
                className="
                  relative
                  flex
                  h-56
                  w-56
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-[#3120ff]/10
                  bg-white
                  shadow-[0_25px_80px_rgba(49,32,255,0.16)]
                  sm:h-72
                  sm:w-72
                "
              >
                <div
                  className="
                    flex
                    h-24
                    w-24
                    items-center
                    justify-center
                    rounded-full
                    bg-[#3120ff]
                    text-white
                    shadow-lg
                    sm:h-28
                    sm:w-28
                  "
                >
                  <FaWhatsapp  className="h-10 w-10 sm:h-12 sm:w-12" />
                </div>
              </div>

              {/* EMAIL BUBBLE */}
              <div
                className="
                  absolute
                  -right-5
                  top-12
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-zinc-200
                  bg-white
                  shadow-lg
                  sm:-right-8
                  sm:top-16
                "
              >
                <Mail className="h-5 w-5 text-[#3120ff]" />
              </div>

              {/* SMALL DARK BUBBLE */}
              <div
                className="
                  absolute
                  -bottom-7
                  left-4
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-zinc-950
                  text-white
                  shadow-lg
                  sm:-bottom-8
                  sm:left-8
                "
              >
                <FaWhatsapp  className="h-6 w-6" />
              </div>

            </div>
          </div>

        </div>
      </section>
    </div>
  );
};