import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ChevronDown,
  CreditCard,
} from 'lucide-react';

import {
  FaWhatsapp,
} from 'react-icons/fa';

import {
  useNavigate,
} from 'react-router-dom';

import runtimeLogo from '../assets/runtime-logo.svg';

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
          grid overflow-hidden transition-all duration-300
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

export const Footer: React.FC = () => {
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
   * Close accordion when switching
   * from mobile to desktop.
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
        setOpenSection(null);
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
   * Close mobile accordion when
   * footer navigation leaves viewport.
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
            setOpenSection(null);
          }
        },
        {
          threshold: 0,
        }
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  /*
   * Navigate to a normal page
   * and start that page from the top.
   *
   * This also works when the user
   * clicks the link for the page they
   * are already viewing.
   */
  const goToPage = (
    path: string
  ) => {
    setOpenSection(null);

    navigate(path);

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
   * Homepage domain search.
   *
   * This intentionally scrolls to the
   * domain search instead of page top.
   */
  const goToDomainSearch =
    () => {
      setOpenSection(null);

      navigate(
        '/#domain-search'
      );

      window.setTimeout(
        () => {
          document
            .getElementById(
              'domain-search'
            )
            ?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
        },
        100
      );
    };

  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* NAVIGATION */}
        <div
          ref={navigationRef}
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
            <button
              type="button"
              onClick={() =>
                goToPage(
                  '/coming-soon?service=cloud'
                )
              }
              className="block w-full text-left transition-colors hover:text-[#3120ff]"
            >
              Cloud Hosting
            </button>

            <button
              type="button"
              onClick={() =>
                goToPage(
                  '/coming-soon?service=api'
                )
              }
              className="block w-full text-left transition-colors hover:text-[#3120ff]"
            >
              API Services
            </button>

            <button
              type="button"
              onClick={() =>
                goToPage(
                  '/coming-soon?service=data'
                )
              }
              className="block w-full text-left transition-colors hover:text-[#3120ff]"
            >
              Data Services
            </button>

            <button
              type="button"
              onClick={() =>
                goToPage(
                  '/coming-soon?service=developer'
                )
              }
              className="block w-full text-left transition-colors hover:text-[#3120ff]"
            >
              Developer Tools
            </button>

            <button
              type="button"
              onClick={() =>
                goToPage(
                  '/coming-soon?service=ai'
                )
              }
              className="block w-full text-left transition-colors hover:text-[#3120ff]"
            >
              AI & Automation
            </button>
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
                setOpenSection(null)
              }
              className="flex items-center gap-2 transition-colors hover:text-[#3120ff]"
            >
              <FaWhatsapp className="h-4 w-4" />

              WhatsApp
            </a>
          </FooterSection>
        </div>

        {/* PAYMENT + SPECIAL OFFERS */}
        <div className="grid gap-8 py-8 md:grid-cols-2 md:gap-12 lg:gap-20 lg:border-t lg:border-zinc-200 lg:py-10">

          {/* PAYMENT */}
          <div>
            <h3 className="font-semibold text-zinc-950">
              Payment Options
            </h3>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700">
                <CreditCard className="h-4 w-4" />
                EcoCash
              </div>
            </div>
          </div>

          {/* WHATSAPP OFFERS */}
          <div>
            <h3 className="font-semibold text-zinc-950">
              Special Offers
            </h3>

            <p className="mt-4 text-sm text-zinc-500">
              Join our WhatsApp group for special offers.
            </p>

            <a
              href="https://chat.whatsapp.com/F3yFxX2jtekIIGKkfYQP4N?s=sw&p=a&mlu=4"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#3120ff] transition-colors hover:text-[#2819d9]"
            >
              <FaWhatsapp className="h-5 w-5" />

              Join WhatsApp Group
            </a>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="flex flex-col gap-4 border-t border-zinc-200 py-7 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">

          <button
            type="button"
            onClick={() =>
              goToPage('/')
            }
            aria-label="Runtime home"
            className="flex w-fit items-center"
          >
            <img
              src={runtimeLogo}
              alt="Runtime"
              className="h-7 w-auto"
            />
          </button>

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