import { z } from 'zod';
import { identity, createRoom, joinRoom } from '@/lib/server';
import { nicknameSchema, codeSchema } from '@/lib/schema';
import { apiError, body } from '@/lib/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const user = await identity(request);
    const input = z.object({ nickname: nicknameSchema, code: codeSchema.optional(), mode:z.enum(['classic','strategy']).optional() }).strict().parse(await body(request));
    return Response.json(input.code ? await joinRoom(user,input.code,input.nickname) : await createRoom(user,input.nickname,input.mode));
  } catch (e) { return apiError(e); }
}
