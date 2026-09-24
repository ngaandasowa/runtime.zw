import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Eye, ThumbsUp } from 'lucide-react';
import { FaFacebookF, FaLinkedinIn, FaWhatsapp, FaXTwitter } from 'react-icons/fa6';
import { MdEmail } from 'react-icons/md';
import { guideApi, RuntimeGuide } from '../../services/GuideService';

const SITE_URL='https://runtime.co.zw';

export const GuidePage: React.FC = () => {
  const { slug = '' } = useParams();
  const [guide,setGuide]=useState<RuntimeGuide|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [copied,setCopied]=useState(false);
  const [useful,setUseful]=useState(false);
  const [views,setViews]=useState(0);
  const [usefulCount,setUsefulCount]=useState(0);

  useEffect(()=>{
    setGuide(null);setLoaded(false);setCopied(false);
    guideApi(`/${encodeURIComponent(slug)}`).then(d=>{setGuide(d.guide);setViews(Number(d.guide?.views||0));setUsefulCount(Number(d.guide?.useful_count||0));}).catch(()=>{}).finally(()=>setLoaded(true));
  },[slug]);

  useEffect(()=>{
    if(!guide)return;
    const key=`runtime-guide-view:${guide.slug}`;
    if(!sessionStorage.getItem(key)) guideApi(`/${encodeURIComponent(guide.slug)}/view`,{method:'POST'}).then(d=>{sessionStorage.setItem(key,'1');setViews(Number(d.views||0));}).catch(()=>{});
    setUseful(localStorage.getItem(`runtime-guide-useful:${guide.slug}`)==='1');
  },[guide?.slug]);

  useEffect(()=>{
    if(!guide)return;const canonical=`${SITE_URL}/guides/${guide.slug}`;const title=guide.seo_title||`${guide.title} | Runtime Guide`;const description=guide.meta_description||guide.excerpt;const image=guide.featured_image||`${SITE_URL}/og-image.webp`;document.title=title;
    const meta=(selector:string,key:string,name:string,value:string)=>{let el=document.head.querySelector<HTMLMetaElement>(selector);if(!el){el=document.createElement('meta');el.setAttribute(key,name);document.head.appendChild(el)}el.content=value};
    meta('meta[name="description"]','name','description',description);meta('meta[name="robots"]','name','robots','index,follow,max-image-preview:large');meta('meta[property="og:title"]','property','og:title',title);meta('meta[property="og:description"]','property','og:description',description);meta('meta[property="og:url"]','property','og:url',canonical);meta('meta[property="og:image"]','property','og:image',image);meta('meta[property="og:image:alt"]','property','og:image:alt',guide.featured_image_alt||guide.title);meta('meta[name="twitter:card"]','name','twitter:card','summary_large_image');meta('meta[name="twitter:title"]','name','twitter:title',title);meta('meta[name="twitter:description"]','name','twitter:description',description);meta('meta[name="twitter:image"]','name','twitter:image',image);
    let link=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}link.href=canonical;
  },[guide]);

  const url=useMemo(()=>guide?`${SITE_URL}/guides/${guide.slug}`:'',[guide]);
  const shareText=guide?guide.title:'';
  const share=(href:string)=>window.open(href,'_blank','noopener,noreferrer,width=720,height=640');
  const copy=async()=>{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)};
  const markUseful=async()=>{if(!guide||useful)return;try{const d=await guideApi(`/${encodeURIComponent(guide.slug)}/useful`,{method:'POST'});localStorage.setItem(`runtime-guide-useful:${guide.slug}`,'1');setUseful(true);setUsefulCount(Number(d.useful_count||usefulCount+1));}catch{}}

  if(!guide)return loaded?<div className="mx-auto max-w-3xl px-4 py-20"><h1 className="text-3xl font-bold">Guide not found</h1><Link to="/guides" className="mt-5 inline-block text-[#3120ff]">View all guides</Link></div>:<div className="min-h-[50vh]"/>;
  const blocks=guide.content.split(/\n{2,}/).filter(Boolean);
  return <article className="bg-white"><div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
    <Link to="/guides" className="inline-flex items-center gap-2 text-sm font-semibold text-[#3120ff]"><ArrowLeft className="h-4 w-4"/>All guides</Link>
    <p className="mt-8 text-xs font-bold uppercase tracking-wide text-[#3120ff]">{guide.category||'Guide'}</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">{guide.title}</h1><p className="mt-5 text-lg leading-8 text-zinc-600">{guide.excerpt}</p>
    <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-zinc-500"><span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4"/>{views.toLocaleString()} views</span><span className="inline-flex items-center gap-1.5"><ThumbsUp className="h-4 w-4"/>{usefulCount.toLocaleString()} found this useful</span></div>
    {guide.featured_image&&<img src={guide.featured_image} alt={guide.featured_image_alt||guide.title} className="mt-8 aspect-1200/630 w-full rounded-2xl border border-zinc-200 object-cover"/>}
    <div className="mt-10 space-y-5">{blocks.map((block,i)=>block.startsWith('## ')?<h2 key={i} className="pt-4 text-2xl font-bold text-zinc-950">{block.slice(3)}</h2>:block.split('\n').every(l=>l.startsWith('- '))?<ul key={i} className="list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-600">{block.split('\n').map((l,j)=><li key={j}>{l.slice(2)}</li>)}</ul>:<p key={i} className="text-sm leading-7 text-zinc-600">{block}</p>)}</div>
    <div className="mt-12 border-t border-zinc-200 pt-7"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-sm font-bold text-zinc-950">Share this guide</p><p className="mt-1 text-xs text-zinc-500">Help someone who may find it useful.</p></div><div className="flex flex-wrap gap-2">
      <button aria-label="Share on WhatsApp" onClick={()=>share(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`)} className="rounded-xl border border-zinc-200 p-2.5 hover:bg-zinc-50"><FaWhatsapp className="h-4 w-4"/></button>
      <button aria-label="Share on Facebook" onClick={()=>share(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)} className="rounded-xl border border-zinc-200 p-2.5 hover:bg-zinc-50"><FaFacebookF className="h-4 w-4"/></button>
      <button aria-label="Share on X" onClick={()=>share(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`)} className="rounded-xl border border-zinc-200 p-2.5 hover:bg-zinc-50"><FaXTwitter className="h-4 w-4"/></button>
      <button aria-label="Share on LinkedIn" onClick={()=>share(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)} className="rounded-xl border border-zinc-200 p-2.5 hover:bg-zinc-50"><FaLinkedinIn className="h-4 w-4"/></button>
      <a aria-label="Share by email" href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`${guide.excerpt}\n\n${url}`)}`} className="rounded-xl border border-zinc-200 p-2.5 hover:bg-zinc-50"><MdEmail className="h-4 w-4"/></a>
      <button aria-label="Copy link" onClick={copy} className="rounded-xl border border-zinc-200 p-2.5 hover:bg-zinc-50">{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}</button>
    </div></div></div>
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-[#FAFAFA] p-5 text-center"><p className="text-sm font-semibold text-zinc-900">Was this guide useful?</p><button disabled={useful} onClick={markUseful} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white disabled:bg-zinc-200 disabled:text-zinc-500"><ThumbsUp className="h-4 w-4"/>{useful?'Marked useful':'Yes, this helped'}</button></div>
  </div></article>;
};
