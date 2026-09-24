import React,{useEffect,useRef,useState} from 'react';
import { Bold, Code2, Copy, ExternalLink, FilePlus2, Heading2, Heading3, Image, Italic, Link2, List, ListOrdered, Pencil, Quote, Save, SeparatorHorizontal, Trash2, X } from 'lucide-react';
import { guideApi, RuntimeGuide } from '../../services/GuideService';

const blank:RuntimeGuide={slug:'',title:'',excerpt:'',content:'',category:'Guides',featured_image:'',featured_image_alt:'',seo_title:'',meta_description:'',author:'Runtime',status:'draft'};
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');


const inlineMarkdown=(text:string,keyPrefix:string):React.ReactNode[]=>{
 const tokens=text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
 return tokens.filter(Boolean).map((token,i)=>{
  const key=`${keyPrefix}-${i}`; const link=token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if(link){const href=link[2].trim();const safe=/^(https?:\/\/|mailto:|\/)/i.test(href);return safe?<a key={key} href={href} target={href.startsWith('http')?'_blank':undefined} rel={href.startsWith('http')?'noopener noreferrer':undefined} className="font-medium text-[#3120ff] underline underline-offset-4">{link[1]}</a>:<React.Fragment key={key}>{link[1]}</React.Fragment>}
  if(/^`[^`]+`$/.test(token))return <code key={key} className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-800">{token.slice(1,-1)}</code>;
  if(/^\*\*[^*]+\*\*$/.test(token))return <strong key={key} className="font-semibold text-zinc-900">{token.slice(2,-2)}</strong>;
  if(/^\*[^*]+\*$/.test(token))return <em key={key}>{token.slice(1,-1)}</em>;
  return <React.Fragment key={key}>{token}</React.Fragment>;
 });
};

const ArticlePreview:React.FC<{content:string}>=({content})=>{
 const lines=content.replace(/\r\n/g,'\n').split('\n'); const nodes:React.ReactNode[]=[]; let i=0;
 while(i<lines.length){
  const line=lines[i].trim(); if(!line){i++;continue;}
  if(line.startsWith('```')){const code:string[]=[];i++;while(i<lines.length&&!lines[i].trim().startsWith('```')){code.push(lines[i]);i++;}if(i<lines.length)i++;nodes.push(<pre key={`code-${i}`} className="my-6 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-sm leading-6 text-zinc-100"><code>{code.join('\n')}</code></pre>);continue;}
  const image=line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);if(image&&/^https?:\/\//i.test(image[2])){nodes.push(<figure key={`img-${i}`} className="my-7"><img src={image[2]} alt={image[1]} className="w-full rounded-xl border border-zinc-200 object-cover"/>{image[1]&&<figcaption className="mt-2 text-center text-xs text-zinc-500">{image[1]}</figcaption>}</figure>);i++;continue;}
  if(/^---+$/.test(line)){nodes.push(<hr key={`hr-${i}`} className="my-8 border-zinc-200"/>);i++;continue;}
  const h=line.match(/^(#{2,4})\s+(.+)$/);if(h){const n=h[1].length;const Tag=(n===2?'h2':n===3?'h3':'h4') as keyof React.JSX.IntrinsicElements;const cls=n===2?'mt-10 text-2xl font-bold tracking-tight text-zinc-950':n===3?'mt-8 text-xl font-bold text-zinc-950':'mt-6 text-base font-bold text-zinc-950';nodes.push(<Tag key={`h-${i}`} className={cls}>{inlineMarkdown(h[2],`h-${i}`)}</Tag>);i++;continue;}
  if(line.startsWith('> ')){const q:string[]=[];while(i<lines.length&&lines[i].trim().startsWith('> ')){q.push(lines[i].trim().slice(2));i++;}nodes.push(<blockquote key={`q-${i}`} className="my-6 border-l-4 border-[#3120ff] bg-zinc-50 px-5 py-4 text-base leading-7 text-zinc-700">{q.map((x,j)=><React.Fragment key={j}>{inlineMarkdown(x,`q-${i}-${j}`)}{j<q.length-1&&<br/>}</React.Fragment>)}</blockquote>);continue;}
  if(/^[-*]\s+/.test(line)){const a:string[]=[];while(i<lines.length&&/^[-*]\s+/.test(lines[i].trim())){a.push(lines[i].trim().replace(/^[-*]\s+/,''));i++;}nodes.push(<ul key={`ul-${i}`} className="my-5 list-disc space-y-2 pl-6 text-base leading-7 text-zinc-700">{a.map((x,j)=><li key={j}>{inlineMarkdown(x,`ul-${i}-${j}`)}</li>)}</ul>);continue;}
  if(/^\d+\.\s+/.test(line)){const a:string[]=[];while(i<lines.length&&/^\d+\.\s+/.test(lines[i].trim())){a.push(lines[i].trim().replace(/^\d+\.\s+/,''));i++;}nodes.push(<ol key={`ol-${i}`} className="my-5 list-decimal space-y-2 pl-6 text-base leading-7 text-zinc-700">{a.map((x,j)=><li key={j}>{inlineMarkdown(x,`ol-${i}-${j}`)}</li>)}</ol>);continue;}
  const para=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(#{2,4})\s+|^```|^> |^[-*]\s+|^\d+\.\s+|^!\[|^---+$/.test(lines[i].trim())){para.push(lines[i].trim());i++;}nodes.push(<p key={`p-${i}`} className="my-5 text-base leading-7 text-zinc-700">{inlineMarkdown(para.join(' '),`p-${i}`)}</p>);
 }
 return <>{nodes}</>;
};

export const AdminGuides:React.FC=()=>{
 const [items,setItems]=useState<RuntimeGuide[]>([]); const [editing,setEditing]=useState<RuntimeGuide|null>(null); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [preview,setPreview]=useState(false);
 const editorRef=useRef<HTMLTextAreaElement|null>(null);
 const load=async()=>{try{const d=await guideApi('/admin/all',{},true);setItems(d.guides||[]);}catch(e:any){setMessage(e.message)}};
 useEffect(()=>{load()},[]);
 const save=async()=>{if(!editing)return;setBusy(true);setMessage('');try{const payload={...editing,slug:editing.slug||slugify(editing.title)};await guideApi('/admin',{method:'POST',body:JSON.stringify(payload)},true);setEditing(null);await load();setMessage('Guide saved.');}catch(e:any){setMessage(e.message)}finally{setBusy(false)}};
 const remove=async(g:RuntimeGuide)=>{if(!confirm(`Delete “${g.title}”?`))return;try{await guideApi(`/admin/${encodeURIComponent(g.slug)}`,{method:'DELETE'},true);await load();}catch(e:any){setMessage(e.message)}};
 const share=(g:RuntimeGuide)=>navigator.clipboard.writeText(`https://runtime.co.zw/guides/${g.slug}`).then(()=>setMessage('Guide link copied. You can paste it into a Runtime email campaign.'));
 const apply=(before:string,after='',placeholder='text')=>{
   if(!editing)return; const el=editorRef.current; const content=editing.content||'';
   const start=el?.selectionStart??content.length, end=el?.selectionEnd??content.length;
   const selected=content.slice(start,end)||placeholder;
   const next=content.slice(0,start)+before+selected+after+content.slice(end);
   setEditing({...editing,content:next});
   requestAnimationFrame(()=>{if(el){el.focus();el.setSelectionRange(start+before.length,start+before.length+selected.length);}});
 };
 const linePrefix=(prefix:string,placeholder:string)=>{
   if(!editing)return; const el=editorRef.current; const content=editing.content||'';
   const start=el?.selectionStart??content.length, end=el?.selectionEnd??content.length;
   const selected=content.slice(start,end)||placeholder;
   const transformed=selected.split('\n').map((line,i)=>prefix==='1. '?`${i+1}. ${line}`:`${prefix}${line}`).join('\n');
   const next=content.slice(0,start)+transformed+content.slice(end); setEditing({...editing,content:next});
   requestAnimationFrame(()=>el?.focus());
 };
 return <div className="space-y-6">
  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold text-[#3120ff]">Content</p><h1 className="mt-1 text-2xl font-bold">Guides & articles</h1><p className="mt-2 max-w-2xl text-sm text-zinc-500">Publish useful domain and DNS content. Published links can be shared on social media or pasted into Email Campaigns.</p></div><button onClick={()=>{setEditing({...blank});setPreview(false)}} className="inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white"><FilePlus2 className="h-4 w-4"/>New guide</button></div>
  {message&&<div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">{message}</div>}
  <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="divide-y divide-zinc-100">{items.length===0?<p className="p-6 text-sm text-zinc-500">No guides yet.</p>:items.map(g=><div key={g.slug} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{g.title}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${g.status==='published'?'bg-emerald-50 text-emerald-700':'bg-zinc-100 text-zinc-500'}`}>{g.status}</span></div><p className="mt-1 truncate text-xs text-zinc-500">/guides/{g.slug}</p><p className="mt-1 text-[11px] text-zinc-400">{Number(g.views||0).toLocaleString()} views · {Number(g.useful_count||0).toLocaleString()} useful</p></div><div className="flex gap-2"><button title="Copy link" onClick={()=>share(g)} className="rounded-lg border border-zinc-200 p-2"><Copy className="h-4 w-4"/></button>{g.status==='published'&&<a title="Open" href={`/guides/${g.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-200 p-2"><ExternalLink className="h-4 w-4"/></a>}<button title="Edit" onClick={()=>{setEditing({...g});setPreview(false)}} className="rounded-lg border border-zinc-200 p-2"><Pencil className="h-4 w-4"/></button><button title="Delete" onClick={()=>remove(g)} className="rounded-lg border border-zinc-200 p-2 text-red-600"><Trash2 className="h-4 w-4"/></button></div></div>)}</div></div>
  {editing&&<div className="fixed inset-0 z-100 overflow-y-auto bg-black/40 p-4"><div className="mx-auto my-6 max-w-5xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">{editing.id?'Edit guide':'New guide'}</h2><p className="text-xs text-zinc-500">Rich Markdown editor: headings, emphasis, links, images, lists, quotes and code.</p></div><button onClick={()=>setEditing(null)}><X className="h-5 w-5"/></button></div><div className="grid gap-4 p-5 sm:grid-cols-2">
   <Field label="Title"><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value,slug:editing.slug||slugify(e.target.value)})}/></Field><Field label="Slug"><input value={editing.slug} onChange={e=>setEditing({...editing,slug:slugify(e.target.value)})}/></Field>
   <Field label="Category"><input value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})}/></Field><Field label="Author"><input value={editing.author||''} onChange={e=>setEditing({...editing,author:e.target.value})}/></Field>
   <div className="sm:col-span-2"><Field label="Excerpt"><textarea rows={3} value={editing.excerpt} onChange={e=>setEditing({...editing,excerpt:e.target.value})}/></Field></div>
   <div className="sm:col-span-2">
    <div className="mb-1.5 flex items-center justify-between"><span className="text-xs font-semibold text-zinc-700">Article content</span><button type="button" onClick={()=>setPreview(!preview)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-bold text-zinc-700">{preview?'Edit':'Preview'}</button></div>
    {!preview&&<>
      <div className="flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-zinc-200 bg-zinc-50 p-2">
       <Tool title="Heading 2" onClick={()=>linePrefix('## ','Section heading')}><Heading2/></Tool><Tool title="Heading 3" onClick={()=>linePrefix('### ','Subheading')}><Heading3/></Tool>
       <Tool title="Bold" onClick={()=>apply('**','**','bold text')}><Bold/></Tool><Tool title="Italic" onClick={()=>apply('*','*','italic text')}><Italic/></Tool>
       <Tool title="Link" onClick={()=>apply('[','](https://example.com)','link text')}><Link2/></Tool><Tool title="Image" onClick={()=>apply('![','](https://example.com/image.webp)','image description')}><Image/></Tool>
       <Tool title="Bulleted list" onClick={()=>linePrefix('- ','List item')}><List/></Tool><Tool title="Numbered list" onClick={()=>linePrefix('1. ','List item')}><ListOrdered/></Tool>
       <Tool title="Quote" onClick={()=>linePrefix('> ','Quote')}><Quote/></Tool><Tool title="Inline code" onClick={()=>apply('`','`','code')}><Code2/></Tool>
       <Tool title="Divider" onClick={()=>apply('\n\n---\n\n','','')}><SeparatorHorizontal/></Tool>
      </div>
      <textarea ref={editorRef} rows={18} value={editing.content} onChange={e=>setEditing({...editing,content:e.target.value})} className="w-full rounded-b-xl border border-zinc-200 bg-white px-4 py-3 font-mono text-sm font-normal leading-6 outline-none focus:border-[#3120ff]" placeholder={'Intro paragraph\n\n## First step\nExplain the step.\n\n- Optional bullet'}/>
      <p className="mt-2 text-[11px] text-zinc-500">Tip: select text first, then click Bold, Italic or Link. Images inside an article use Markdown: ![description](https://...)</p>
    </>}
    {preview&&<div className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
       <p className="text-xs font-bold uppercase tracking-wide text-[#3120ff]">{editing.category||'Guide'}</p>
       <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">{editing.title||'Untitled guide'}</h1>
       {editing.excerpt&&<p className="mt-5 text-base leading-7 text-zinc-600">{editing.excerpt}</p>}
       {editing.featured_image&&<img src={editing.featured_image} alt={editing.featured_image_alt||editing.title} className="mt-8 aspect-1200/630 w-full rounded-2xl border border-zinc-200 object-cover"/>}
       <div className="mt-10">{editing.content?<ArticlePreview content={editing.content}/>:<p className="text-base text-zinc-500">Start writing to preview your article.</p>}</div>
      </div>
     </div>}
   </div>
   <div className="sm:col-span-2"><Field label="Featured image URL (recommended 1200×630)"><input value={editing.featured_image||''} onChange={e=>setEditing({...editing,featured_image:e.target.value})} placeholder="https://runtime.co.zw/images/guides/example.webp"/></Field></div>
   <div className="sm:col-span-2"><Field label="Featured image alt text"><input value={editing.featured_image_alt||''} onChange={e=>setEditing({...editing,featured_image_alt:e.target.value})}/></Field></div>
   <Field label="SEO title"><input value={editing.seo_title||''} onChange={e=>setEditing({...editing,seo_title:e.target.value})}/></Field><Field label="Meta description"><textarea rows={2} value={editing.meta_description||''} onChange={e=>setEditing({...editing,meta_description:e.target.value})}/></Field>
   <Field label="Status"><select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as RuntimeGuide['status']})}><option value="draft">Draft</option><option value="published">Published</option></select></Field>
  </div><div className="flex justify-end gap-2 border-t p-5"><button onClick={()=>setEditing(null)} className="rounded-xl border px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={busy||!editing.title.trim()} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{busy?'Saving…':'Save guide'}</button></div></div></div>}
 </div>
}

const Tool:React.FC<{title:string;onClick:()=>void;children:React.ReactNode}>=({title,onClick,children})=><button type="button" title={title} aria-label={title} onClick={onClick} className="rounded-lg border border-transparent p-2 text-zinc-600 hover:border-zinc-200 hover:bg-white hover:text-zinc-950 [&_svg]:h-4 [&_svg]:w-4">{children}</button>;

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
