import nextEnv from '@next/env';import postgres from 'postgres';nextEnv.loadEnvConfig(process.cwd());
const sql=postgres(process.env.DATABASE_URL,{ssl:'require',prepare:false,max:1});
try{console.log(await sql`select code,state->>'turn' as turn,state->>'phase' as phase,version from rooms where code=${process.argv[2]}`);console.log(await sql`select o.turn,o.ready,jsonb_array_length(o.payload) as orders from orders o join rooms r on r.id=o.room_id where r.code=${process.argv[2]} order by o.turn desc limit 6`);}finally{await sql.end();}
