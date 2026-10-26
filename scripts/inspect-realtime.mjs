import nextEnv from '@next/env';import postgres from 'postgres';
nextEnv.loadEnvConfig(process.cwd());const sql=postgres(process.env.DATABASE_URL,{ssl:'require',prepare:false,max:1});
try{
 console.log('DB clock:',await sql`select now(), current_date`);
 console.log('Realtime partitions:',await sql`select tablename from pg_tables where schemaname='realtime'`);
 console.log('Policies:',await sql`select policyname,roles,cmd from pg_policies where schemaname='realtime'`);
 console.log('Realtime functions:',await sql`select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='realtime' and (proname like '%part%' or proname like '%policy%' or proname='topic')`);
}finally{await sql.end();}
