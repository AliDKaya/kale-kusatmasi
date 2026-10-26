import {advanceIfNeeded} from './helpers';
import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
async function call(page:Page,url:string,body?:unknown){const token=await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith('-auth-token'));return key?JSON.parse(localStorage.getItem(key)!).access_token:null;});const response=await page.request.fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`},...(body?{data:body}:{})});return{status:response.status(),data:await response.json()};}
test('sonuç özeti harita üstünde ve puan dökümü sunucu skoruyla aynı',async({browser,baseURL})=>{
 const a=await browser.newContext(),b=await browser.newContext();const p=await a.newPage(),q=await b.newPage();const suffix=Date.now().toString().slice(-6);const nameA=`TestFinalA${suffix}`,nameB=`TestFinalB${suffix}`;let code='';const users:string[]=[];
 try{
  await p.goto(baseURL!);await p.getByLabel('TAKMA ADIN').fill(nameA);await p.getByRole('button',{name:'Oda oluştur'}).focus();await p.keyboard.press('Enter');await expect(p).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:15000});code=p.url().split('/').pop()!;
  await q.goto(baseURL!);await q.getByLabel('TAKMA ADIN').fill(nameB);await q.getByRole('button',{name:'Koda katıl',exact:true}).click();await q.getByLabel('ODA KODU').fill(code);await q.getByRole('button',{name:'Meydana katıl'}).click();await expect(q).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:15000});
  await expect.poll(async()=>((await call(p,`/api/rooms/${code}`)).data.players.length),{timeout:15000}).toBe(2);const view=(await call(p,`/api/rooms/${code}`)).data;users.push(...view.players.map((m:{id:string})=>m.id));await advanceIfNeeded(p,q,code);
  expect((await call(p,`/api/rooms/${code}`,{action:'surrender',turn:view.game.turn,operationId:crypto.randomUUID()})).status).toBe(200);
  await expect(p.locator('.match-summary')).toBeVisible({timeout:10000});await expect(p.locator('.match-summary h2')).toHaveText('Rakibin kazandı.');await expect(q.locator('.match-summary h2')).toHaveText('Zafer senin!',{timeout:10000});
  await expect(p.locator('.your-score .match-total strong')).toHaveText('220');await expect(q.locator('.your-score .match-total strong')).toHaveText('420');
  const scores=await(await p.request.get(`${baseURL}/api/leaderboard`)).json();expect(scores.skorlar.find((r:{ad:string})=>r.ad===nameA).skor).toBe(220);expect(scores.skorlar.find((r:{ad:string})=>r.ad===nameB).skor).toBe(420);
  const summary=await p.locator('.match-summary').boundingBox(),map=await p.locator('.map-frame').boundingBox();expect(summary!.y).toBeLessThan(map!.y);
  await p.setViewportSize({width:375,height:812});expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);mkdirSync('tmp/evidence',{recursive:true});await p.locator('.match-summary').screenshot({path:'tmp/evidence/result-summary.png'});
  await p.goto(`${baseURL}/rapor`);await expect(p.locator('.audit-summary')).toContainText('80');
  writeFileSync('tmp/evidence/result.json',JSON.stringify({baseURL,date:new Date().toISOString(),checks:{keyboardMainAction:true,resultAboveMap:true,loserScore:220,winnerScore:420,scoreMatchesAPI:true,mobile375:true,report80:true}},null,2));
 }finally{let prior={rooms:[] as string[],users:[] as string[]};try{prior=JSON.parse(readFileSync('tmp/test-cleanup.json','utf8'));}catch{}writeFileSync('tmp/test-cleanup.json',JSON.stringify({rooms:[...new Set([...prior.rooms,...(code?[code]:[])])],users:[...new Set([...prior.users,...users])]},null,2));await a.close();await b.close();}
});
