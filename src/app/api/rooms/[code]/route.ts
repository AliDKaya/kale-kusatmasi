import { identity, roomState } from '@/lib/server';
import { codeSchema, actionSchema } from '@/lib/schema';
import { apiError, body } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{code:string}> };
export async function GET(request: Request, context: Context) {
  try { return Response.json(await roomState(await identity(request),codeSchema.parse((await context.params).code)), { headers: { 'Cache-Control':'no-store' } }); }
  catch (e) { return apiError(e); }
}
export async function POST(request: Request, context: Context) {
  try { return Response.json(await roomState(await identity(request),codeSchema.parse((await context.params).code),actionSchema.parse(await body(request)))); }
  catch (e) { return apiError(e); }
}
