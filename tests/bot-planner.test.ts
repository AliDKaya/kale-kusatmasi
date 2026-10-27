import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialGame,initialClassicGame,resolveTurn,validateOrders,beginRound,type Side} from '../src/lib/game';
import {planBot,BOT_LEVELS,type BotLevel} from '../src/lib/bot-planner';
for(const mode of ['classic','strategy'] as const)for(const level of Object.keys(BOT_LEVELS) as BotLevel[])test(`${mode}/${level}: iki taraf 8 tur yasal, bütçeli, deterministik ve durumu değiştirmeyen emirler üretir`,()=>{
 let g=mode==='classic'?initialClassicGame(1000,false):initialGame(1000,false,true,true);
 for(let round=0;round<8&&g.phase!=='finished';round++){
  const original=structuredClone(g);const orders=([0,1] as Side[]).map(side=>planBot(g,side,level)) as [ReturnType<typeof planBot>,ReturnType<typeof planBot>];assert.deepEqual(g,original);for(const side of [0,1] as Side[]){validateOrders(g,side,orders[side]);assert.deepEqual(planBot(g,side,level),orders[side]);}g=resolveTurn(g,orders,new Date(g.deadline).getTime()-1);for(const p of g.players)assert.ok(p.gold>=0&&p.wood>=0&&(p.stone??0)>=0&&(p.grain??0)>=0);if(g.phase==='review')g=beginRound(g,new Date(g.reviewUntil!).getTime()+1);
 }
});
test('bekleme ve sonuç aşamasında bot emir vermez',()=>{assert.deepEqual(planBot(initialGame(1000,true,true,true),1,'serdar'),[]);});
