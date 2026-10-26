import { ZodError } from 'zod';
import { ApiError } from './server';
export function apiError(error: unknown) {
  if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? 'Geçersiz veri.' }, { status: 400 });
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  console.error('İstek başarısız:', error instanceof Error ? error.name : 'bilinmeyen hata');
  return Response.json({ error: 'Sunucu isteği tamamlayamadı. Bağlantıyı ve veritabanı kurulumunu kontrol et.' }, { status: 503 });
}
export async function body(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 8192) throw new ApiError('İstek çok büyük.',413);
  const raw = await request.text();
  if (raw.length > 8192) throw new ApiError('İstek çok büyük.',413);
  try { return JSON.parse(raw); } catch { throw new ApiError('Geçerli JSON gerekli.'); }
}
