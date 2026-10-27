/** Pure deterministic planner. It receives public game state, never the human's pending orders. */
import {validateOrders,resolveTurn,count,power,regionsFor,edgesFor,rules,type Game,type Side,type Order,type Unit} from './game';
import {STRATEGY_KEYS,STRATEGY_UNITS,armyHealth,recruitCapacity} from './strategy';
import {RESOURCE_KEYS,resourceTotal} from './resources';
import {nearCaravan} from './logistics';
import {perspectiveRegion} from './map-symmetry';
export const BOT_LEVELS={acemi:{name:'Acemi',label:'Kolay'},sancak:{name:'Sancak Beyi',label:'Orta'},serdar:{name:'Serdar',label:'Zor'}} as const;
export type BotLevel=keyof typeof BOT_LEVELS;
const other=(side:Side):Side=>side===0?1:0;
function valid(g:Game,side:Side,orders:Order[]){try{validateOrders(g,side,orders);return true;}catch{return false;}}
function candidateKey(o:Order,side:Side,advanced:boolean):string{
 const region=(id:import('./game').RegionId)=>perspectiveRegion(id,side,advanced);
 return JSON.stringify([o.type,'at'in o?region(o.at):'','from'in o?region(o.from):'','to'in o?region(o.to):'','unit'in o?o.unit:'','quantity'in o?o.quantity??1:0,'army'in o?STRATEGY_KEYS.map(u=>o.army[u]??0):[],'give'in o?o.give:'','take'in o?o.take:'','amount'in o?o.amount:0,'caravanId'in o?o.caravanId.replace(/^[01](?=:)/,n=>Number(n)===side?'0':'1'):'']);
}
export function botCandidates(g:Game,side:Side):Order[]{
 if(g.phase!=='playing')return[];const out:Order[]=[];const regions=regionsFor(g),advanced=g.ruleset===2,home=side===0?'A':'G';
 for(const r of regions){const t=g.regions[r.id];if(t.owner!==side)continue;
  if(count(t.army)){
   out.push({type:'defend',at:r.id});if(advanced&&g.command?.revision===2)out.push({type:'rally',at:r.id});
   for(const [a,b] of edgesFor(g)){const to=a===r.id?b:b===r.id?a:null;if(!to)continue;
    // Keep one infantry behind when possible; full commitment remains a separate candidate.
    const full={...t.army},split={...t.army};if(split.piyade>1)split.piyade--;else if(split.okcu>1)split.okcu--;out.push({type:'move',from:r.id,to,army:split});if(count(split)!==count(full))out.push({type:'move',from:r.id,to,army:full});
   }
   if(advanced)for(const target of regions){if(g.regions[target.id].owner===side)continue;for(const unit of ['okcu','kusatma'] as const)if(t.army[unit])out.push({type:'fire',from:r.id,to:target.id,unit});if(target.id===(side===0?'G':'A')){out.push({type:'siege',from:r.id,to:target.id});if(t.army.sahi)out.push({type:'cannon',from:r.id,to:target.id});}}
   if(advanced&&g.logistics){for(const c of g.logistics.caravans){if(!c||c.status==='delivered'||!nearCaravan(r.id,c))continue;if(c.side!==side)out.push({type:'raid',from:r.id,caravanId:c.id});else for(const give of RESOURCE_KEYS)for(const take of RESOURCE_KEYS)if(give!==take&&c.cargo[give]>=4&&c.cargo[take]<2)out.push({type:'trade',from:r.id,caravanId:c.id,give,take,amount:1});}}
  }
  const units:Unit[]=advanced?[...STRATEGY_KEYS]:['piyade','okcu','kusatma'];for(const unit of units){out.push({type:'recruit',at:r.id,unit});if(advanced&&recruitCapacity(g,side)>1)out.push({type:'recruit',at:r.id,unit,quantity:Math.min(2,recruitCapacity(g,side))});}
 }
 if(advanced){out.push({type:'repair',at:home},{type:'upgrade',at:home});for(const s of g.sieges??[])if(s.side===side)out.push({type:'cancel',at:s.from});}
 return out.filter(o=>valid(g,side,[o])).sort((a,b)=>candidateKey(a,side,advanced).localeCompare(candidateKey(b,side,advanced)));
}
export function botPositionValue(g:Game,side:Side):number{
 if(g.phase==='finished')return g.winner==='draw'?0:g.winner===side?10000:-10000;
 const value=(s:Side)=>{const p=g.players[s];const army={piyade:0,okcu:0,kusatma:0,sahi:0};let n=p.hp*12+(p.wall??0)*.6+(p.gold+p.wood+(p.stone??0)+(p.grain??0))*.35;
  for(const r of regionsFor(g)){const t=g.regions[r.id];if(t.owner!==s)continue;n+=r.kind==='castle'?30:10+(t.level??1)*2;if(g.ruleset===2){n+=armyHealth(t)*.7+STRATEGY_KEYS.reduce((a,u)=>a+(t.army[u]??0)*(STRATEGY_UNITS[u].cost.gold+STRATEGY_UNITS[u].cost.wood)*.2,0);for(const u of STRATEGY_KEYS)army[u]+=t.army[u]??0;}else n+=power(t.army)*3;}
  // Bounded complement value: a one-turn evaluator otherwise never buys slow siege units.
  // Existing infantry must support these roles; surplus ranged units do not multiply the bonus.
  if(g.ruleset===2)n+=Math.min(army.okcu,Math.ceil(army.piyade/2))*6+Math.min(army.kusatma,Math.floor(army.piyade/3))*12+Math.min(army.sahi,Math.floor(army.piyade/5))*18;
  if(g.logistics){for(const r of regionsFor(g))if(g.regions[r.id].owner===s)n+=resourceTotal(g.logistics.depots[r.id])*.18;const c=g.logistics.caravans[s];if(c)n+=resourceTotal(c.cargo)*.28;}return n;};return value(side)-value(other(side));
}
function forecast(g:Game,side:Side):Order[]{
 const candidates=botCandidates(g,side).filter(o=>o.type==='fire'||o.type==='cannon'||o.type==='defend'||o.type==='move'&&g.regions[o.to].owner!==side);const result:Order[]=[];
 // Public-state forecast only. It is deliberately independent of the actual opponent draft.
 candidates.sort((a,b)=>{const priority=(o:Order)=>o.type==='cannon'?5:o.type==='fire'?4:o.type==='move'&&g.regions[o.to].owner===other(side)?3:o.type==='move'?2:1;return priority(b)-priority(a)||candidateKey(a,side,g.ruleset===2).localeCompare(candidateKey(b,side,g.ruleset===2));});
 for(const o of candidates)if(result.length<rules(g).orderLimit&&valid(g,side,[...result,o]))result.push(o);return result;
}
export function planBot(g:Game,side:Side,level:BotLevel):Order[]{
 if(g.phase!=='playing')return[];const enemy=other(side),predicted=level==='acemi'?[]:level==='serdar'?planBot(g,enemy,'sancak'):forecast(g,enemy);const result:Order[]=[];const all=botCandidates(g,side);const now=new Date(g.deadline).getTime()-1;
 const evaluate=(orders:Order[])=>{const pair:[Order[],Order[]]=[[],[]];pair[side]=orders;const scores:number[]=[];for(const response of level==='serdar'?[[],predicted]:[predicted]){pair[enemy]=response;try{scores.push(botPositionValue(resolveTurn(g,pair,now),side));}catch{scores.push(-Infinity);}}return level==='serdar'?Math.min(...scores):scores[0];};
 let current=evaluate(result);const limit=level==='acemi'?1:rules(g).orderLimit;
 for(let i=0;i<limit;i++){let best:Order|null=null,bestScore=current;for(const candidate of all){const combined=[...result,candidate];if(!valid(g,side,combined))continue;const score=evaluate(combined);if(score>bestScore+.001){best=candidate;bestScore=score;}}
  if(!best)break;result.push(best);current=bestScore;
 }
 return result;
}
