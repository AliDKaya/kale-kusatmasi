'use client';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | undefined;
let sessionPromise: Promise<string> | undefined;
let refreshPromise: Promise<Session> | undefined;
let knownUserId: string | undefined;
export function browserConfigured() { return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
export function supabase() {
  if (!browserConfigured()) throw new Error('Supabase kurulumu henüz tamamlanmadı. Ortam değişkenleri gerekli.');
  return client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
export async function session() {
  if (!sessionPromise) sessionPromise = (async () => {
    const sb = supabase(); const {data,error} = await sb.auth.getSession();
    if(error) throw new Error('Oturum okunamadı. Bağlantı düzeldikten sonra yeniden dene.');
    if (data.session) { knownUserId=data.session.user.id;return knownUserId; }
    if(knownUserId)throw new Error('Mevcut oturum geri getirilemedi. Odayı açtığın tarayıcıda sayfayı yenileyip tekrar dene.');
    const result = await sb.auth.signInAnonymously();
    if (result.error || !result.data.user) throw new Error('Anonim oturum açılamadı. Supabase Anonymous Sign-Ins ayarını kontrol et.');
    knownUserId=result.data.user.id;return knownUserId;
  })().finally(() => { sessionPromise = undefined; });
  return sessionPromise;
}
// Refresh the existing identity; never replace an expired room owner with a new anonymous user.
async function refreshAccessToken(rejectedToken:string,userId:string):Promise<string>{
  if(!refreshPromise)refreshPromise=(async()=>{
    const sb=supabase();const current=await sb.auth.getSession();
    if(current.data.session&&current.data.session.access_token!==rejectedToken)return current.data.session;
    const refreshed=await sb.auth.refreshSession();
    if(refreshed.error||!refreshed.data.session)throw new Error('Oturum yenilenemedi. Odayı açtığın tarayıcıda sayfayı yenileyip tekrar dene.');
    return refreshed.data.session;
  })().finally(()=>{refreshPromise=undefined;});
  const refreshed=await refreshPromise;
  if(refreshed.user.id!==userId)throw new Error('Tarayıcı oturumu değişti. Odayı açtığın oturumla yeniden bağlan.');
  return refreshed.access_token;
}
export async function api<T>(url: string, data?: unknown, authenticated = true): Promise<T> {
  const headers: Record<string,string> = {};let token='';let userId='';
  if (authenticated) {
    userId=await session(); const {data:auth,error} = await supabase().auth.getSession();
    if(error||!auth.session)throw new Error('Oturum yüklenemedi. Bağlantı düzeldikten sonra yeniden dene.');
    token=auth.session.access_token;headers.Authorization = `Bearer ${token}`;
  }
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  // Keep the same body/operationId when retrying, including room-close and ready requests.
  const body=data!==undefined?JSON.stringify(data):undefined;
  const send=()=>fetch(url,{method:data!==undefined?'POST':'GET',headers,body,cache:'no-store'});
  let response=await send();
  if(authenticated&&response.status===401){
    headers.Authorization=`Bearer ${await refreshAccessToken(token,userId)}`;
    response=await send();
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'İstek tamamlanamadı.');
  return result;
}
