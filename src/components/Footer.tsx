import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ChevronDown,
  CreditCard,
  MessageCircle,
  Server,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

type FooterSectionProps = {
  id: string;
  title: string;
  openSection: string | null;
  setOpenSection: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  children: React.ReactNode;
};

const FooterSection: React.FC<
  FooterSectionProps
> = ({
  id,
  title,
  openSection,
  setOpenSection,
  children,
}) => {
  const isOpen =
    openSection === id;

  const toggle = () => {
    setOpenSection((current) =>
      current === id
        ? null
        : id
    );
  };

  return (
    <div className="border-b border-zinc-200 lg:border-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between py-5 text-left font-semibold text-zinc-950 lg:pointer-events-none lg:py-0"
      >
        {title}

        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 lg:hidden ${
            isOpen
              ? 'rotate-180'
              : ''
          }`}
        />
      </button>

      <div
        className={`
          grid
          overflow-hidden
          transition-all
          duration-300
          ${
            isOpen
              ? 'grid-rows-[1fr] pb-5 opacity-100'
              : 'grid-rows-[0fr] opacity-0'
          }
          lg:mt-5
          lg:block
          lg:pb-0
          lg:opacity-100
        `}
      >
        <div className="min-h-0">
          <div className="space-y-3 text-sm text-zinc-500">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Footer: React.FC =
  () => {
    const navigate =
      useNavigate();

    const [
      openSection,
      setOpenSection,
    ] = useState<
      string | null
    >(null);

    const navigationRef =
      useRef<HTMLDivElement>(
        null
      );

    /*
     * ----------------------------------------------------------
     * CLOSE MOBILE ACCORDION WHEN SWITCHING TO DESKTOP
     * ----------------------------------------------------------
     */

    useEffect(() => {
      const media =
        window.matchMedia(
          '(min-width: 1024px)'
        );

      const handleChange = (
        event:
          | MediaQueryListEvent
          | MediaQueryList
      ) => {
        if (event.matches) {
          setOpenSection(
            null
          );
        }
      };

      handleChange(media);

      media.addEventListener(
        'change',
        handleChange
      );

      return () => {
        media.removeEventListener(
          'change',
          handleChange
        );
      };
    }, []);

    /*
     * ----------------------------------------------------------
     * CLOSE MOBILE ACCORDION WHEN FOOTER NAV LEAVES VIEW
     * ----------------------------------------------------------
     */

    useEffect(() => {
      const element =
        navigationRef.current;

      if (!element) {
        return;
      }

      const observer =
        new IntersectionObserver(
          ([entry]) => {
            if (
              !entry.isIntersecting
            ) {
              setOpenSection(
                null
              );
            }
          },
          {
            threshold: 0,
          }
        );

      observer.observe(
        element
      );

      return () => {
        observer.disconnect();
      };
    }, []);

    /*
     * ----------------------------------------------------------
     * NORMAL INTERNAL PAGE NAVIGATION
     *
     * This handles BOTH:
     *
     * /whois -> /contact
     *
     * and:
     *
     * /contact -> /contact
     *
     * The page always returns to the top.
     * ----------------------------------------------------------
     */

    const goToPage = (
      path: string
    ) => {
      setOpenSection(null);

      navigate(path);

      /*
       * We explicitly reset scroll here because
       * clicking the same route does not create
       * a pathname change for your App useEffect.
       */
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

    /*
     * ----------------------------------------------------------
     * DOMAIN SEARCH
     * ----------------------------------------------------------
     */

    const goToDomainSearch =
      () => {
        setOpenSection(null);

        navigate(
          '/#domain-search'
        );

        /*
         * Your App.tsx also handles hash scrolling.
         *
         * This fallback means it still works if the
         * user is already on the homepage.
         */
        window.setTimeout(
          () => {
            document
              .getElementById(
                'domain-search'
              )
              ?.scrollIntoView(
                {
                  behavior:
                    'smooth',
                  block:
                    'center',
                }
              );
          },
          50
        );
      };

    /*
     * ----------------------------------------------------------
     * PLACEHOLDER TOOL LINKS
     * ----------------------------------------------------------
     *
     * For now we prevent "#" from jumping the page.
     */

    const placeholderLink =
      (
        event: React.MouseEvent
      ) => {
        event.preventDefault();

        setOpenSection(null);
      };

    return (
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* NAVIGATION */}
          <div
            ref={
              navigationRef
            }
            className="py-4 lg:grid lg:grid-cols-4 lg:gap-14 lg:py-14"
          >

            {/* DOMAINS */}
            <FooterSection
              id="domains"
              title="Domains"
              openSection={
                openSection
              }
              setOpenSection={
                setOpenSection
              }
            >
              <button
                type="button"
                onClick={
                  goToDomainSearch
                }
                className="block w-full text-left transition-colors hover:text-[#3120ff]"
              >
                Domain Search
              </button>

              <button
                type="button"
                onClick={() =>
                  goToPage(
                    '/domain-pricing'
                  )
                }
                className="block w-full text-left transition-colors hover:text-[#3120ff]"
              >
                Domain Pricing
              </button>

              <button
                type="button"
                onClick={() =>
                  goToPage(
                    '/whois'
                  )
                }
                className="block w-full text-left transition-colors hover:text-[#3120ff]"
              >
                WHOIS Lookup
              </button>
            </FooterSection>

            {/* TOOLS */}
            <FooterSection
              id="tools"
              title="Tools"
              openSection={
                openSection
              }
              setOpenSection={
                setOpenSection
              }
            >
              <a
                href="#"
                onClick={
                  placeholderLink
                }
                className="block transition-colors hover:text-[#3120ff]"
              >
                Cloud hosting
              </a>

              <a
                href="#"
                onClick={
                  placeholderLink
                }
                className="block transition-colors hover:text-[#3120ff]"
              >
                API services
              </a>

              <a
                href="#"
                onClick={
                  placeholderLink
                }
                className="block transition-colors hover:text-[#3120ff]"
              >
                Data services
              </a>

              <a
                href="#"
                onClick={
                  placeholderLink
                }
                className="block transition-colors hover:text-[#3120ff]"
              >
                Developer tools
              </a>

              <a
                href="#"
                onClick={
                  placeholderLink
                }
                className="block transition-colors hover:text-[#3120ff]"
              >
                AI and automation
              </a>
            </FooterSection>

            {/* ABOUT */}
            <FooterSection
              id="about"
              title="About"
              openSection={
                openSection
              }
              setOpenSection={
                setOpenSection
              }
            >
              <button
                type="button"
                onClick={() =>
                  goToPage(
                    '/about'
                  )
                }
                className="block w-full text-left transition-colors hover:text-[#3120ff]"
              >
                About Runtime
              </button>

              <button
                type="button"
                onClick={() =>
                  goToPage(
                    '/terms'
                  )
                }
                className="block w-full text-left transition-colors hover:text-[#3120ff]"
              >
                Terms & Conditions
              </button>

              <button
                type="button"
                onClick={() =>
                  goToPage(
                    '/privacy'
                  )
                }
                className="block w-full text-left transition-colors hover:text-[#3120ff]"
              >
                Privacy Policy
              </button>
            </FooterSection>

            {/* CUSTOMER SERVICES */}
            <FooterSection
              id="support"
              title="Customer Services"
              openSection={
                openSection
              }
              setOpenSection={
                setOpenSection
              }
            >
              <button
                type="button"
                onClick={() =>
                  goToPage(
                    '/contact'
                  )
                }
                className="block w-full text-left transition-colors hover:text-[#3120ff]"
              >
                Contact Us
              </button>

              <a
                href="https://wa.me/263788350229"
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  setOpenSection(
                    null
                  )
                }
                className="flex items-center gap-2 transition-colors hover:text-[#3120ff]"
              >
                <FaWhatsapp className="h-4 w-4" />

                WhatsApp
              </a>
            </FooterSection>
          </div>

          {/* PAYMENT + REGISTRY */}
          <div className="grid gap-10 border-t border-zinc-200 py-9 md:grid-cols-2 lg:gap-20 lg:py-10">

            {/* PAYMENT METHODS */}
            <div>
              <h3 className="font-semibold text-zinc-950">
                Payment Methods
              </h3>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  'Visa',
                  'Mastercard',
                  'EcoCash',
                  'Bank Transfer',
                ].map(
                  (method) => (
                    <div
                      key={
                        method
                      }
                      className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700"
                    >
                      <CreditCard className="h-4 w-4" />

                      {method}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* ZISPA */}
            <div>
              <h3 className="font-semibold text-zinc-950">
                ZISPA Registry
              </h3>

              <div className="mt-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3120ff] text-white">
                  <Server className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-medium text-zinc-950">
                    .co.zw Domain Registrar
                  </p>

                  <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">
                    Domain registration services connected to the Zimbabwe .co.zw registry.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM */}
          <div className="flex flex-col gap-4 border-t border-zinc-200 py-7 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3120ff] text-white">
                <Server className="h-4 w-4" />
              </span>

              <span className="font-semibold text-zinc-950">
                Runtime
              </span>
            </div>

            <p>
              ©{' '}
              {new Date().getFullYear()}{' '}
              Runtime. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  };