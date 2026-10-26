import nextEnv from '@next/env';
import { spawn } from 'node:child_process';
nextEnv.loadEnvConfig(process.cwd());
const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','DATABASE_URL'];
for(const name of names){
 const value=process.env[name];if(!value||value.includes('[YOUR-PASSWORD]'))throw new Error(`${name} eksik.`);
 const args=`npx.cmd --yes vercel env add ${name} --environment production --yes --force ${name==='DATABASE_URL'?'--sensitive':'--no-sensitive'}`;
 await new Promise((resolve,reject)=>{
  const child=spawn('cmd.exe',['/d','/s','/c',args],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  child.stdin.end(value);
  child.on('error',reject);child.on('close',code=>{
   if(code===0){console.log(`${name}: production ortamına yüklendi.`);resolve();}
   else{for(const n of names)if(process.env[n])output=output.split(process.env[n]).join('[REDACTED]');console.error(output);reject(new Error(`Vercel env çıkış kodu ${code}`));}
  });
 });
}
