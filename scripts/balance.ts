// Offline deterministic scenarios only. No network, database, players or leaderboard writes.
import {writeFileSync,mkdirSync} from 'node:fs';
import {initialGame,resolveTurn,beginRound,validateOrders,count,type Army,type Game,type Order,type Side,type RegionId} from '../src/lib/game';
import {STRATEGY_KEYS,STRATEGY_UNITS,armyHealth} from '../src/lib/strategy';
const a=(p=0,o=0,k=0,s=0):Army=>({piyade:p,okcu:o,kusatma:k,sahi:s});
function place(g:Game,id:RegionId,owner:Side,army:Army){g.regions[id]={owner,army,health:Object.fromEntries(STRATEGY_KEYS.map(u=>[u,Array(army[u]??0).fill(STRATEGY_UNITS[u].hp)])) as NonNullable<Game['regions'][RegionId]['health']>};}
function advance(g:Game){return beginRound(g,new Date(g.reviewUntil!).getTime()+1);}
function tick(g:Game,orders:[Order[],Order[]]){return resolveTurn(g,orders,new Date(g.deadline).getTime()-1);}
function field(label:string,left:Army,right:Army){let g=initialGame();place(g,'K',0,left);place(g,'L',1,right);let result='turn_limit';const history:unknown[]=[];
 for(let i=0;i<16;i++){
  // No field healing in this isolated duel; both sides have enough gold/materials.
  for(const p of g.players){p.grain=0;p.gold=100;p.wood=100;p.stone=100;}
  const orders:[Order[],Order[]]=[[],[]];
  if(count(g.regions.L.army)===0&&count(g.regions.K.army))orders[0].push({type:'move',from:'K',to:'L',army:{...g.regions.K.army}});
  else{
   if(g.regions.K.army.piyade)orders[0].push({type:'move',from:'K',to:'L',army:a(g.regions.K.army.piyade)});
   if(g.regions.K.army.okcu)orders[0].push({type:'fire',from:'K',to:'L',unit:'okcu'});
   if(g.regions.K.army.kusatma)orders[0].push({type:'fire',from:'K',to:'L',unit:'kusatma'});
  }
  if(g.regions.L.army.okcu)orders[1].push({type:'fire',from:'L',to:'K',unit:'okcu'});
  if(g.regions.L.army.kusatma)orders[1].push({type:'fire',from:'L',to:'K',unit:'kusatma'});
  if(count(g.regions.L.army))orders[1].push({type:'defend',at:'L'});
  g=tick(g,orders);history.push({turn:i+1,attackerHp:armyHealth(g.regions.K),defenderHp:armyHealth(g.regions.L),owner:g.regions.L.owner});
  if(g.regions.L.owner===0){result='captured';break;}if(!count(g.regions.K.army)){result='attacker_destroyed';break;}if(g.phase==='finished')break;g=advance(g);
 }
 return{label,attacker:left,defender:right,result,rounds:history.length,history};
}
function siege(engines:number,wealthy:boolean){let g=initialGame();place(g,'L',0,a(0,0,engines));if(wealthy){g.regions.M.owner=1;g.regions.E.owner=1;g.regions.F.owner=1;}let shots=0,repairs=0;const history:unknown[]=[];
 for(let i=0;i<16;i++){const orders:[Order[],Order[]]=[i===0?[{type:'siege',from:'L',to:'G'}]:[],[]];try{validateOrders(g,1,[{type:'repair',at:'G'}]);orders[1].push({type:'repair',at:'G'});repairs++;}catch{}shots++;g=tick(g,orders);history.push({turn:i+1,hp:g.players[1].hp,wall:g.players[1].wall,grain:g.players[1].grain});if(g.phase==='finished')break;g=advance(g);}
 return{engines,defenderHasFullSupply:wealthy,shots,repairs,castleHp:g.players[1].hp,result:g.finishReason,history};
}
const report={generatedAt:new Date().toISOString(),method:'Offline deterministic scenarios; no human win-rate estimate. Defender uses available ranged fire and defense; field healing disabled in field duels. Siege defender repairs whenever affordable.',field:[field('1 piyade → 1 okçu',a(1),a(0,1)),field('3 piyade → 3 piyade',a(3),a(3)),field('2 piyade + 1 okçu → 3 piyade',a(2,1),a(3)),field('3 piyade → 2 piyade + 1 okçu',a(3),a(2,1)),field('2 piyade + 1 mancınık → 3 piyade',a(2,0,1),a(3))],siege:[siege(1,false),siege(1,true),siege(2,false),siege(2,true)],limits:['Not exhaustive strategy search','No human matches or rating estimates','Army budgets differ; exact army compositions are shown','Operational balance remains provisional']};
mkdirSync('public/evidence',{recursive:true});writeFileSync('public/evidence/balance.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({field:report.field.map(({label,result,rounds})=>({label,result,rounds})),siege:report.siege.map(({engines,defenderHasFullSupply,shots,repairs,castleHp,result})=>({engines,defenderHasFullSupply,shots,repairs,castleHp,result}))},null,2));
