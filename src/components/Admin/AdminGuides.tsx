import React,{useEffect,useState} from 'react';
import { Copy, ExternalLink, FilePlus2, Pencil, Save, Trash2, X } from 'lucide-react';
import { guideApi, RuntimeGuide } from '../../services/GuideService';

const blank:RuntimeGuide={slug:'',title:'',excerpt:'',content:'',category:'Guides',featured_image:'',featured_image_alt:'',seo_title:'',meta_description:'',author:'Runtime',status:'draft'};
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

export const AdminGuides:React.FC=()=>{
 const [items,setItems]=useState<RuntimeGuide[]>([]); const [editing,setEditing]=useState<RuntimeGuide|null>(null); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
 const load=async()=>{try{const d=await guideApi('/admin/all',{},true);setItems(d.guides||[]);}catch(e:any){setMessage(e.message)}};
 useEffect(()=>{load()},[]);
 const save=async()=>{if(!editing)return;setBusy(true);setMessage('');try{const payload={...editing,slug:editing.slug||slugify(editing.title)};await guideApi('/admin',{method:'POST',body:JSON.stringify(payload)},true);setEditing(null);await load();setMessage('Guide saved.');}catch(e:any){setMessage(e.message)}finally{setBusy(false)}};
 const remove=async(g:RuntimeGuide)=>{if(!confirm(`Delete “${g.title}”?`))return;try{await guideApi(`/admin/${encodeURIComponent(g.slug)}`,{method:'DELETE'},true);await load();}catch(e:any){setMessage(e.message)}};
 const share=(g:RuntimeGuide)=>navigator.clipboard.writeText(`https://runtime.co.zw/guides/${g.slug}`).then(()=>setMessage('Guide link copied. You can paste it into a Runtime email campaign.'));
 return <div className="space-y-6">
  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold text-[#3120ff]">Content</p><h1 className="mt-1 text-2xl font-bold">Guides & articles</h1><p className="mt-2 max-w-2xl text-sm text-zinc-500">Publish useful domain and DNS content. Published links can be shared on social media or pasted into Email Campaigns.</p></div><button onClick={()=>setEditing({...blank})} className="inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white"><FilePlus2 className="h-4 w-4"/>New guide</button></div>
  {message&&<div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">{message}</div>}
  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="divide-y divide-zinc-100">{items.length===0?<p className="p-6 text-sm text-zinc-500">No guides yet.</p>:items.map(g=><div key={g.slug} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{g.title}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${g.status==='published'?'bg-emerald-50 text-emerald-700':'bg-zinc-100 text-zinc-500'}`}>{g.status}</span></div><p className="mt-1 truncate text-xs text-zinc-500">/guides/{g.slug}</p><p className="mt-1 text-[11px] text-zinc-400">{Number(g.views||0).toLocaleString()} views · {Number(g.useful_count||0).toLocaleString()} useful</p></div><div className="flex gap-2"><button title="Copy link" onClick={()=>share(g)} className="rounded-lg border border-zinc-200 p-2"><Copy className="h-4 w-4"/></button>{g.status==='published'&&<a title="Open" href={`/guides/${g.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-200 p-2"><ExternalLink className="h-4 w-4"/></a>}<button title="Edit" onClick={()=>setEditing({...g})} className="rounded-lg border border-zinc-200 p-2"><Pencil className="h-4 w-4"/></button><button title="Delete" onClick={()=>remove(g)} className="rounded-lg border border-zinc-200 p-2 text-red-600"><Trash2 className="h-4 w-4"/></button></div></div>)}</div></div>
  {editing&&<div className="fixed inset-0 z-100 overflow-y-auto bg-black/40 p-4"><div className="mx-auto my-6 max-w-4xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">{editing.id?'Edit guide':'New guide'}</h2><p className="text-xs text-zinc-500">Use ## for section headings and - for bullet points in the article body.</p></div><button onClick={()=>setEditing(null)}><X className="h-5 w-5"/></button></div><div className="grid gap-4 p-5 sm:grid-cols-2">
   <Field label="Title"><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value,slug:editing.slug||slugify(e.target.value)})}/></Field><Field label="Slug"><input value={editing.slug} onChange={e=>setEditing({...editing,slug:slugify(e.target.value)})}/></Field>
   <Field label="Category"><input value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})}/></Field><Field label="Author"><input value={editing.author||''} onChange={e=>setEditing({...editing,author:e.target.value})}/></Field>
   <div className="sm:col-span-2"><Field label="Excerpt"><textarea rows={3} value={editing.excerpt} onChange={e=>setEditing({...editing,excerpt:e.target.value})}/></Field></div>
   <div className="sm:col-span-2"><Field label="Article content"><textarea rows={14} value={editing.content} onChange={e=>setEditing({...editing,content:e.target.value})} placeholder={'Intro paragraph\n\n## First step\nExplain the step.\n\n- Optional bullet'}/></Field></div>
   <div className="sm:col-span-2"><Field label="Featured image URL (recommended 1200×630)"><input value={editing.featured_image||''} onChange={e=>setEditing({...editing,featured_image:e.target.value})} placeholder="https://runtime.co.zw/images/guides/example.webp"/></Field></div>
   <div className="sm:col-span-2"><Field label="Featured image alt text"><input value={editing.featured_image_alt||''} onChange={e=>setEditing({...editing,featured_image_alt:e.target.value})}/></Field></div>
   <Field label="SEO title"><input value={editing.seo_title||''} onChange={e=>setEditing({...editing,seo_title:e.target.value})}/></Field><Field label="Meta description"><textarea rows={2} value={editing.meta_description||''} onChange={e=>setEditing({...editing,meta_description:e.target.value})}/></Field>
   <Field label="Status"><select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as any})}><option value="draft">Draft</option><option value="published">Published</option></select></Field>
  </div><div className="flex justify-end gap-2 border-t p-5"><button onClick={()=>setEditing(null)} className="rounded-xl border px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={busy||!editing.title.trim()} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{busy?'Saving…':'Save guide'}</button></div></div></div>}
 </div>
}
const Field:React.FC<{label:string;children:React.ReactNode}> = ({label,children}) => (
 <label className="block text-xs font-semibold text-zinc-700">
  <span className="mb-1.5 block">{label}</span>
  {React.isValidElement(children)
   ? React.cloneElement(children as React.ReactElement<any>, {
      className: 'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#3120ff]',
     })
   : children}
 </label>
);
