import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
type View={id:string;code:string;version:number;side:0|1;players:{id:string;nickname:string;ready:boolean}[];ownOrders:unknown[];game:{turn:number;phase:string;players:{gold:number;wood:number;hp:number}[];regions:Record<string,{army:{piyade:number}}>}};
async function call(page:Page,url:string,body?:unknown){return page.evaluate(async({url,body})=>{
 const key=Object.keys(localStorage).find(k=>k.endsWith('-auth-token'));
 const auth=key?JSON.parse(localStorage.getItem(key)!):null;
 const r=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${auth?.access_token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json()};
 },{url,body});}
test('gerçek iki bağlam: gizlilik, tur yarışı, Presence, yeniden bağlanma, skor ve mobil',async({browser,baseURL})=>{
 test.setTimeout(180000);
 const a=await browser.newContext(),b=await browser.newContext(),c=await browser.newContext();
 const p=await a.newPage(),q=await b.newPage(),r=await c.newPage();
 for(const [label,page] of [['A',p],['B',q]] as const){page.on('pageerror',e=>console.log(label,'pageerror',e.message));page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/rooms'))console.log(label,new URL(r.url()).pathname,r.status());});}
 const suffix=Date.now().toString().slice(-6);const nickA=`TestBati${suffix}`,nickB=`TestDogu${suffix}`,nickC=`TestDiger${suffix}`;
 const checks:Record<string,unknown>={};const rooms:string[]=[];const users:string[]=[];
 mkdirSync('tmp/evidence',{recursive:true});
 try{
  await p.goto(baseURL!);await p.getByLabel('TAKMA ADIN').fill(nickA);await p.getByRole('button',{name:'Oda oluştur'}).click();await expect(p).toHaveURL(/\/room\/[A-Z2-9]{6}$/);
  const code=p.url().split('/').pop()!;rooms.push(code);
  await q.goto(baseURL!);await q.getByLabel('TAKMA ADIN').fill(nickB);await q.getByRole('button',{name:'Koda katıl',exact:true}).click();await q.getByLabel('ODA KODU').fill(code);await q.getByRole('button',{name:'Meydana katıl'}).click();await expect(q).toHaveURL(new RegExp(`/room/${code}$`));
  await expect(p.locator('.player-banner').filter({hasText:nickB})).toBeVisible({timeout:12000});await expect(q.locator('.player-banner').filter({hasText:nickA})).toBeVisible({timeout:12000});
  await expect(p.locator('.player-banner').filter({hasText:nickB})).toContainText('Çevrimiçi',{timeout:12000});checks.presence=true;
  let s=(await call(p,`/api/rooms/${code}`)).data as View;users.push(...s.players.map(x=>x.id));
  const turn=s.game.turn;const before=s.game.regions.A.army.piyade;
  await p.getByRole('button',{name:/^A: Batı Kalesi/}).click();await expect(p.locator('.order-list')).toContainText('Piyade');
  await expect.poll(async()=>((await call(p,`/api/rooms/${code}`)).data as View).ownOrders.length).toBe(1);
  const enemy=(await call(q,`/api/rooms/${code}`)).data as View;expect(enemy.ownOrders).toEqual([]);expect(enemy.game.players[0].gold).toBe(12);checks.secretOrders=true;
  await p.getByRole('button',{name:/Hazırım/}).click();await expect(q.locator('.player-banner').filter({hasText:nickA})).toContainText('Hazır ✓');
  const start=Date.now();await q.getByRole('button',{name:/Hazırım/}).click();
  await expect.poll(async()=>((await call(p,`/api/rooms/${code}`)).data as View).game.turn).toBe(turn+1);
  await expect(p.locator('.turn-block')).toContainText(`TUR ${turn+1}`);await expect(q.locator('.turn-block')).toContainText(`TUR ${turn+1}`);
  s=(await call(p,`/api/rooms/${code}`)).data as View;expect(s.game.regions.A.army.piyade).toBe(before+1);checks.syncLatencyMs=Date.now()-start;
  // Exact operation retry must apply once; old turn, invalid ownership and overspend must fail.
  await new Promise(res=>setTimeout(res,1100));
  const op={action:'orders',operationId:crypto.randomUUID(),turn:s.game.turn,orders:[{type:'defend',at:'A'}],ready:false};
  const accepted=await call(p,`/api/rooms/${code}`,op);expect(accepted.status).toBe(200);
  const retry=await call(p,`/api/rooms/${code}`,op);expect(retry.status).toBe(200);expect(retry.data.version).toBe(accepted.data.version);
  expect((await call(p,`/api/rooms/${code}`,{...op,turn:1,operationId:crypto.randomUUID()})).status).toBe(409);
  await new Promise(res=>setTimeout(res,1100));
  expect((await call(p,`/api/rooms/${code}`,{...op,operationId:crypto.randomUUID(),orders:[{type:'move',from:'A',to:'G',army:{piyade:1,okcu:0,kusatma:0}}]})).status).toBe(400);
  expect((await call(p,`/api/rooms/${code}`,{...op,operationId:crypto.randomUUID(),orders:[{type:'move',from:'A',to:'B',army:{piyade:99,okcu:0,kusatma:0}}]})).status).toBe(400);
  expect((await call(p,`/api/rooms/${code}`,{...op,operationId:crypto.randomUUID(),skor:999})).status).toBe(400);checks.validation=true;
  await p.reload();await expect(p.locator('.player-banner')).toContainText([nickA,nickB]);checks.reload=true;
  await b.setOffline(true);await expect(q.locator('.connection-warning')).toBeVisible();await b.setOffline(false);await expect(q.locator('.connection-warning')).toBeHidden({timeout:15000});checks.reconnect=true;
  await r.goto(baseURL!);await r.getByLabel('TAKMA ADIN').fill(nickC);await r.getByRole('button',{name:'Oda oluştur'}).click();await expect(r).toHaveURL(/\/room\/[A-Z2-9]{6}$/);const other=r.url().split('/').pop()!;rooms.push(other);
  const otherState=(await call(r,`/api/rooms/${other}`)).data as View;users.push(...otherState.players.map(x=>x.id));expect(otherState.game).toBeNull();
  expect((await call(r,`/api/rooms/${code}`)).status).toBe(403);expect((await call(r,'/api/rooms',{nickname:nickC,code})).status).toBe(409);checks.isolation=true;
  await p.setViewportSize({width:375,height:812});expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const targets=await p.locator('.region').evaluateAll(elements=>elements.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));expect(targets.every(t=>t.w>=44&&t.h>=44)).toBe(true);await p.screenshot({path:'tmp/evidence/mobile-battle.png',fullPage:true});checks.mobile375=true;
  // Expiry is controlled by active clients. Resolve requests race safely under the same room lock.
  while(true){
   s=(await call(p,`/api/rooms/${code}`)).data as View;if(s.game.phase==='finished')break;
   await new Promise(res=>setTimeout(res,1150));
   await Promise.all([call(p,`/api/rooms/${code}`,{action:'orders',operationId:crypto.randomUUID(),turn:s.game.turn,orders:[],ready:true}),call(q,`/api/rooms/${code}`,{action:'orders',operationId:crypto.randomUUID(),turn:s.game.turn,orders:[],ready:true})]);
   const race=await Promise.all([call(p,`/api/rooms/${code}`,{action:'resolve',operationId:crypto.randomUUID(),turn:s.game.turn}),call(q,`/api/rooms/${code}`,{action:'resolve',operationId:crypto.randomUUID(),turn:s.game.turn})]);
   expect(race.every(x=>x.status===200)).toBe(true);
  }
  checks.atomicResolution=true;
  await p.goto(`${baseURL}/leaderboard`);await expect(p.locator('.score-table')).toContainText(nickA);await expect(p.locator('.own-score')).toContainText(nickA);
  const scoreboard=await p.request.get(`${baseURL}/api/leaderboard`);expect(scoreboard.status()).toBe(200);const scores=await scoreboard.json();expect(Object.keys(scores)).toEqual(['skorlar']);expect(Object.keys(scores.skorlar[0]).sort()).toEqual(['ad','sira','skor','zaman']);
  expect(scores.skorlar.filter((x:{ad:string})=>x.ad===nickA)).toHaveLength(1);checks.scoreContract=true;
  await p.getByRole('button',{name:'Bugün',exact:true}).click();await expect(p.locator('.score-table')).toContainText(nickA);checks.filters=true;
  await p.keyboard.press('Tab');expect(await p.evaluate(()=>document.activeElement?.tagName)).not.toBe('BODY');checks.keyboard=true;
  await p.screenshot({path:'tmp/evidence/mobile-leaderboard.png',fullPage:true});
  await q.close();checks.departure=true;
 }finally{
  writeFileSync('tmp/evidence/integration.json',JSON.stringify({baseURL,date:new Date().toISOString(),checks},null,2));
  writeFileSync('tmp/test-cleanup.json',JSON.stringify({rooms,users},null,2));
  await a.close();await b.close();await c.close();
 }
});
