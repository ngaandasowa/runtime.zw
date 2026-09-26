import fs from 'node:fs';
import path from 'node:path';

const dist=path.resolve('dist');
const base=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const site='https://runtime.co.zw';
const defaultImage=`${site}/new-og-image-01.webp`;

// Static public pages. Individual /guides/:slug pages are deliberately NOT generated
// here: Vercel rewrites those requests to the backend renderer so Firestore featured
// images are present in the first HTML response seen by WhatsApp/Facebook/X/LinkedIn.
const routes={
'/domains':{title:'Domain Registration & Management | Runtime',description:'Search, register and manage domains with Runtime, including Zimbabwe domains and flexible DNS options.'},
'/domains/co-zw':{title:'.co.zw Domain Registration in Zimbabwe | Runtime',description:'Register and manage a .co.zw domain with Runtime and choose Runtime DNS powered by Cloudflare or Custom DNS.'},
'/domain-pricing':{title:'Domain Pricing | Runtime',description:'Compare Runtime domain registration and renewal pricing for available domain extensions.'},
'/dns':{title:'Runtime DNS | Cloudflare-Powered DNS Management',description:'Learn how Runtime DNS works with Cloudflare-assigned nameservers, how Custom DNS differs, and how to connect domains to web platforms.'},
'/whois':{title:'WHOIS Domain Lookup | Runtime',description:'Look up domain registration information and check available domain names with Runtime.'},
'/speed-test':{title:'Internet Speed Test – Check Download, Upload & Ping | Runtime',description:'Test your internet connection speed for free. Check download speed, upload speed, ping and jitter with Runtime Speed Test.',image:`${site}/images/speedtest.webp`},
'/guides':{title:'Domain & DNS Guides | Runtime',description:'Practical Runtime guides for .co.zw registration, DNS records and connecting domains to popular hosting platforms.',image:`${site}/images/guides.webp`},
'/contact':{title:'Contact Runtime | Domain Support',description:'Contact Runtime for help with domain registration, renewals, transfers, DNS and account support.'},
'/terms':{title:'Terms of Service | Runtime',description:'Read the terms that apply when using Runtime services.'},
'/privacy':{title:'Privacy Policy | Runtime',description:'Read how Runtime handles and protects personal information.'}
};

const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const replace=(html,re,value)=>re.test(html)?html.replace(re,value):html;

for(const [route,cfg] of Object.entries(routes)){
  const canonical=`${site}${route}`;
  const image=cfg.image||defaultImage;
  let html=base.replace(/<script[^>]*data-runtime-base-schema="true"[^>]*>[\s\S]*?<\/script>/g,'');
  html=replace(html,/<title>.*?<\/title>/s,`<title>${esc(cfg.title)}</title>`);
  html=replace(html,/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(cfg.description)}$2`);
  html=replace(html,/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/s,`$1${canonical}$2`);
  html=replace(html,/(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(cfg.title)}$2`);
  html=replace(html,/(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(cfg.description)}$2`);
  html=replace(html,/(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/?>)/s,`$1${canonical}$2`);
  html=replace(html,/(<meta\s+property="og:image"\s+content=")[^"]*("\s*\/?>)/s,`$1${image}$2`);
  html=replace(html,/(<meta\s+property="og:image:alt"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(cfg.title)}$2`);
  html=replace(html,/(<meta\s+name="twitter:title"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(cfg.title)}$2`);
  html=replace(html,/(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(cfg.description)}$2`);
  html=replace(html,/(<meta\s+name="twitter:image"\s+content=")[^"]*("\s*\/?>)/s,`$1${image}$2`);
  const out=path.join(dist,route.slice(1),'index.html');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,html);
}
