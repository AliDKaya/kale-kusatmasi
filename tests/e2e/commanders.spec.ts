import {test,expect} from '@playwright/test';
import {loadEnvConfig} from '@next/env';
import postgres from 'postgres';
import {mkdirSync,writeFileSync} from 'node:fs';
import {request} from './helpers';
import {initialGame} from '../../src/lib/game';
loadEnvConfig(process.cwd());
test('mareşal: iki oyuncuda terfi, yerel bonus göstergesi ve ölüm sonrası bekleme',async({browser,baseURL})=>{
 test.setTimeout(120000);const a=await browser.newContext(),b=await browser.newContext(),p=await a.newPage(),q=await b.newPage();const sql=postgres(process.env.DATABASE_URL!,{ssl:'require',prepare:false,max:1});const suffix=Date.now().toString().slice(-6);
 try{
 await p.goto(baseURL!);await p.getByLabel('TAKMA ADIN').fill(`TestJournalA${suffix}`);await p.getByRole('radio',{name:/Kuşatma Vadisi/}).check();await p.getByRole('button',{name:'Oda oluştur'}).click();await expect(p).toHaveURL(/\/room\/[A-Z2-9]{6}$/,{timeout:20000});const code=p.url().split('/').pop()!;
 await q.goto(baseURL!);await q.getByLabel('TAKMA ADIN').fill(`TestJournalB${suffix}`);await q.getByRole('button',{name:'Koda katıl',exact:true}).click();await q.getByLabel('ODA KODU').fill(code);await q.getByRole('button',{name:'Meydana katıl'}).click();await expect(q).toHaveURL(new RegExp(`/room/${code}$`),{timeout:20000});
 const initial=(await request(p,`/api/rooms/${code}`)).data;expect(initial.game.command.revision).toBe(1);
 const fixture=initialGame(Date.now(),false,true,true);fixture.turn=5;fixture.deadline=new Date(Date.now()+30000).toISOString();for(const v of fixture.regions.A.veterans!.piyade){v.age=3;v.battles=1;}
 fixture.regions.H=structuredClone(fixture.regions.G);fixture.regions.H.veterans!.piyade.forEach((v,i)=>{v.id=`H:p:${i}`;v.age=3;v.battles=1;});fixture.regions.H.veterans!.okcu.forEach(v=>v.id='H:archer');
 await sql`update rooms set state=${sql.json(fixture)},version=version+1 where id=${initial.id}`;await expect(p.locator('.turn-block')).toContainText('TUR 5',{timeout:15000});
 await new Promise(r=>setTimeout(r,1150));for(const [page,from,to] of [[p,'A','H'],[q,'H','A']] as const)expect((await request(page,`/api/rooms/${code}`,{action:'orders',turn:5,orders:[{type:'fire',from,to,unit:'okcu'}],ready:true,operationId:crypto.randomUUID()})).status).toBe(200);
 await expect(p.locator('.phase-panel')).toContainText('Hamleleri okuyun',{timeout:15000});await expect(p.locator('.commander-status summary')).toContainText('Mareşal · A');await expect(q.locator('.commander-status summary')).toContainText('Mareşal · H');await expect(p.getByRole('button',{name:/^A:/})).toContainText('MAREŞAL');
 const promoted=(await request(p,`/api/rooms/${code}`)).data.game;expect(promoted.replay.filter((e:{kind:string})=>e.kind==='commander')).toHaveLength(2);
 const dying=initialGame(Date.now(),false,true,true);dying.turn=7;dying.deadline=new Date(Date.now()+30000).toISOString();dying.regions.A.army={piyade:1,okcu:0,kusatma:0};dying.regions.A.health={piyade:[1],okcu:[],kusatma:[],sahi:[]};dying.regions.A.veterans={piyade:[{id:'leader',born:0,age:5,battles:2,marshal:true}],okcu:[],kusatma:[],sahi:[]};dying.regions.H={owner:1,army:{piyade:0,okcu:4,kusatma:0}};
 await sql`update rooms set state=${sql.json(dying)},version=version+1 where id=${initial.id}`;await expect(p.locator('.turn-block')).toContainText('TUR 7',{timeout:15000});await new Promise(r=>setTimeout(r,1150));expect((await request(p,`/api/rooms/${code}`,{action:'orders',turn:7,orders:[],ready:true,operationId:crypto.randomUUID()})).status).toBe(200);expect((await request(q,`/api/rooms/${code}`,{action:'orders',turn:7,orders:[{type:'fire',from:'H',to:'A',unit:'okcu'}],ready:true,operationId:crypto.randomUUID()})).status).toBe(200);
 await expect(p.locator('.commander-status summary')).toContainText('2 tur bekle',{timeout:15000});await p.setViewportSize({width:375,height:812});expect(await p.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);expect(await sql`select id from scores where room_id=${initial.id}`).toHaveLength(0);mkdirSync('tmp/evidence',{recursive:true});writeFileSync('tmp/evidence/commanders.json',JSON.stringify({baseURL,date:new Date().toISOString(),controlledFixture:true,checks:{bothPlayersPromote:true,mapBadge:true,deathCooldown:true,mobile375:true,scoresCreated:0}},null,2));
 }finally{await a.close();await b.close();await sql.end();}
});
