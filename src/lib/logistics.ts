import type {Game,Order,RegionId,Side,BattleEvent} from './game';
import {STRATEGY_REGIONS,STRATEGY_EDGES} from './strategy-map';
import {perspectiveRegion} from './map-symmetry';
import {RESOURCE_KEYS,RESOURCE_NAMES,zeroResources,resourceText,resourceTotal,type Resources} from './resources';

export type Caravan={id:string;side:Side;route:RegionId[];edge:number;cargo:Resources;status:'road'|'blocked'|'delivered';protectedUntil:number;delayedTurn?:number;traded:boolean;lastEdge?:[RegionId,RegionId];deliveredTurn?:number};
export type Logistics={revision:1|2;depots:Record<RegionId,Resources>;caravans:[Caravan|null,Caravan|null];serial:[number,number];lastPickup:Partial<Record<RegionId,number>>};
type CaravanOrder=Extract<Order,{type:'raid'|'trade'}>;
type Emit=(e:Omit<BattleEvent,'id'>)=>void;
const HOME:Record<Side,RegionId>={0:'A',1:'G'};
const regionName=(id:RegionId)=>STRATEGY_REGIONS.find(r=>r.id===id)!.name;
const sideName=(side:Side)=>side===0?'Batı':'Doğu';
const neighbors=(id:RegionId)=>STRATEGY_EDGES.flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
const armyCount=(g:Game,id:RegionId)=>Object.values(g.regions[id].army).reduce((n,a)=>n+(a??0),0);
export function initialLogistics():Logistics{return{revision:2,depots:Object.fromEntries(STRATEGY_REGIONS.map(r=>[r.id,zeroResources()])) as Record<RegionId,Resources>,caravans:[null,null],serial:[0,0],lastPickup:{}};}
export function caravanEdge(c:Caravan):[RegionId,RegionId]{return[c.route[Math.min(c.edge,c.route.length-2)],c.route[Math.min(c.edge+1,c.route.length-1)]];}
export function nearCaravan(from:RegionId,c:Caravan){const [a,b]=caravanEdge(c);return from===a||from===b||neighbors(a).includes(from)||neighbors(b).includes(from);}
export function depotTotal(g:Game,side:Side):Resources{const sum=zeroResources();if(g.logistics)for(const r of STRATEGY_REGIONS)if(g.regions[r.id].owner===side)for(const k of RESOURCE_KEYS)sum[k]+=g.logistics.depots[r.id][k];return sum;}
export function findCaravan(g:Game,id:string){return g.logistics?.caravans.find(c=>c?.id===id)??null;}

function homeDistances(g:Game,side:Side):Partial<Record<RegionId,number>>{
 const result:Partial<Record<RegionId,number>>={};if(g.regions[HOME[side]].owner!==side)return result;result[HOME[side]]=0;const queue:RegionId[]=[HOME[side]];
 for(let i=0;i<queue.length;i++)for(const next of neighbors(queue[i]))if(g.regions[next].owner===side&&result[next]===undefined){result[next]=result[queue[i]]!+1;queue.push(next);}return result;
}
/** No U-turns or increasing distance to home; at most one lateral detour. */
export function planCaravanRoute(g:Game,side:Side,forcedStart?:RegionId):RegionId[]|null{
 const logistics=g.logistics;if(!logistics)return null;const dist=homeDistances(g,side);
 const candidates=STRATEGY_REGIONS.filter(r=>r.id!==HOME[side]&&dist[r.id]!==undefined&&resourceTotal(logistics.depots[r.id])>0).sort((a,b)=>dist[b.id]!-dist[a.id]!||resourceTotal(logistics.depots[b.id])-resourceTotal(logistics.depots[a.id])||(logistics.lastPickup[a.id]??0)-(logistics.lastPickup[b.id]??0)||perspectiveRegion(a.id,side).localeCompare(perspectiveRegion(b.id,side)));
 const start=forcedStart??candidates[0]?.id;if(!start||dist[start]===undefined)return null;if(start===HOME[side])return[start];let best:RegionId[]|null=null,bestValue=-Infinity;
 function walk(path:RegionId[]){const at=path[path.length-1];if(at===HOME[side]){const value=path.reduce((n,id)=>n+resourceTotal(logistics!.depots[id]),0)-path.length*.25;if(value>bestValue){bestValue=value;best=[...path];}return;}if(path.length>dist[start!]!+1)return;for(const next of neighbors(at).sort((a,b)=>perspectiveRegion(a,side).localeCompare(perspectiveRegion(b,side))))if(dist[next]!==undefined&&dist[next]!<=dist[at]!&&!path.includes(next))walk([...path,next]);}
 walk([start]);return best;
}
export function validateCaravanOrders(g:Game,side:Side,orders:Order[]):void{
 const targeted=new Set<string>();
 for(const order of orders){if(order.type!=='raid'&&order.type!=='trade')continue;if(!g.logistics)throw new Error('Bu eski odada kervan ekonomisi yok. Yeni Kuşatma Vadisi odası aç.');
  const c=findCaravan(g,order.caravanId);if(!c||c.status==='delivered')throw new Error('Bu kervan artık yolda değil.');if(g.regions[order.from].owner!==side||!armyCount(g,order.from)||!nearCaravan(order.from,c))throw new Error('Kervanın yakınında kendi ordun bulunmalı.');
  if(targeted.has(c.id))throw new Error('Aynı kervana tur başına tek baskın veya takas emri verilebilir.');targeted.add(c.id);
  if(order.type==='raid'){if(c.side===side)throw new Error('Kendi kervanına baskın yapamazsın.');if(!g.regions[order.from].army.piyade&&!g.regions[order.from].army.okcu)throw new Error('Baskın için piyade veya okçu gerekli.');if(c.protectedUntil>=g.turn)throw new Error('Kervan geçici korumada; bu tur tekrar vurulamaz.');if(resourceTotal(c.cargo)===0)throw new Error('Kervan boş; baskın yapılacak yük yok.');}
  else{if(c.side!==side)throw new Error('Yalnız kendi kervanınla takas yapabilirsin.');if(c.traded)throw new Error('Bu seferin takası zaten kullanıldı.');if(order.give===order.take)throw new Error('İki farklı kaynak seç.');if(!Number.isInteger(order.amount)||order.amount<1||order.amount>2)throw new Error('Bir takasta en fazla 2 kaynak alabilirsin.');if(c.cargo[order.give]<order.amount*2)throw new Error('Kervanın yükünde takas için yeterli kaynak yok.');}
 }
}

/** 20% of the total load, apportioned by remainder; tiny mixed loads lose at most one. */
export function raidLoss(cargo:Resources):Resources{
 const lost=zeroResources(),total=resourceTotal(cargo);if(!total)return lost;
 const budget=Math.max(1,Math.floor(total/5));for(const k of RESOURCE_KEYS)lost[k]=Math.floor(cargo[k]/5);
 let remaining=budget-resourceTotal(lost);
 const priority=[...RESOURCE_KEYS].sort((a,b)=>cargo[b]%5-cargo[a]%5||RESOURCE_KEYS.indexOf(a)-RESOURCE_KEYS.indexOf(b));
 for(const k of priority){if(remaining<=0)break;if(cargo[k]>lost[k]){lost[k]++;remaining--;}}
 return lost;
}

export function resolveCaravanOrders(original:Game,g:Game,orders:[Order[],Order[]],log:string[],emit:Emit){
 if(!g.logistics)return;
 // Trades first for both sides, then raids for both sides: player index cannot change the rule.
 for(const type of ['trade','raid'] as const)for(const side of [0,1] as Side[])for(const raw of orders[side]){
  if(raw.type!==type)continue;const o=raw as CaravanOrder,c=findCaravan(g,o.caravanId);if(!c||c.status==='delivered')continue;
  if(g.regions[o.from].owner!==side||!armyCount(g,o.from)||o.type==='raid'&&!g.regions[o.from].army.piyade&&!g.regions[o.from].army.okcu){log.push(`${sideName(side)}: kervan emri iptal; ordu kaynak bölgeyi tutamadı.`);continue;}
  if(o.type==='trade'){c.cargo[o.give]-=o.amount*2;c.cargo[o.take]+=o.amount;c.traded=true;log.push(`${sideName(side)}: kervanda ${o.amount*2} ${RESOURCE_NAMES[o.give]} → ${o.amount} ${RESOURCE_NAMES[o.take]} takası. Yük kaleye teslim edilmeyi bekliyor.`);emit({phase:'aftermath',kind:'trade',at:o.from,side,text:`Kervan takası: ${o.amount*2} → ${o.amount}`});}
  else{const lost=g.logistics.revision>=2?raidLoss(c.cargo):Object.fromEntries(RESOURCE_KEYS.map(k=>[k,c.cargo[k]>0?Math.max(1,Math.floor(c.cargo[k]*.2)):0])) as Resources,loot=zeroResources();for(const k of RESOURCE_KEYS){loot[k]=Math.min(1,lost[k]);c.cargo[k]-=lost[k];g.players[side][k]=(g.players[side][k]??0)+loot[k];}c.delayedTurn=g.turn;c.protectedUntil=g.turn+2;c.lastEdge=undefined;log.push(`${sideName(side)} baskını: ${sideName(c.side)} kervanı ${resourceText(lost)} kaybetti, 1 tur gecikti. Ganimet ${resourceText(loot)}; kervan sonraki 2 tur korumada.`);emit({phase:'aftermath',kind:'raid',from:o.from,to:caravanEdge(c)[1],side,text:`Kervan baskını · ${resourceText(loot)} ganimet`});}
 }
 // Captured stock stays at its location; the new owner must transport it too.
 for(const r of STRATEGY_REGIONS)if(g.regions[r.id].owner!==null&&g.regions[r.id].owner!==original.regions[r.id].owner&&resourceTotal(g.logistics.depots[r.id]))log.push(`${regionName(r.id)} deposu yeni sahibine geçti: ${resourceText(g.logistics.depots[r.id])}.`);
}

export function advanceLogistics(g:Game,production:Record<RegionId,Resources>,log:string[],emit:Emit){
 const logistics=g.logistics;if(!logistics)return;
 for(const r of STRATEGY_REGIONS){const side=g.regions[r.id].owner;if(side===null)continue;for(const k of RESOURCE_KEYS)if(r.id===HOME[side])g.players[side][k]=(g.players[side][k]??0)+production[r.id][k];else logistics.depots[r.id][k]+=production[r.id][k];}
 const pickup=(c:Caravan,at:RegionId)=>{if(g.regions[at].owner!==c.side||at===HOME[c.side])return;for(const k of RESOURCE_KEYS){c.cargo[k]+=logistics.depots[at][k];logistics.depots[at][k]=0;}logistics.lastPickup[at]=g.turn;};
 const deliver=(c:Caravan)=>{for(const k of RESOURCE_KEYS)g.players[c.side][k]=(g.players[c.side][k]??0)+c.cargo[k];log.push(`${sideName(c.side)} kervanı kaleye ulaştı: ${resourceText(c.cargo)} kasaya aktarıldı.`);emit({phase:'aftermath',kind:'caravan',at:HOME[c.side],side:c.side,amount:resourceTotal(c.cargo),text:`Kervan teslimatı: ${resourceText(c.cargo)}`});c.cargo=zeroResources();c.status='delivered';c.deliveredTurn=g.turn;c.edge=c.route.length-1;c.lastEdge=undefined;};
 for(const side of [0,1] as Side[]){let c=logistics.caravans[side];
  if(!c||c.status==='delivered'){
   if(c?.deliveredTurn===g.turn)continue;const route=planCaravanRoute(g,side);if(!route||route.length<2){logistics.caravans[side]=null;continue;}c={id:`${side}:${++logistics.serial[side]}`,side,route,edge:0,cargo:zeroResources(),status:'road',protectedUntil:0,traded:false};pickup(c,route[0]);logistics.caravans[side]=c;log.push(`${sideName(side)} kervanı yola çıktı: ${route.join(' → ')}. Yük ${resourceText(c.cargo)}.`);emit({phase:'aftermath',kind:'caravan',from:route[0],to:route[1],side,text:`Yeni kervan: ${route.join(' → ')}`});continue;
  }
  c.lastEdge=undefined;if(c.delayedTurn===g.turn)continue;const previous=caravanEdge(c),next=previous[1];
  if(g.regions[next].owner!==side){const reroute=g.regions[previous[0]].owner===side?planCaravanRoute(g,side,previous[0]):null;if(!reroute||reroute.length<2){c.status='blocked';log.push(`${sideName(side)} kervanı yol kapalı olduğu için bekliyor. Yük kaybolmadı.`);continue;}c.route=reroute;c.edge=0;c.status='road';log.push(`${sideName(side)} kervanı güvenli yola yöneldi: ${reroute.join(' → ')}.`);continue;}
  c.status='road';c.edge++;pickup(c,next);if(next===HOME[side]){deliver(c);continue;}c.lastEdge=previous;emit({phase:'aftermath',kind:'caravan',from:previous[0],to:next,side,text:`${sideName(side)} kervanı ilerledi · ${resourceText(c.cargo)}`});
 }
}
