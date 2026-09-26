import { NextFunction, Request, Response, Router } from 'express';
import { adminDb } from '../firebaseAdmin.js';
import { authenticateWithProfile as authenticate } from '../middleware/authenticate.js';

const router = Router();
const collection = adminDb.collection('guides');
const SITE_URL = 'https://runtime.co.zw';

const BUILTIN_GUIDES = [
  {slug:'connect-domain-to-vercel',title:'How to connect a domain to Vercel',excerpt:'Connect a Runtime-managed domain to a Vercel project by adding the domain in Vercel first, then creating the DNS records Vercel gives you.',content:`## Add the domain in Vercel
Open the project in Vercel, add your custom domain, and note the DNS configuration Vercel requests.

## Open DNS management
If the domain uses Runtime DNS, open its Runtime DNS manager. If it uses Custom DNS, make the change with the DNS provider that hosts its authoritative nameservers.

## Create the requested records
Add the exact A, CNAME or other records Vercel provides. Do not guess record values, because Vercel may give different instructions depending on the domain and project.

## Verify in Vercel
Return to Vercel and verify the domain after DNS has propagated.`},
  {slug:'connect-domain-to-netlify',title:'How to connect a domain to Netlify',excerpt:'Add the domain to your Netlify site, then publish the DNS records Netlify specifies at the authoritative DNS provider.',content:`## Add the custom domain
In Netlify, add the domain to the site you want it to serve.

## Copy Netlify’s DNS instructions
Use the record names, types and values shown for your site.

## Add records in Runtime DNS or your provider
For Runtime DNS, add the records in the domain DNS manager. For Custom DNS, update them with your existing DNS provider.

## Check verification
Allow time for DNS changes to propagate, then confirm the domain status in Netlify.`},
  {slug:'connect-domain-to-render',title:'How to connect a domain to Render',excerpt:'Render custom domains are connected by adding the domain to your Render service and then publishing the DNS records Render requests.',content:`## Add your custom domain in Render
Open the relevant Render service and add the domain.

## Read the required DNS records
Render will show the record target needed for the service.

## Publish the records
Create those records in Runtime DNS, or at your current provider when the domain uses Custom DNS.

## Wait for verification
DNS propagation is not instant. Keep the records in place and check Render for verification and certificate status.`},
  {slug:'connect-domain-to-github-pages',title:'How to connect a domain to GitHub Pages',excerpt:'Use GitHub Pages custom-domain settings together with DNS records at the domain’s authoritative DNS provider.',content:`## Set the custom domain in GitHub
Open the repository Pages settings and enter the domain you want to use.

## Use GitHub’s current DNS values
Follow the DNS values shown in GitHub’s documentation or Pages settings for the apex domain or subdomain you are connecting.

## Add the records
Publish the records in Runtime DNS if Runtime manages the zone. Otherwise update your Custom DNS provider.

## Enable HTTPS when available
After GitHub verifies the DNS, enable HTTPS when the option becomes available.`},
  {slug:'connect-domain-to-firebase',title:'How to connect a domain to Firebase Hosting',excerpt:'Firebase Hosting verifies domain ownership and provides DNS records that must be published before the custom domain becomes active.',content:`## Add the domain in Firebase Hosting
Choose the Hosting site and start the custom-domain setup.

## Complete ownership verification
Firebase may request a TXT record. Add the exact verification record it provides.

## Add serving records
After verification, add the A, AAAA, CNAME or other records Firebase specifies for the domain.

## Keep records until provisioning completes
Certificate and DNS provisioning can take time. Check Firebase Hosting for the final status.`},
  {slug:'connect-domain-to-vps-hosting',title:'How to connect a domain to a VPS or hosting server',excerpt:'A domain can point directly to a server or use the nameservers supplied by a hosting provider. The correct option depends on how your hosting is configured.',content:`## Get the hosting details
Ask your host for the server IP address and any required DNS records, or for the authoritative nameservers if they manage DNS for you.

## Choose DNS management
To keep Runtime DNS, create the required A, AAAA, CNAME, MX and other records in Runtime. To let the host manage DNS, change the domain to the host’s nameservers as Custom DNS.

## Point the web records
An A record commonly points a hostname to an IPv4 address; an AAAA record points to IPv6. Use only the values supplied for your server.

## Configure the server too
DNS only directs traffic. Your web server or hosting panel must also be configured to accept the domain and provide HTTPS.`},
  {slug:'dns-records',title:'DNS records explained: A, AAAA, CNAME, MX, TXT and more',excerpt:'DNS records tell resolvers where services for a domain live. These are the record types you will most often see when connecting a domain.',content:`## A and AAAA
A points a hostname to an IPv4 address. AAAA does the same for an IPv6 address.

## CNAME
CNAME aliases one hostname to another hostname. Providers often use it for subdomains such as www.

## MX
MX records identify mail servers for a domain. Priority values matter when more than one MX record exists.

## TXT
TXT records carry text used for ownership verification and email authentication mechanisms such as SPF.

## NS
NS records identify authoritative nameservers. For Runtime DNS, Cloudflare assigns the nameservers for each individual zone.`},
  {slug:'register-co-zw-domain',title:'How to register a .co.zw domain with Runtime',excerpt:'Search for the name, complete the Runtime order and registrant details, then wait for the registry workflow to complete.',content:`## Search the domain
Use Runtime’s domain search to check whether the .co.zw name is available.

## Start registration
Choose the available domain and complete the required account and registrant information.

## Complete payment
Follow the checkout flow for the order. Runtime only treats a provider-confirmed payment as settled.

## Registry processing
The .co.zw registration is processed through the applicable ZISPA/registry workflow. Availability checks do not override registry rules or final processing.

## Choose DNS
After registration, use Runtime DNS powered by Cloudflare or configure Custom DNS nameservers for another provider.`},
];

const ensureBuiltinGuides = async () => {
  const marker = adminDb.collection('_runtime_meta').doc('guides_builtin_v1');
  if ((await marker.get()).exists) return;
  const now = new Date().toISOString();
  await Promise.all(BUILTIN_GUIDES.map(async g => {
    const ref = collection.doc(g.slug); const doc = await ref.get();
    if (doc.exists) return;
    await ref.set({...g,category:'Guides',featured_image:'',featured_image_alt:g.title,seo_title:`${g.title} | Runtime Guide`,meta_description:g.excerpt,author:'Runtime',status:'published',created_at:now,updated_at:now,published_at:now,views:0,useful_count:0,migrated_from_builtin:true});
  }));
  await marker.set({completed_at:now,count:BUILTIN_GUIDES.length});
};


const clean = (v: unknown) => String(v ?? '').trim();
const slugify = (v: unknown) => clean(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const isAdmin = (req: any) => req.runtimeUser?.role === 'super_admin';
const requireAdmin = (req: any, res: Response, next: NextFunction) => isAdmin(req) ? next() : res.status(403).json({success:false,message:'Super administrator permission required.'});
const serialize = (doc: FirebaseFirestore.DocumentSnapshot) => ({ id: doc.id, ...doc.data() });

router.get('/', async (req, res) => {
  try {
    await ensureBuiltinGuides();
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
    const snap = await collection.where('status', '==', 'published').limit(limit).get();
    const guides = snap.docs.map(serialize).sort((a:any,b:any)=>String(b.published_at||b.updated_at||'').localeCompare(String(a.published_at||a.updated_at||'')));
    res.json({success:true,guides});
  } catch (error:any) { res.status(500).json({success:false,message:error.message}); }
});

router.get('/admin/all', authenticate, requireAdmin, async (_req, res) => {
  try {
    await ensureBuiltinGuides();
    const snap = await collection.limit(200).get();
    const guides = snap.docs.map(serialize).sort((a:any,b:any)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
    res.json({success:true,guides});
  } catch (error:any) { res.status(500).json({success:false,message:error.message}); }
});

router.get('/sitemap.xml', async (_req, res) => {
  try {
    await ensureBuiltinGuides();
    const snap = await collection.where('status','==','published').limit(500).get();
    const dynamic = snap.docs.map(d=>d.data()).map((g:any)=>({loc:`${SITE_URL}/guides/${g.slug}`,lastmod:g.updated_at||g.published_at}));
    const fixed = ['','/domains','/domains/co-zw','/domain-pricing','/dns','/whois','/speed-test','/guides','/contact','/terms','/privacy'].map(path=>({loc:`${SITE_URL}${path}`,lastmod:null}));
    const seen=new Set<string>(); const rows=[...fixed,...dynamic].filter(x=>!seen.has(x.loc)&&seen.add(x.loc));
    const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.map(x=>`  <url><loc>${x.loc}</loc>${x.lastmod?`<lastmod>${String(x.lastmod).slice(0,10)}</lastmod>`:''}</url>`).join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (error:any) { res.status(500).type('text').send(error.message); }
});

router.get('/:slug', async (req, res, next) => {
  if (req.params.slug === 'render') return next();
  try {
    await ensureBuiltinGuides();
    const doc = await collection.doc(slugify(req.params.slug)).get();
    if (!doc.exists || doc.data()?.status !== 'published') return res.status(404).json({success:false,message:'Guide not found.'});
    res.json({success:true,guide:serialize(doc)});
  } catch (error:any) { res.status(500).json({success:false,message:error.message}); }
});

router.post('/:slug/view', async (req, res) => {
  try {
    await ensureBuiltinGuides(); const ref=collection.doc(slugify(req.params.slug));
    const result=await adminDb.runTransaction(async tx=>{const doc=await tx.get(ref);if(!doc.exists||doc.data()?.status!=='published') throw new Error('Guide not found.');const views=Number(doc.data()?.views||0)+1;tx.update(ref,{views});return views;});
    res.json({success:true,views:result});
  } catch(error:any){res.status(error.message==='Guide not found.'?404:500).json({success:false,message:error.message});}
});

router.post('/:slug/useful', async (req, res) => {
  try {
    await ensureBuiltinGuides(); const ref=collection.doc(slugify(req.params.slug));
    const result=await adminDb.runTransaction(async tx=>{const doc=await tx.get(ref);if(!doc.exists||doc.data()?.status!=='published') throw new Error('Guide not found.');const useful_count=Number(doc.data()?.useful_count||0)+1;tx.update(ref,{useful_count});return useful_count;});
    res.json({success:true,useful_count:result});
  } catch(error:any){res.status(error.message==='Guide not found.'?404:500).json({success:false,message:error.message});}
});

router.post('/admin', authenticate, requireAdmin, async (req:any, res) => {
  try {
    const title = clean(req.body.title); const slug = slugify(req.body.slug || title);
    if (!title || !slug) return res.status(400).json({success:false,message:'Title and slug are required.'});
    const now = new Date().toISOString(); const ref = collection.doc(slug); const old = await ref.get();
    const status = req.body.status === 'published' ? 'published' : 'draft';
    const guide = {
      title, slug, excerpt: clean(req.body.excerpt), content: clean(req.body.content), category: clean(req.body.category || 'Guides'),
      featured_image: clean(req.body.featured_image), featured_image_alt: clean(req.body.featured_image_alt || title),
      seo_title: clean(req.body.seo_title || `${title} | Runtime Guide`), meta_description: clean(req.body.meta_description || req.body.excerpt),
      author: clean(req.body.author || 'Runtime'), status, updated_at: now,
      created_at: old.exists ? old.data()?.created_at || now : now,
      published_at: status === 'published' ? old.data()?.published_at || now : old.data()?.published_at || null,
      updated_by: req.runtimeUser?.uid || null,
    };
    await ref.set(guide, {merge:true});
    res.json({success:true,guide:{id:slug,...guide}});
  } catch (error:any) { res.status(500).json({success:false,message:error.message}); }
});

router.delete('/admin/:slug', authenticate, requireAdmin, async (req, res) => {
  try { await collection.doc(slugify(req.params.slug)).delete(); res.json({success:true}); }
  catch (error:any) { res.status(500).json({success:false,message:error.message}); }
});

// Returns the SPA shell with database-backed metadata already present for social crawlers.
router.get('/render/:slug', async (req, res) => {
  try {
    await ensureBuiltinGuides();
    const slug = slugify(req.params.slug); const doc = await collection.doc(slug).get(); const data:any = doc.exists && doc.data()?.status === 'published' ? doc.data() : null;
    const shellResponse = await fetch(`${SITE_URL}/index.html`, {headers:{'user-agent':'Runtime-Guide-Renderer/1.0'}});
    let html = await shellResponse.text();
    const title = data?.seo_title || data?.title || 'Runtime Guide';
    const description = data?.meta_description || data?.excerpt || 'Practical domain and DNS guidance from Runtime.';
    const canonical = `${SITE_URL}/guides/${slug}`;
    const rawImage = clean(data?.featured_image);
    const image = rawImage ? (rawImage.startsWith('http://') || rawImage.startsWith('https://') ? rawImage : `${SITE_URL}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`) : `${SITE_URL}/new-og-image-01.webp`;
    const imageAlt = clean(data?.featured_image_alt || data?.title || 'Runtime Guide');
    const esc = (v:string) => String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const replacements:[RegExp,string][] = [
      [/<title>.*?<\/title>/s, `<title>${esc(title)}</title>`],
      [/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/s, `<meta name="description" content="${esc(description)}" />`],
      [/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/s, `<link rel="canonical" href="${canonical}" />`],
      [/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/s, `<meta property="og:title" content="${esc(title)}" />`],
      [/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/s, `<meta property="og:description" content="${esc(description)}" />`],
      [/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/s, `<meta property="og:url" content="${canonical}" />`],
      [/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/s, `<meta property="og:image" content="${esc(image)}" />`],
      [/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/s, `<meta property="og:image:alt" content="${esc(imageAlt)}" />`],
      [/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/s, `<meta name="twitter:title" content="${esc(title)}" />`],
      [/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/s, `<meta name="twitter:description" content="${esc(description)}" />`],
      [/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/s, `<meta name="twitter:image" content="${esc(image)}" />`],
    ];
    for (const [pattern,value] of replacements) html = html.replace(pattern,value);
    if (data) {
      const schema = {'@context':'https://schema.org','@type':'Article',headline:data.title,description,image:data.featured_image||undefined,datePublished:data.published_at,dateModified:data.updated_at,author:{'@type':'Organization',name:data.author||'Runtime'},publisher:{'@type':'Organization',name:'Runtime',url:SITE_URL},mainEntityOfPage:canonical};
      html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head>`);
    }
    res.status(data ? 200 : 404).type('html').send(html);
  } catch (error:any) { res.status(500).type('text').send(error.message); }
});

export default router;
