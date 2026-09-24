# SEO and documentation update — 2026-09-24

## Audit findings

- SEO metadata existed, but it covered only the small original public route set and was applied primarily after React executed.
- The catch-all Vercel rewrite returned the SPA for every unknown URL, creating soft-404 risk on direct requests.
- Sitemap coverage was limited to the original public pages and did not provide a content architecture for domains, Runtime DNS or connection guides.
- The homepage had Organization/WebSite JSON-LD, but structured data was not route-specific and duplicated between the HTML template and runtime SEO code.
- Navigation sent “Domains” to a homepage hash rather than a dedicated crawlable hub; the footer “Runtime DNS” link incorrectly went to login and “About Runtime” pointed to a route that did not exist.
- Runtime had no focused public explanation of Cloudflare-backed Runtime DNS versus Custom DNS.
- Existing Railway documentation was obsolete relative to the current Vercel frontend / separate Express backend direction and used environment-variable names that do not match current code.
- The uploaded ZIP contained `backend/firebase-service-account.json` with a private service-account credential. It was already gitignored but should not be distributed in source archives.

## Implementation

- Added focused public routes: `/domains`, `/domains/co-zw`, `/dns`, `/guides`, and eight practical domain/DNS guides.
- Expanded route-aware titles, descriptions, canonicals, robots directives, Open Graph/Twitter metadata and JSON-LD.
- Added Organization, WebSite, Service, BreadcrumbList and Article schema where it matches visible content.
- Expanded `sitemap.xml` and retained private-route exclusions in `robots.txt`.
- Added post-build generation of route-specific HTML shells for indexable public routes so initial HTML carries the correct metadata before React executes.
- Replaced the Vercel catch-all rewrite with explicit SPA rewrites for private/app routes and a permanent `/pricing` → `/domain-pricing` redirect, allowing unknown direct URLs to return a real platform 404 instead of the homepage shell.
- Improved internal linking and fixed the incorrect footer DNS/broken About links.
- Added a complete README and `.env.example` derived from current source architecture.
- Removed obsolete Railway/debug documentation and removed the uploaded Firebase service-account JSON from the returned project.
- Preserved payment, registry, authentication, domain, transfer and DNS implementation code; SEO work did not rewrite those systems.

## Validation

- `vercel.json` and `package.json` parse as valid JSON.
- `public/sitemap.xml` parses as valid XML.
- `scripts/generate-seo-pages.mjs` passes `node --check`.
- A full dependency install/build could not be completed in this sandbox because `npm ci` exceeded the environment execution/network window. The first `npm run lint` attempt occurred before dependencies were installed and therefore reported missing packages/types rather than code-level validation. Run `npm ci && npm run lint && npm run build && npm run build:backend` in CI or a normal development environment before deployment.

## Security action required

The uploaded archive contained a Firebase Admin service-account private key. The returned ZIP removes that file, but the credential should be revoked/rotated in Firebase/Google Cloud because it has been copied outside the deployment secret store. Configure the replacement only through `FIREBASE_SERVICE_ACCOUNT` or a local ignored credential file.
