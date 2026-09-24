import { getAuth } from 'firebase/auth';

export type RuntimeGuide = {
  id?: string; slug: string; title: string; excerpt: string; content: string; category: string;
  featured_image?: string; featured_image_alt?: string; seo_title?: string; meta_description?: string;
  author?: string; status: 'draft'|'published'; created_at?: string; updated_at?: string; published_at?: string|null; views?: number; useful_count?: number;
};

const API = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:4000' : 'https://api.runtime.co.zw');
export const guideApi = async (path:string, options:RequestInit={}, admin=false) => {
  const headers:Record<string,string> = {'Content-Type':'application/json', ...((options.headers as Record<string,string>)||{})};
  if (admin) { const user=getAuth().currentUser; if(!user) throw new Error('Administrator authentication is required.'); headers.Authorization=`Bearer ${await user.getIdToken()}`; }
  const response=await fetch(`${API}/api/guides${path}`, {...options,headers});
  const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.message||'Guide request failed.'); return data;
};
