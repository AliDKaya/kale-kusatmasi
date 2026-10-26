import nextEnv from '@next/env';import postgres from 'postgres';
nextEnv.loadEnvConfig(process.cwd());const sql=postgres(process.env.DATABASE_URL,{ssl:'require',prepare:false,max:1});
const pattern='^Test(Bati|Dogu|Diger|SkorA|SkorB|SkorC|UiA|UiB|FinalA|FinalB)[0-9]{6}$';
try{
 const result=await sql.begin(async tx=>{
  const rooms=await tx`select r.id from rooms r join room_players p on p.room_id=r.id where r.created_at>=now()-interval '6 hours' group by r.id having bool_and(p.nickname ~ ${pattern})`;
  if(!rooms.length)return{rooms:0,scores:0,users:[]};const ids=rooms.map(r=>r.id);
  const members=await tx`select distinct player_id from room_players where room_id in ${tx(ids)}`;
  const removed=await tx`delete from scores where room_id in ${tx(ids)} returning id`;
  await tx`delete from rooms where id in ${tx(ids)}`;
  await tx`select realtime.send('{"updated":true}'::jsonb,'changed','leaderboard',true)`;
  return{rooms:ids.length,scores:removed.length,users:members.map(m=>m.player_id)};
 });
 if(result.users.length)await sql`delete from auth.users where id in ${sql(result.users)} and is_anonymous=true and not exists(select 1 from public.room_players p where p.player_id=auth.users.id)`;
 console.log('Kontrollü test verisi temizlendi:',{rooms:result.rooms,scores:result.scores,users:result.users.length});
}finally{await sql.end();}
