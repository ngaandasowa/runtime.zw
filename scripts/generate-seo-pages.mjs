import fs from 'node:fs';
import path from 'node:path';
const dist=path.resolve('dist'); const base=fs.readFileSync(path.join(dist,'index.html'),'utf8'); const site='https://runtime.co.zw';
const routes={
'/domains':['Domain Registration & Management | Runtime','Search, register and manage domains with Runtime, including Zimbabwe domains and flexible DNS options.'],
'/domains/co-zw':['.co.zw Domain Registration in Zimbabwe | Runtime','Register and manage a .co.zw domain with Runtime and choose Runtime DNS powered by Cloudflare or Custom DNS.'],
'/domain-pricing':['Domain Pricing | Runtime','Compare Runtime domain registration and renewal pricing for available domain extensions.'],
'/dns':['Runtime DNS | Cloudflare-Powered DNS Management','Learn how Runtime DNS works with Cloudflare-assigned nameservers, how Custom DNS differs, and how to connect domains to web platforms.'],
'/whois':['WHOIS Domain Lookup | Runtime','Look up domain registration information and check available domain names with Runtime.'],
'/speed-test':['Internet Speed Test – Check Download, Upload & Ping | Runtime','Test your internet connection speed for free. Check download speed, upload speed, ping and jitter with Runtime Speed Test.'],
'/guides':['Domain & DNS Guides | Runtime','Practical Runtime guides for .co.zw registration, DNS records and connecting domains to popular hosting platforms.'],
'/guides/connect-domain-to-vercel':['Connect a Domain to Vercel | Runtime Guide','How to connect a Runtime-managed domain to Vercel using the DNS records Vercel provides.'],
'/guides/connect-domain-to-netlify':['Connect a Domain to Netlify | Runtime Guide','How to connect a domain to Netlify using Runtime DNS or your existing Custom DNS provider.'],
'/guides/connect-domain-to-render':['Connect a Domain to Render | Runtime Guide','How to connect a domain to a Render service and publish the required DNS records.'],
'/guides/connect-domain-to-github-pages':['Connect a Domain to GitHub Pages | Runtime Guide','How to configure a custom domain for GitHub Pages using the correct authoritative DNS provider.'],
'/guides/connect-domain-to-firebase':['Connect a Domain to Firebase Hosting | Runtime Guide','How to verify and connect a custom domain to Firebase Hosting using the DNS records Firebase provides.'],
'/guides/connect-domain-to-vps-hosting':['Connect a Domain to a VPS or Web Hosting | Runtime Guide','Learn how to point a domain to a VPS or hosting server with DNS records or Custom DNS nameservers.'],
'/guides/dns-records':['DNS Records Explained: A, AAAA, CNAME, MX, TXT & NS | Runtime','Understand common DNS record types and when they are used to connect websites, email and other services.'],
'/guides/register-co-zw-domain':['How to Register a .co.zw Domain | Runtime Guide','A practical guide to searching, ordering and configuring DNS for a .co.zw domain with Runtime.'],
'/contact':['Contact Runtime | Domain Support','Contact Runtime for help with domain registration, renewals, transfers, DNS and account support.'],
'/terms':['Terms of Service | Runtime','Read the terms that apply when using Runtime services.'],
'/privacy':['Privacy Policy | Runtime','Read how Runtime handles and protects personal information.']};
const esc=v=>v.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const [route,[title,description]] of Object.entries(routes)){const canonical=`${site}${route}`;let html=base.replace(/<script[^>]*data-runtime-base-schema="true"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<title>.*?<\/title>/s,`<title>${esc(title)}</title>`).replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(description)}$2`).replace(/(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/s,`$1${canonical}$2`).replace(/(<meta\s+property="og:title"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(title)}$2`).replace(/(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(description)}$2`).replace(/(<meta\s+property="og:url"\s+content=")[^"]*("\s*\/?>)/s,`$1${canonical}$2`).replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(title)}$2`).replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/?>)/s,`$1${esc(description)}$2`);const out=path.join(dist,route.slice(1),'index.html');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);}
