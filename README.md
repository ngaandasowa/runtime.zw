# Runtime.co.zw

Runtime is a domain registration and DNS management platform. The public site supports domain discovery and registration, while authenticated customers manage domains, billing, transfers, nameservers and Runtime DNS from the dashboard. Runtime DNS is powered by Cloudflare.

## Technology stack

- Frontend: React 19, TypeScript, Vite, React Router and Tailwind CSS.
- Authentication/data: Firebase Authentication and Cloud Firestore.
- Backend: Node.js, Express and TypeScript using Firebase Admin.
- Payments: PesePay integration plus Runtime wallet/credit flows implemented by the backend.
- Transactional email: Resend.
- Runtime DNS: Cloudflare API.
- Production architecture represented by the current project: Vercel frontend (`vercel.json`) and a continuously running Express API suitable for Render. Backend schedulers run in the Express process.

## Project layout

- `src/` — browser application, public pages, authentication, customer/admin dashboards and frontend service/repository code.
- `src/components/SEO.tsx` — route-aware metadata, canonical, robots, social metadata and JSON-LD.
- `src/pages/SeoLandingPages.tsx` — public domain/DNS landing pages.
- `src/pages/guides/` — useful public DNS/domain guides.
- `backend/routes/` — authenticated and public API routes.
- `backend/services/` — payment settlement, fulfillment, renewal, cleanup and Cloudflare DNS workflows.
- `backend/email/` — Resend transport, templates and event-driven email service.
- `public/robots.txt` and `public/sitemap.xml` — crawl controls and public URL discovery.
- `scripts/generate-seo-pages.mjs` — creates route-specific static HTML shells after Vite builds so public routes have correct initial title, description, canonical and social metadata before JavaScript runs.

## Environment variables

Copy `.env.example` and fill values locally or in the deployment provider. Never commit service-account JSON, API tokens, encryption keys or payment credentials.

Frontend Firebase variables are `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` and `VITE_FIREBASE_APP_ID`. The frontend API base can be configured with `VITE_API_BASE_URL` / `VITE_API_URL` as used by the service modules.

The backend uses `FIREBASE_SERVICE_ACCOUNT`, `PESEPAY_INTEGRATION_KEY`, `PESEPAY_ENCRYPTION_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `RESEND_API_KEY`, `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL`, `ADMIN_NOTIFICATION_EMAIL`, `RUNTIME_FRONTEND_URL`, `RUNTIME_API_URL` and `PORT` where referenced by the code.

For local-only development, `backend/firebaseAdmin.ts` can also read `backend/firebase-service-account.json`; that file is ignored by Git and must never be distributed or committed.

## Local development

```bash
npm install
npm run dev
```

Run the API separately:

```bash
npm run dev:backend
```

The Vite dev server defaults to port 3000 and the Express backend defaults to port 4000. Configure the frontend API URL to point at the local backend.

Static checks and production builds:

```bash
npm run lint
npm run build
npm run build:backend
```

`npm run build` runs Vite and then generates route-specific HTML shells for indexable public pages.

## Deployment architecture

The frontend is a Vite static application deployed with Vercel configuration in `vercel.json`. The backend is a separate Express service. CORS currently allows local development plus `runtime.co.zw` and `www.runtime.co.zw`. The Express process starts abandoned-order cleanup, Runtime DNS activation and renewal lifecycle schedulers, so production hosting must support a continuously running Node process.

Firebase Authentication handles user identity. Firestore is the operational datastore used by frontend repositories and backend services. Backend routes authenticate Firebase tokens and load Runtime user profiles before protected operations.

## Domain registration and payment lifecycle

Domain checkout creates order/payment state in Firestore. PesePay credentials and encryption are server-side. PesePay settlement verifies provider status on the backend; browser status is not treated as authoritative. Payment settlement and credit/wallet payment services then call order fulfillment logic. Domain registration fulfillment creates or updates the purchased domain resource and preserves idempotency so the same paid transaction is not fulfilled twice.

Zimbabwe registry processing is represented by `processing_type: 'zispa'` and registry request records where applicable. `registry_requests` are durable operational jobs used for registration/nameserver workflows. Admin tooling controls registry status and confirmation. Do not bypass registry confirmation by marking pending nameserver changes active in browser code.

## ZISPA / registry workflow

The source contains ZISPA template generation and registry-request persistence. `.co.zw` is treated as a ZISPA-managed domain in the DNS migration workflow. Nameserver modifications preserve the currently active delegation until the registry operation is confirmed. Pending nameservers are stored separately and become authoritative only after the workflow verifies completion.

`src/services/RegistryTemplateService.ts` currently contains Ngaatec registrar identity/contact details used to generate ZISPA templates. Those values are registrar identity data; they are **not Runtime DNS nameservers** and must not be repurposed as DNS defaults.

## Runtime DNS and Cloudflare

Runtime DNS means a domain whose DNS is managed through Runtime's Cloudflare integration. Cloudflare creates/reuses a zone and returns the authoritative nameservers assigned to that individual zone. There is no fixed Runtime nameserver pair.

Key invariants implemented in the backend:

- A domain is provisioned into Runtime DNS only when Runtime/Cloudflare DNS was explicitly selected.
- Existing domains on other nameservers are Custom DNS and are not silently migrated.
- A Custom DNS → Runtime DNS migration creates/reuses a Cloudflare zone, scans records, lets the customer review/import records, and only then creates the registry/nameserver-change workflow.
- During migration, the old delegation remains active until the new delegation is confirmed.
- Runtime DNS activation/reconciliation requires Cloudflare state and delegation checks; Cloudflare zone existence alone is not sufficient to overwrite Custom DNS state.
- DNS record management is performed against the Cloudflare zone ID associated with the owned domain.

These rules are safety-critical because changing authoritative nameservers can interrupt websites and email.

## Custom DNS

Any domain using nameservers outside its Runtime-managed Cloudflare zone is Custom DNS. Runtime should display and preserve those nameservers. Do not infer Runtime DNS from a hostname pattern and do not replace existing custom nameservers automatically.

## Transfers

Transfer routes live in `backend/routes/transfers.ts`. The workflow collects transfer/domain details, enforces ownership/authorization checks and supports the additional owner information needed for ZISPA-managed domains. Keep transfer processing separate from DNS migration: a transfer must not silently opt a domain into Runtime DNS.

## Renewals

`RenewalLifecycleService` scans active/expired domains with expiry dates and records lifecycle milestones idempotently. The implemented sequence sends 60-day and 30-day reminders, creates a renewal order at 14 days, sends an unpaid reminder at 7 days, marks the domain expired at expiry, and marks the seven-day grace period ended if still unpaid. Paid renewal fulfillment extends the domain and starts a new lifecycle cycle. Scheduler behavior depends on the backend process remaining online.

## Transactional email

`backend/email/mailer.ts` sends through Resend. `emailService` maps application events to templates for registration, payment, renewal, DNS and other workflows. Sender identity comes from `MAIL_FROM_NAME` and `MAIL_FROM_EMAIL`. Email failure must not erase durable registry/payment/DNS state; operational state should be persisted before notifications where the workflow requires it.

## SEO architecture

Public SEO is intentionally small and task-focused. Indexable routes include the homepage, domains, `.co.zw`, DNS, pricing, WHOIS, guides, contact and legal pages. Authentication, dashboard and coming-soon routes are `noindex` and excluded from the sitemap.

`SEO.tsx` updates per-route title, description, canonical URL, robots directives, Open Graph/Twitter metadata and appropriate JSON-LD. The home page uses Organization/WebSite data; service pages use Service data; hierarchy pages use BreadcrumbList; guide pages use Article plus breadcrumbs. Structured data must describe visible page content and must not invent reviews, ratings or unsupported claims.

Because Runtime is a React/Vite SPA, the production build also runs `scripts/generate-seo-pages.mjs`. It creates route-specific static HTML entry shells with correct initial metadata for public routes. The rendered page content still comes from React. `public/sitemap.xml` is maintained as the canonical list of indexable public URLs and `public/robots.txt` blocks private/non-search routes.

### Adding a public SEO page or guide

1. Add a useful page with unique, substantial user-facing content and a single clear `h1`.
2. Add its React route in `src/App.tsx`.
3. Add route metadata and only accurate structured data in `src/components/SEO.tsx`.
4. Add the route to `public/sitemap.xml` if it should be indexed.
5. Add the route metadata to `scripts/generate-seo-pages.mjs` so the initial HTML shell is correct.
6. Add contextual internal links from relevant public pages; do not create isolated pages solely to target keywords.
7. Run lint and both frontend/backend builds.

A blog is not currently part of the project. Add one only when Runtime has a sustainable stream of genuinely useful, maintained content; do not generate thin SEO pages.

## Developer safety rules

- Never commit Firebase service-account JSON, Cloudflare tokens, PesePay keys, Resend keys or other secrets.
- Never describe old fixed Ngaatec nameservers as Runtime DNS. Runtime DNS is Cloudflare-based and nameservers are assigned per zone.
- Never automatically migrate Custom DNS domains to Runtime DNS.
- Never overwrite active delegation while a registry nameserver change is pending.
- Never trust browser-reported payment success; settlement is backend/provider verified.
- Preserve idempotency around payment settlement, fulfillment, renewals and scheduled lifecycle work.
- Keep customer ownership/authorization checks on domain, DNS, transfer and billing operations.
- Treat registrar identity in ZISPA templates separately from DNS architecture.
