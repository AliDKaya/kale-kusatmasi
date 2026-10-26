import { leaderboard } from '@/lib/server';
import { apiError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { const result = await leaderboard(new URL(request.url).searchParams.get('filter') === 'today'); return Response.json({ skorlar: result.skorlar }, { headers: { 'Cache-Control':'no-store' } }); }
  catch (e) { return apiError(e); }
}
