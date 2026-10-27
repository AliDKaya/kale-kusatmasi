import 'server-only';
import postgres from 'postgres';
import {ApiError,configured} from './server';
import {initialTraining,advanceTraining,actTraining,trainingResult,type TrainingState} from './training-core';
import type {Action} from './schema';
import {BOT_LEVELS,type BotLevel} from './bot-planner';
let connection:ReturnType<typeof postgres>|undefined;
function database(){if(!configured())throw new ApiError('Sunucu kurulumu eksik.',503);return connection??=postgres(process.env.DATABASE_URL!,{prepare:false,max:2,idle_timeout:20,connect_timeout:10,ssl:'require'});}
export async function createTraining(user:string,nickname:string,mode:TrainingState['mode'],difficulty:BotLevel){
 return database().begin(async tx=>{
  await tx`insert into players(id,nickname) values(${user},${nickname}) on conflict(id) do nothing`;
  const [p]=await tx`select last_mutation_at from players where id=${user} for update`;
  if(p.last_mutation_at&&Date.now()-new Date(p.last_mutation_at).getTime()<1000)throw new ApiError('Bir saniye bekle.',429);
  const [active]=await tx`select id from training_sessions where player_id=${user} and finished_at is null and created_at>now()-interval '1 hour' limit 1`;
  if(active)throw new ApiError(`Devam eden antrenmanın var: ${active.id}`,409);
  const state=initialTraining(mode,difficulty);const [row]=await tx`insert into training_sessions(player_id,mode,difficulty,state) values(${user},${mode},${difficulty},${tx.json(state)}) returning id`;
  await tx`update players set last_mutation_at=now() where id=${user}`;return{id:row.id};
 });
}
export async function trainingView(user:string,id:string,action?:Action){
 const result=await database().begin(async tx=>{
  const [row]=await tx`select s.state,p.nickname from training_sessions s join players p on p.id=s.player_id where s.id=${id} and s.player_id=${user} for update of s`;
  if(!row)throw new ApiError('Antrenman bulunamadı.',404);
  const before=row.state as TrainingState;let state=advanceTraining(before,Date.now()),error:string|undefined;
  if(action){const [p]=await tx`select last_mutation_at from players where id=${user} for update`;if(p.last_mutation_at&&Date.now()-new Date(p.last_mutation_at).getTime()<1000)throw new ApiError('Bir saniye bekle.',429);
   try{if(!(action.action==='resolve'&&state.version!==before.version))state=actTraining(state,action,Date.now());}catch(e){error=e instanceof Error?e.message:'Geçersiz antrenman hamlesi.';}
   await tx`update players set last_mutation_at=now() where id=${user}`;
  }
  if(state.version!==before.version){const done=state.game.phase==='finished';await tx`update training_sessions set state=${tx.json(state)},updated_at=now(),finished_at=${done?new Date():null} where id=${id}`;
   const score=trainingResult(state);if(score&&state.game.matchDeadline)await tx`insert into training_scores(session_id,player_id,mode,difficulty,score) values(${id},${user},${score.mode},${score.difficulty},${score.score}) on conflict(session_id) do nothing`;
  }
  return{state,error,nickname:row.nickname as string};
 });
 const {state,error,nickname}=result;return{id,code:id,version:state.version,closed:false,mode:state.mode,game:state.game,side:0,ownOrders:state.draft,serverTime:new Date().toISOString(),difficulty:state.difficulty,players:[{id:user,nickname,side:0,ready:false},{id:'computer',nickname:BOT_LEVELS[state.difficulty].name,side:1,ready:state.game.phase!=='playing'}],error};
}
export async function trainingLeaderboard(mode:TrainingState['mode'],difficulty:BotLevel){return database()`select p.nickname,max(s.score)::int as score from training_scores s join players p on p.id=s.player_id where s.mode=${mode} and s.difficulty=${difficulty} group by p.id,p.nickname order by score desc,p.nickname asc limit 50`;}
