import nextEnv from '@next/env';
import postgres from 'postgres';
nextEnv.loadEnvConfig(process.cwd());
const uri=process.env.DATABASE_URL??'';
const ready=!!uri&&!uri.includes('[YOUR-PASSWORD]');
console.log('Ortam:',{url:!!process.env.NEXT_PUBLIC_SUPABASE_URL,key:!!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,database:ready,whitespace:uri!==uri.trim()});
if(ready){
 const sql=postgres(uri,{ssl:'require',prepare:false,max:1,connect_timeout:10});
 try{
  const rows=await sql`select tablename,rowsecurity from pg_tables where schemaname='public' and tablename in ('players','rooms','room_players','orders','operations','scores')`;
  console.log('Tablolar:',rows.map(r=>`${r.tablename}: RLS ${r.rowsecurity}`).sort());
 }catch(e){console.log('Bağlantı hata kodu:',e.code??e.name);process.exitCode=1;}finally{await sql.end({timeout:2});}
}
