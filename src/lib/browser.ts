'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | undefined;
let sessionPromise: Promise<string> | undefined;
export function browserConfigured() { return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
export function supabase() {
  if (!browserConfigured()) throw new Error('Supabase kurulumu henüz tamamlanmadı. Ortam değişkenleri gerekli.');
  return client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
export async function session() {
  if (!sessionPromise) sessionPromise = (async () => {
    const sb = supabase(); const {data} = await sb.auth.getSession();
    if (data.session) return data.session.user.id;
    const result = await sb.auth.signInAnonymously();
    if (result.error || !result.data.user) throw new Error('Anonim oturum açılamadı. Supabase Anonymous Sign-Ins ayarını kontrol et.');
    return result.data.user.id;
  })().catch(e => { sessionPromise = undefined; throw e; });
  return sessionPromise;
}
export async function api<T>(url: string, data?: unknown, authenticated = true): Promise<T> {
  const headers: Record<string,string> = {};
  if (authenticated) {
    await session(); const {data:auth} = await supabase().auth.getSession();
    headers.Authorization = `Bearer ${auth.session?.access_token}`;
  }
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(url,{ method: data !== undefined ? 'POST' : 'GET',headers,body: data !== undefined ? JSON.stringify(data) : undefined,cache:'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'İstek tamamlanamadı.');
  return result;
}
