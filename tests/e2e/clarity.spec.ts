import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
async function call(page:Page,url:string,body?:unknown){const token=await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith('-auth-token'));return key?JSON.parse(localStorage.getItem(key)!).access_token:null;});const response=await page.request.fetch(url,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`},...(body?{data:body}:{})});return{status:response.status(),data:await response.json()};}
test('yeni arayüz: rehber, hareket, taraflar, ses, mobil, ayrılma ve geçersiz kod',async({browser,baseURL})=>{
 test.setTimeout(90000);const a=await browser.newContext({permissions:['clipboard-read','clipboard-write']}),b=await browser.newContext();const p=await a.newPage(),q=await b.newPage();
 const suffix=Date.now().toString().slice(-6);const nickname=`TestUiA${suffix}`;let code='';const users:string[]=[];const checks:Record<string,unknown>={};
 try{
  await p.goto(baseURL!);await p.getByLabel('TAKMA ADIN').fill(nickname);await p.getByRole('button',{name:'Oda oluştur'}).click();await expect(p).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:15000});code=p.url().split('/').pop()!;
  await expect(p.getByRole('region',{name:'Nasıl oynanır'})).toContainText('Ordunu haritaya çıkar');checks.help=true;
  await p.getByRole('button',{name:'Oda kodunu kopyala'}).click();expect(await p.evaluate(()=>navigator.clipboard.readText())).toBe(code);checks.clipboard=true;
  await p.evaluate(()=>{const target=window as unknown as Window&{__tones:number};target.__tones=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){target.__tones++;return original.call(this);};});
  await p.getByRole('button',{name:'Ses kapalı'}).click();await expect.poll(()=>p.evaluate(()=>(window as unknown as Window&{__tones:number}).__tones)).toBeGreaterThan(0);checks.webAudio=true;
  await q.goto(baseURL!);await q.getByLabel('TAKMA ADIN').fill(`TestUiB${suffix}`);await q.getByRole('button',{name:'Koda katıl',exact:true}).click();await q.getByLabel('ODA KODU').fill('ZZZZZZ');await q.getByRole('button',{name:'Meydana katıl'}).click();await expect(q.locator('.error[role=alert]')).toContainText('bulunamadı');checks.invalidCode=true;
  await q.getByLabel('ODA KODU').fill(code);await q.getByRole('button',{name:'Meydana katıl'}).click();await expect(q).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:15000});
  await expect(p.locator('.planning-status')).toContainText('aynı anda');await expect(p.locator('.player-banner').filter({hasText:`TestUiB${suffix}`})).toContainText('Çevrimiçi',{timeout:15000});
  const snapshot=(await call(p,`/api/rooms/${code}`)).data;users.push(...snapshot.players.map((m:{id:string})=>m.id));
  await p.getByRole('button',{name:'Hareket / Saldırı'}).click();await p.getByRole('button',{name:/^A: Batı Kalesi/}).click();await expect(p.locator('.army-picker')).toBeVisible();await p.getByRole('button',{name:/^B: Kuzey Ormanı/}).click();await expect(p.locator('.order-list')).toContainText('A → B');
  await p.getByRole('button',{name:/Hazırım/}).click();await expect(p.locator('.readiness-chips')).toContainText('Sen: HAZIR');
  const turn=(await call(q,`/api/rooms/${code}`)).data.game.turn;
  expect((await call(q,`/api/rooms/${code}`,{action:'orders',operationId:crypto.randomUUID(),turn,orders:[],ready:true})).status).toBe(200);
  await expect(p.locator('.region').filter({hasText:'Kuzey Ormanı'})).toContainText('SEN');await expect(p.locator('.region').filter({hasText:'Kuzey Ormanı'}).locator('img')).toHaveAttribute('src','/images/piyade.jpg');checks.garrison=true;
  await expect(p.locator('.marcher')).toHaveCount(1);checks.movementAnimation=true;
  await p.setViewportSize({width:375,height:812});expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);await p.screenshot({path:'tmp/evidence/clear-mobile-map.png',fullPage:true});
  await q.close();await expect(p.locator('.player-banner').filter({hasText:`TestUiB${suffix}`})).toContainText('Bağlantı yok',{timeout:15000});checks.departure=true;
  await p.getByRole('button',{name:'Ses açık'}).click();await expect(p.getByRole('button',{name:'Ses kapalı'})).toHaveAttribute('aria-pressed','false');checks.mute=true;
  await p.keyboard.press('Tab');expect(await p.evaluate(()=>document.activeElement?.tagName)).not.toBe('BODY');checks.keyboard=true;
 }finally{
  mkdirSync('tmp/evidence',{recursive:true});writeFileSync('tmp/evidence/clarity.json',JSON.stringify({baseURL,date:new Date().toISOString(),checks},null,2));let previous={rooms:[] as string[],users:[] as string[]};try{previous=JSON.parse(readFileSync('tmp/test-cleanup.json','utf8'));}catch{}
  writeFileSync('tmp/test-cleanup.json',JSON.stringify({rooms:[...new Set([...previous.rooms,...(code?[code]:[])])],users:[...new Set([...previous.users,...users])]},null,2));await a.close();await b.close();
 }
});
