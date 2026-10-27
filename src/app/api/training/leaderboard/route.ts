import {z} from 'zod';
import {trainingLeaderboard} from '@/lib/training-server';
import {apiError} from '@/lib/http';
export const runtime='nodejs';
export async function GET(request:Request){try{const query=new URL(request.url).searchParams;const mode=z.enum(['classic','strategy']).parse(query.get('mode')),difficulty=z.enum(['acemi','sancak','serdar']).parse(query.get('difficulty'));return Response.json({scores:await trainingLeaderboard(mode,difficulty)});}catch(e){return apiError(e);}}
