import { test,expect,type Page } from '@playwright/test';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';
loadEnvConfig(process.cwd());
async function call(page:Page,url:string,body?:unknown){
 const token=await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith('-auth-token'));return key?JSON.parse(localStorage.getItem(key)!).access_token:null;});
 const response=await page.request.fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`},...(body?{data:body}:{})});return {status:response.status(),data:await response.json()};
}
test('skor: canlı bildirim, 10 dışı sıra, eşitlik, tarih filtresi ve yetkisiz yazma',async({browser,baseURL})=>{
 test.setTimeout(180000);const a=await browser.newContext(),b=await browser.newContext(),c=await browser.newContext();
 const p=await a.newPage(),q=await b.newPage(),r=await c.newPage();const suffix=Date.now().toString().slice(-6);
 const nA=`TestSkorA${suffix}`,nB=`TestSkorB${suffix}`,nC=`TestSkorC${suffix}`;
 const rooms:string[]=[],users:string[]=[],checks:Record<string,unknown>={};
 const sql=postgres(process.env.DATABASE_URL!,{ssl:'require',prepare:false,max:1});
 try{
  await p.goto(baseURL!);await p.getByLabel('TAKMA ADIN').fill(nA);await p.getByRole('button',{name:'Oda oluştur'}).click();await expect(p).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:15000});
  let code=p.url().split('/').pop()!;rooms.push(code);
  await q.goto(baseURL!);await q.getByLabel('TAKMA ADIN').fill(nB);await q.getByRole('button',{name:'Koda katıl',exact:true}).click();await q.getByLabel('ODA KODU').fill(code);await q.getByRole('button',{name:'Meydana katıl'}).click();await expect(q).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:15000});
  await expect.poll(async()=>((await call(p,`/api/rooms/${code}`)).data).players.length,{timeout:15000}).toBe(2);
  const state=(await call(p,`/api/rooms/${code}`)).data;users.push(...state.players.map((m:{id:string})=>m.id));
  await r.goto(`${baseURL}/leaderboard`);await expect(r.locator('.live-label')).toContainText('CANLI GÜNCELLENİYOR',{timeout:15000});
  const started=Date.now();expect((await call(p,`/api/rooms/${code}`,{action:'surrender',turn:1,operationId:crypto.randomUUID()})).status).toBe(200);
  await expect(r.locator('.score-table')).toContainText(nB,{timeout:10000});checks.liveScoreLatencyMs=Date.now()-started;
  // Five more real, completed controlled matches; the same users are reused to conserve anonymous-login quota.
  for(let i=0;i<5;i++){
   await new Promise(res=>setTimeout(res,5200));
   const created=await call(p,'/api/rooms',{nickname:nA});expect(created.status).toBe(200);code=created.data.code;rooms.push(code);
   expect((await call(q,'/api/rooms',{nickname:nB,code})).status).toBe(200);await new Promise(res=>setTimeout(res,1100));
   expect((await call(p,`/api/rooms/${code}`,{action:'surrender',turn:1,operationId:crypto.randomUUID()})).status).toBe(200);
  }
  await new Promise(res=>setTimeout(res,1100));
  const created=await call(r,'/api/rooms',{nickname:nC});expect(created.status).toBe(200);code=created.data.code;rooms.push(code);
  expect((await call(q,'/api/rooms',{nickname:nB,code})).status).toBe(200);await new Promise(res=>setTimeout(res,1100));
  const final=(await call(r,`/api/rooms/${code}`)).data;users.push(...final.players.map((m:{id:string})=>m.id).filter((id:string)=>!users.includes(id)));
  const end={action:'surrender',turn:1,operationId:crypto.randomUUID()};
  // Opponent was scored <5 seconds ago. Whole result must roll back until the cooldown expires.
  const early=await call(r,`/api/rooms/${code}`,end);expect(early.status).toBe(429);checks.scoreCooldown=true;
  await new Promise(res=>setTimeout(res,5200));expect((await call(r,`/api/rooms/${code}`,end)).status).toBe(200);
  expect((await call(r,`/api/rooms/${code}`,end)).status).toBe(200);
  expect((await call(r,`/api/rooms/${code}`,{action:'orders',turn:1,operationId:crypto.randomUUID(),orders:[],ready:true})).status).toBe(409);
  const record=await sql`select count(*)::int as n from scores s join rooms r on r.id=s.room_id where r.code=${code}`;expect(record[0].n).toBe(2);checks.uniqueScore=true;
  await r.goto(`${baseURL}/leaderboard`);await expect(r.locator('.own-outside')).toContainText(/Sen: \d+\. sıra/,{timeout:12000});checks.outsideTop10=true;
  await r.setViewportSize({width:375,height:812});expect(await r.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);await r.screenshot({path:'tmp/evidence/outside-top10.png',fullPage:true});
  const top=await (await r.request.get(`${baseURL}/api/leaderboard`)).json();expect(top.skorlar).toHaveLength(10);
  for(let i=1;i<top.skorlar.length;i++){const prev=top.skorlar[i-1],next=top.skorlar[i];expect(prev.skor>=next.skor).toBe(true);if(prev.skor===next.skor)expect(new Date(prev.zaman).getTime()<=new Date(next.zaman).getTime()).toBe(true);}checks.rankingAndTies=true;
  // Only a controlled completed test score gets a historical timestamp, then is restored.
  const [row]=await sql`select id,created_at from scores where player_id=${users[users.length-1]} order by created_at desc limit 1`;
  await sql`update scores set created_at=now()-interval '2 days' where id=${row.id}`;
  try{await r.getByRole('button',{name:'Bugün',exact:true}).click();await expect(r.locator('.own-outside')).toBeHidden();await r.getByRole('button',{name:'Tüm zamanlar',exact:true}).click();await expect(r.locator('.own-outside')).toBeVisible();checks.dateFilter=true;}finally{await sql`update scores set created_at=${row.created_at} where id=${row.id}`;}
  const direct=await r.evaluate(async({url,key})=>{const stored=Object.keys(localStorage).find(k=>k.endsWith('-auth-token'))!;const auth=JSON.parse(localStorage.getItem(stored)!);const res=await fetch(`${url}/rest/v1/scores`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${auth.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({score:999,nickname:'Hile'})});return res.status;},{url:process.env.NEXT_PUBLIC_SUPABASE_URL!,key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!});
  expect([401,403]).toContain(direct);checks.directWriteDenied=direct;
 }finally{
  mkdirSync('tmp/evidence',{recursive:true});writeFileSync('tmp/evidence/scoreboard.json',JSON.stringify({baseURL,date:new Date().toISOString(),checks},null,2));
  let previous={rooms:[] as string[],users:[] as string[]};try{previous=JSON.parse(readFileSync('tmp/test-cleanup.json','utf8'));}catch{}
  writeFileSync('tmp/test-cleanup.json',JSON.stringify({rooms:[...new Set([...previous.rooms,...rooms])],users:[...new Set([...previous.users,...users])]},null,2));
  await sql.end();await a.close();await b.close();await c.close();
 }
});
