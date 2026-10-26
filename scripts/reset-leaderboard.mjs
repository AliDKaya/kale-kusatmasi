import nextEnv from '@next/env';import postgres from 'postgres';
nextEnv.loadEnvConfig(process.cwd());
const ref=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
if(!new URL(process.env.DATABASE_URL).username.endsWith(`.${ref}`))throw new Error('Proje bağlantısı eşleşmiyor.');
const sql=postgres(process.env.DATABASE_URL,{ssl:'require',prepare:false,max:1});
try{
 const n=await sql.begin(async tx=>{const [row]=await tx`select count(*)::int as n from public.scores`;await tx`delete from public.scores`;await tx`select realtime.send('{"updated":true}'::jsonb,'changed','leaderboard',true)`;return row.n;});
 console.log('Skor tablosu sıfırlandı. Silinen kayıt:',n);
}finally{await sql.end();}
