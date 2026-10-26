import {test,expect,type Page} from '@playwright/test';
import {advanceIfNeeded,request} from './helpers';
import {loadEnvConfig} from '@next/env';
import postgres from 'postgres';
loadEnvConfig(process.cwd());

test('oda sahibi kapatabilir; kapanış canlı görünür, eski kod ve hamleler engellenir',async({browser,baseURL})=>{
 test.setTimeout(120000);
 const a=await browser.newContext(),b=await browser.newContext(),p=await a.newPage(),q=await b.newPage();
 const suffix=Date.now().toString().slice(-6);
 const sql=postgres(process.env.DATABASE_URL!,{ssl:'require',prepare:false,max:1});
 async function create(page:Page,name:string){await page.goto(baseURL!);await page.getByLabel('TAKMA ADIN').fill(name);await page.getByRole('button',{name:'Oda oluştur'}).click();await expect(page).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:20000});return page.url().split('/').pop()!;}
 async function join(code:string){await q.goto(baseURL!);await q.getByLabel('TAKMA ADIN').fill(`TestFlowB${suffix}`);await q.getByRole('button',{name:'Koda katıl',exact:true}).click();await q.getByLabel('ODA KODU').fill(code);await q.getByRole('button',{name:'Meydana katıl'}).click();await expect(q).toHaveURL(new RegExp(`/room/${code}$`),{timeout:20000});}
 async function close(){await p.getByRole('button',{name:'Odayı kapat',exact:true}).click();await p.getByRole('button',{name:'Evet, odayı kapat',exact:true}).click();await expect(p.getByRole('heading',{name:'Oda kapatıldı'})).toBeVisible();}
 try{
  const solo=await create(p,`TestFlowA${suffix}`);await close();expect((await request(p,`/api/rooms/${solo}`)).data.closed).toBe(true);expect(await p.evaluate(()=>localStorage.getItem('kk:room'))).toBeNull();
  const waiting=await create(p,`TestFlowA${suffix}`);await join(waiting);await expect(q.getByRole('button',{name:'Odayı kapat',exact:true})).toHaveCount(0);
  expect((await request(q,`/api/rooms/${waiting}`,{action:'close',operationId:crypto.randomUUID()})).status).toBe(403);
  await close();await expect(q.getByRole('heading',{name:'Oda kapatıldı'})).toBeVisible({timeout:15000});await q.reload();await expect(q.getByRole('heading',{name:'Oda kapatıldı'})).toBeVisible();
  expect((await request(q,'/api/rooms',{code:waiting,nickname:`TestFlowB${suffix}`})).status).toBe(410);
  expect((await request(q,`/api/rooms/${waiting}`,{action:'continue',turn:1,operationId:crypto.randomUUID()})).status).toBe(410);
  expect(await sql`select s.id from scores s join rooms r on r.id=s.room_id where r.code in (${solo},${waiting})`).toHaveLength(0);
  const active=await create(p,`TestFlowA${suffix}`);await join(active);await advanceIfNeeded(p,q,active);await new Promise(r=>setTimeout(r,1150));
  await p.getByRole('button',{name:'Odayı kapat',exact:true}).click();await expect(p.getByLabel('Odayı kapatma onayı')).toContainText('teslim sayılır');
  const operationId=crypto.randomUUID();const closed=await request(p,`/api/rooms/${active}`,{action:'close',operationId});expect(closed.status).toBe(200);expect(closed.data.closed).toBe(true);
  const replay=await request(p,`/api/rooms/${active}`,{action:'close',operationId});expect(replay.status).toBe(200);expect(replay.data.version).toBe(closed.data.version);
  const scores=await sql`select s.score,p.side from scores s join rooms r on r.id=s.room_id join room_players p on p.room_id=r.id and p.player_id=s.player_id where r.code=${active} order by p.side`;
  expect(scores.map(s=>s.score)).toEqual([220,420]);
  await expect(q.getByRole('heading',{name:'Oda kapatıldı'})).toBeVisible({timeout:15000});
  await q.setViewportSize({width:375,height:812});expect(await q.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
 }finally{await a.close();await b.close();await sql.end();}
});
