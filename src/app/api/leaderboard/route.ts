import { leaderboard } from '@/lib/server';
import { apiError } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { const params=new URL(request.url).searchParams;const raw=params.get('mode');const mode=raw==='classic'||raw==='strategy'?raw:'all';const result = await leaderboard(new URL(request.url).searchParams.get('filter') === 'today',undefined,mode); return Response.json({ skorlar: result.skorlar }, { headers: { 'Cache-Control':'no-store' } }); }
  catch (e) { return apiError(e); }
}
