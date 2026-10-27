import {z} from 'zod';
import {identity} from '@/lib/server';
import {trainingView} from '@/lib/training-server';
import {actionSchema} from '@/lib/schema';
import {apiError,body} from '@/lib/http';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){try{const user=await identity(request),id=z.uuid().parse((await context.params).id);return Response.json(await trainingView(user,id));}catch(e){return apiError(e);}}
export async function POST(request:Request,context:Context){try{const user=await identity(request),id=z.uuid().parse((await context.params).id);const view=await trainingView(user,id,actionSchema.parse(await body(request)));return Response.json(view,{status:view.error?409:200});}catch(e){return apiError(e);}}
