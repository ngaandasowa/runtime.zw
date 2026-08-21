import React from 'react';
import { Link } from 'react-router-dom';

interface LegalPageProps {
  type: 'terms' | 'privacy';
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-t border-zinc-200 pt-8">
    <h2 className="text-lg font-bold text-zinc-950">{title}</h2>
    <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">{children}</div>
  </section>
);

export const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  const isTerms = type === 'terms';

  return (
    <article className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12">
          <Link to="/" className="text-sm font-semibold text-[#3120ff] hover:underline">Runtime</Link>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
            {isTerms ? 'Terms of Service' : 'Privacy Policy'}
          </h1>
          <p className="mt-4 text-sm text-zinc-500">Last updated: August 21, 2026</p>
          <p className="mt-6 text-base leading-7 text-zinc-600">
            {isTerms
              ? 'These terms explain the rules for using Runtime domain registration and related services.'
              : 'This policy explains what information Runtime collects, why we use it, and the choices available to you.'}
          </p>
        </div>

        <div className="space-y-8">
          {isTerms ? (
            <>
              <Section title="1. Using Runtime"><p>Runtime provides domain search, registration, renewal, transfer, account, and payment services. You must provide accurate information and keep your account details current.</p><p>You must be at least 18 years old, or use Runtime with the involvement and permission of a parent, guardian, or authorised organisation representative.</p></Section>
              <Section title="2. Accounts and security"><p>You are responsible for protecting your sign-in credentials and for activity performed through your account. Contact us promptly if you believe your account has been accessed without permission.</p><p>We may suspend access when necessary to protect users, investigate misuse, or comply with applicable requirements.</p></Section>
              <Section title="3. Domain registrations"><p>Domain names are registered subject to the rules and availability of the relevant domain authority. A search result does not guarantee that a name can be registered until payment and registration processing are complete.</p><p>You confirm that your requested domain and submitted contact information do not infringe another person’s rights or violate applicable law.</p></Section>
              <Section title="4. Prices and payments"><p>Prices are shown before checkout and may vary by domain extension. Registration and renewal prices are charged in the currency shown at checkout. You authorise Runtime and its payment providers to process the selected payment.</p><p>Because domain registration can begin immediately after payment, refunds may be limited once a registration or renewal has been submitted.</p></Section>
              <Section title="5. Acceptable use"><p>You may not use Runtime to register or manage domains for unlawful activity, fraud, abuse, malware, impersonation, infringement, or activity that could harm the service or other users.</p></Section>
              <Section title="6. Availability and liability"><p>We work to keep Runtime available, but we do not guarantee uninterrupted access or successful registration of every requested domain. Services may be changed, paused, or unavailable for maintenance or circumstances outside our control.</p><p>To the extent permitted by law, Runtime is not responsible for indirect losses, lost profits, or losses caused by inaccurate information supplied by you.</p></Section>
              <Section title="7. Contact"><p>Questions about these terms can be sent to <a className="font-semibold text-[#3120ff] hover:underline" href="tel:+263788350229">+263 788 350 229</a> or through <a className="font-semibold text-[#3120ff] hover:underline" href="https://wa.me/263788350229">WhatsApp</a>.</p></Section>
            </>
          ) : (
            <>
              <Section title="1. Information we collect"><p>We collect information you provide when you create an account, search for or register a domain, contact support, or make a payment. This may include your name, email address, phone number, organisation, domain contact details, payment references, and account activity.</p><p>Firebase Authentication may process your email address, password credentials, and Google account information when you use those sign-in methods.</p></Section>
              <Section title="2. How we use information"><p>We use information to provide and secure domain services, process payments, manage your account, respond to support requests, prevent fraud, maintain records, and communicate service-related updates.</p><p>We do not sell your personal information.</p></Section>
              <Section title="3. Service providers"><p>We may share the information needed to provide a service with providers such as Firebase for authentication, payment processors for checkout, hosting providers, and domain authorities involved in registration and management.</p><p>These providers may process information according to their own privacy policies and contractual obligations.</p></Section>
              <Section title="4. Cookies and local storage"><p>Runtime may use browser storage for authentication state, preferences, and locally displayed account data. Essential storage helps the application remember your session and complete requested workflows.</p></Section>
              <Section title="5. Retention and security"><p>We retain information for as long as needed to provide services, meet legal and financial obligations, resolve disputes, and enforce agreements. We use reasonable administrative and technical safeguards, but no online service can guarantee absolute security.</p></Section>
              <Section title="6. Your choices"><p>You may request access to, correction of, or deletion of personal information associated with your account, subject to records we must retain. You can also stop using the service and contact us about privacy questions.</p></Section>
              <Section title="7. Contact"><p>For privacy requests, contact Runtime at <a className="font-semibold text-[#3120ff] hover:underline" href="tel:+263788350229">+263 788 350 229</a> or through <a className="font-semibold text-[#3120ff] hover:underline" href="https://wa.me/263788350229">WhatsApp</a>.</p></Section>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
