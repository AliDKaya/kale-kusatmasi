import { identity, leaderboard } from '@/lib/server';
import { apiError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { const result = await leaderboard(new URL(request.url).searchParams.get('filter') === 'today', await identity(request)); return Response.json({ scores: result.own }, { headers: { 'Cache-Control':'no-store' } }); }
  catch (e) { return apiError(e); }
}
