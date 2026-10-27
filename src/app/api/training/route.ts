import {z} from 'zod';
import {identity} from '@/lib/server';
import {createTraining} from '@/lib/training-server';
import {nicknameSchema} from '@/lib/schema';
import {apiError,body} from '@/lib/http';
export const runtime='nodejs';
export async function POST(request:Request){try{const user=await identity(request);const input=z.object({nickname:nicknameSchema,mode:z.enum(['classic','strategy']),difficulty:z.enum(['acemi','sancak','serdar'])}).strict().parse(await body(request));return Response.json(await createTraining(user,input.nickname,input.mode,input.difficulty));}catch(e){return apiError(e);}}
