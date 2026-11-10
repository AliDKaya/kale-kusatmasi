import {chromium,type BrowserContext} from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.UI_TEST_BASE_URL??'http://localhost:3004';
async function main(){
 const browser=await chromium.launch({executablePath:'C:/Users/alik7/AppData/Local/Programs/Opera GX/opera.exe',headless:true});
 for(const broken of [false,true]){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.routeWebSocket('**/realtime/**',ws=>ws.close());const p=await context.newPage();
 const epoch=Math.floor(Date.now()/1000);const uid='00000000-0000-4000-8000-000000000042';let signups=0,refreshes=0,reads=0,rejectedReads=0;const writes:string[]=[];let closed=false;
 const auth=(generation:number)=>({access_token:Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:uid,exp:epoch+3600,generation})).toString('base64url')+'.signature',refresh_token:'test-refresh-'+generation,expires_in:3600,expires_at:epoch+3600,token_type:'bearer',user:{id:uid,aud:'authenticated',role:'authenticated',is_anonymous:true,app_metadata:{},user_metadata:{}}});
 await p.route('**/auth/v1/**',async route=>{const request=route.request(),url=new URL(request.url());const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, OPTIONS'};if(request.method()==='OPTIONS'){await route.fulfill({headers,status:200});return;}if(url.pathname.endsWith('/signup')){signups++;await route.fulfill({headers,json:auth(0)});return;}if(url.pathname.endsWith('/token')){refreshes++;await route.fulfill({headers,status:broken?400:200,json:broken?{error_code:'refresh_token_not_found',msg:'Refresh Token Not Found'}:auth(refreshes)});return;}await route.fulfill({headers,json:auth(refreshes).user});});
 const snapshot=()=>({id:uid,code:'TEST22',version:closed?2:1,closed,mode:'classic',game:null,side:0,ownOrders:[],serverTime:new Date().toISOString(),players:[{id:uid,nickname:'Oturum kontrolü',side:0,ready:false}]});
 await p.route('**/api/rooms/TEST22',async route=>{const req=route.request();if(req.method()==='POST'){writes.push(req.postData()!);if(writes.length===1){await route.fulfill({status:401,json:{error:'Oturum doğrulanamadı.'}});return;}closed=true;await route.fulfill({json:snapshot()});return;}reads++;if(broken||req.headers().authorization===`Bearer ${auth(0).access_token}`){rejectedReads++;await route.fulfill({status:401,json:{error:'Oturum doğrulanamadı.'}});return;}await route.fulfill({json:snapshot()});});
 await p.goto(base+'/room/TEST22');
 if(broken){await p.getByRole('alert').filter({hasText:'Oturum yenilenemedi'}).waitFor({timeout:15000});assert.ok(await p.getByRole('button',{name:'Odayı kapat',exact:true}).isDisabled());await p.getByRole('button',{name:'Yeniden dene',exact:true}).click();await p.waitForTimeout(500);assert.equal(signups,1,'Invalid refresh must not create a replacement anonymous owner');assert.equal(refreshes,1);console.log('Invalid refresh: owner preserved, no new anonymous identity, close stays disabled');}
 else{const close=p.getByRole('button',{name:'Odayı kapat',exact:true});await p.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Odayı kapat'&&!b.disabled));assert.equal(signups,1);assert.equal(refreshes,1);assert.ok(reads>=2);assert.ok(rejectedReads>=1&&rejectedReads<=3);await close.click();assert.equal(writes.length,0);await p.getByRole('button',{name:'Evet, odayı kapat',exact:true}).click();await p.getByRole('heading',{name:'Oda kapatıldı',exact:true}).waitFor();assert.equal(writes.length,2);assert.equal(writes[0],writes[1],'Retried close must keep exactly the same operationId/body');assert.equal(refreshes,2);console.log('Restored auth: 401 refresh kept owner, close button enabled, close retried once with identical operationId');}
 await context.close();
 }
 await browser.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
