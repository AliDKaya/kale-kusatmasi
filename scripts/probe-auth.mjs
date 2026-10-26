import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const r=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}});
const data=await r.json();
console.log('Auth settings status:',r.status,'anonymous:',data.external?.anonymous_users??data.external?.anonymous??'not-listed','error:',data.code??null);
