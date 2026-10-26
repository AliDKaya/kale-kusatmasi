import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
async function call(page:Page,url:string,body?:unknown){const token=await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith('-auth-token'));return key?JSON.parse(localStorage.getItem(key)!).access_token:null;});const response=await page.request.fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`},...(body?{data:body}:{})});return{status:response.status(),data:await response.json()};}
test('başlangıç ve tur sonucu iki ayrı hazır onayı bekler; sayaçlar kendiliğinden başlamaz',async({browser,baseURL})=>{
 test.setTimeout(120000);const a=await browser.newContext(),b=await browser.newContext();const p=await a.newPage(),q=await b.newPage();const suffix=Date.now().toString().slice(-6);const checks:Record<string,unknown>={};
 try{
  await p.goto(baseURL!);await p.getByLabel('TAKMA ADIN').fill(`TestFlowA${suffix}`);await p.getByRole('button',{name:'Oda oluştur'}).click();await expect(p).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:20000});const code=p.url().split('/').pop()!;
  await q.goto(baseURL!);await q.getByLabel('TAKMA ADIN').fill(`TestFlowB${suffix}`);await q.getByRole('button',{name:'Koda katıl',exact:true}).click();await q.getByLabel('ODA KODU').fill(code);await q.getByRole('button',{name:'Meydana katıl'}).click();await expect(q).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:20000});
  await expect(p.locator('.phase-ready-button')).toHaveText('Maça hazırım →',{timeout:15000});
  const initial=(await call(p,`/api/rooms/${code}`)).data;expect(initial.game.phase).toBe('waiting');expect(initial.game.matchDeadline).toBeUndefined();
  await new Promise(r=>setTimeout(r,16000));expect((await call(p,`/api/rooms/${code}`)).data.game.phase).toBe('waiting');checks.noAutomaticStartAfter15s=true;
  await p.locator('.phase-ready-button').click();await expect(q.locator('.map-readiness')).toContainText('Rakip: HAZIR',{timeout:10000});expect((await call(q,`/api/rooms/${code}`)).data.game.phase).toBe('waiting');checks.firstReadyVisible=true;
  await q.locator('.phase-ready-button').click();await expect(p.locator('.ready-button')).toHaveText('Emirlerim hazır · Kilitle →',{timeout:10000});
  const started=(await call(p,`/api/rooms/${code}`)).data;expect(started.game.phase).toBe('playing');expect(started.game.matchDeadline).toBeTruthy();checks.bothStartFirstRound=true;
  await p.getByRole('button',{name:/^A: Batı Kalesi/}).click();await p.locator('.ready-button').click();await expect(q.locator('.map-readiness')).toContainText('Rakip: HAZIR');
  expect((await call(q,`/api/rooms/${code}`)).data.game.phase).toBe('playing');await q.locator('.ready-button').click();
  await expect(p.locator('.phase-panel')).toContainText('Hamleleri okuyun',{timeout:10000});const review=(await call(p,`/api/rooms/${code}`)).data;expect(review.game.phase).toBe('review');expect(review.game.turn).toBe(2);
  await new Promise(r=>setTimeout(r,16000));const held=(await call(p,`/api/rooms/${code}`)).data;expect(held.game.phase).toBe('review');expect(held.game.turn).toBe(2);checks.resultWaitsBeyond15s=true;
  await p.locator('.phase-ready-button').click();expect((await call(q,`/api/rooms/${code}`)).data.game.phase).toBe('review');await expect(q.locator('.map-readiness')).toContainText('Rakip: HAZIR');checks.singleContinueDoesNotStart=true;
  await q.locator('.phase-ready-button').click();await expect(p.locator('.ready-button')).toBeVisible({timeout:10000});const next=(await call(p,`/api/rooms/${code}`)).data;expect(next.game.phase).toBe('playing');expect(next.game.turn).toBe(2);expect(next.game.matchDeadline).toBe(started.game.matchDeadline);checks.bothContinueStartNewRound=true;
  const bar=await p.locator('.map-readiness').boundingBox(),map=await p.locator('.map-frame').boundingBox();expect(map!.y-(bar!.y+bar!.height)).toBeLessThan(60);checks.readyImmediatelyAboveMap=true;
  await p.setViewportSize({width:375,height:812});expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);mkdirSync('tmp/evidence',{recursive:true});await p.locator('.map-section').screenshot({path:'tmp/evidence/ready-above-map.png'});checks.mobile375=true;
 }finally{mkdirSync('tmp/evidence',{recursive:true});writeFileSync('tmp/evidence/flow.json',JSON.stringify({baseURL,date:new Date().toISOString(),checks},null,2));await a.close();await b.close();}
});
