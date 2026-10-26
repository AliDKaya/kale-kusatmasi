import {test,expect} from '@playwright/test';
import {advanceIfNeeded,request} from './helpers';
import {mkdirSync,writeFileSync} from 'node:fs';
test('sınırlı gelir, taraf renkli tur geçmişi ve mobil harita',async({browser,baseURL})=>{
 test.setTimeout(90000);const a=await browser.newContext(),b=await browser.newContext(),p=await a.newPage(),q=await b.newPage();const suffix=Date.now().toString().slice(-6);const checks:Record<string,unknown>={};
 try{
  await p.goto(baseURL!);await p.getByLabel('TAKMA ADIN').fill(`TestJournalA${suffix}`);await p.getByRole('button',{name:'Oda oluştur'}).click();await expect(p).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:20000});const code=p.url().split('/').pop()!;
  await q.goto(baseURL!);await q.getByLabel('TAKMA ADIN').fill(`TestJournalB${suffix}`);await q.getByRole('button',{name:'Koda katıl',exact:true}).click();await q.getByLabel('ODA KODU').fill(code);await q.getByRole('button',{name:'Meydana katıl'}).click();await expect(q).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:20000});
  await advanceIfNeeded(p,q,code);const initial=(await request(p,`/api/rooms/${code}`)).data;expect(initial.game.players[0].gold).toBe(8);expect(initial.game.players[0].wood).toBe(5);checks.initialResources=true;
  await new Promise(r=>setTimeout(r,1150));
  for(const [page,orders] of [[p,[{type:'recruit',at:'A',unit:'piyade'}]],[q,[]]] as const){expect((await request(page,`/api/rooms/${code}`,{action:'orders',turn:1,orders,ready:true,operationId:crypto.randomUUID()})).status).toBe(200);}
  let state=(await request(p,`/api/rooms/${code}`)).data;expect(state.game.phase).toBe('review');expect(state.game.players[0].gold).toBe(6);expect(state.game.players[0].wood).toBe(5);checks.baseIncome=true;await p.reload();await expect(p.locator('.phase-panel')).toContainText('Hamleleri okuyun');expect((await request(p,`/api/rooms/${code}`)).data.game.phase).toBe('review');checks.reviewReload=true;
  await advanceIfNeeded(p,q,code);await new Promise(r=>setTimeout(r,1150));
  expect((await request(p,`/api/rooms/${code}`,{action:'orders',turn:2,orders:[{type:'move',from:'A',to:'B',army:{piyade:1,okcu:0,kusatma:0}}],ready:true,operationId:crypto.randomUUID()})).status).toBe(200);
  expect((await request(q,`/api/rooms/${code}`,{action:'orders',turn:2,orders:[],ready:true,operationId:crypto.randomUUID()})).status).toBe(200);
  state=(await request(p,`/api/rooms/${code}`)).data;expect(state.game.players[0].gold).toBe(7);expect(state.game.players[0].wood).toBe(8);expect(state.game.history.map((h:{turn:number})=>h.turn)).toEqual([1,2]);checks.forestIncome=true;checks.historyPreserved=true;
  await expect(p.locator('.journal-round')).toHaveCount(2);await expect(p.locator('.journal-round').first()).toContainText('2. tur sonuçları');await expect(p.locator('.journal-event.side-0').first()).toBeVisible();checks.sideColors=true;
  mkdirSync('tmp/evidence',{recursive:true});await p.locator('.battle-layout').screenshot({path:'tmp/evidence/journal-desktop.png'});
  await p.setViewportSize({width:375,height:812});expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);await p.locator('.battle-layout').screenshot({path:'tmp/evidence/journal-mobile.png'});checks.mobile375=true;
 }finally{mkdirSync('tmp/evidence',{recursive:true});writeFileSync('tmp/evidence/journal.json',JSON.stringify({baseURL,date:new Date().toISOString(),checks},null,2));await a.close();await b.close();}
});
