import {initialCommand,updateCommanders,type Veteran} from './commanders';
import {emptyArmy,finish,finishByLimit,type Army,type BattleEvent,type Game,type Order,type RegionId,type Side,type Unit,type Territory} from './game';
import {initialLogistics,validateCaravanOrders,resolveCaravanOrders,advanceLogistics} from './logistics';
import {RESOURCE_KEYS,zeroResources,resourceText,type Resources} from './resources';
export {RESOURCE_KEYS,RESOURCE_NAMES,zeroResources,resourceText,type Resources} from './resources';
import {STRATEGY_REGIONS as REGIONS,STRATEGY_EDGES as EDGES} from './strategy-map';
const neighbors=(a:RegionId,b:RegionId)=>EDGES.some(([x,y])=>x===a&&y===b||x===b&&y===a);

export const STRATEGY_KEYS=['piyade','okcu','kusatma','sahi'] as const;
const UNIT_KEYS=STRATEGY_KEYS;
const count=(a:Army)=>UNIT_KEYS.reduce((n,u)=>n+(a[u]??0),0);
export const STRATEGY_UNITS={
 piyade:{name:'Piyade',speed:2,hp:10,melee:3,ranged:0,range:0,cost:{gold:3,wood:1,stone:0,grain:2},role:'Ön saf · 10 can'},
 okcu:{name:'Okçu',speed:3,hp:5,melee:1,ranged:3,range:1,cost:{gold:4,wood:3,stone:0,grain:2},role:'1 bağlantıdan atış · 5 can'},
 sahi:{name:'Şahi Topu',speed:1,hp:3,melee:0,ranged:2,range:1,cost:{gold:18,wood:8,stone:12,grain:4},role:'Sur 12 · kale 8 · ordu 2 · 3 can'},
 kusatma:{name:'Mancınık',speed:1,hp:8,melee:1,ranged:2,range:2,cost:{gold:10,wood:8,stone:6,grain:3},role:'2 bağlantı menzil · kaleye 6 hasar'},
} as const;
export const HOME:Record<Side,RegionId>={0:'A',1:'G'};
export const CANNON_COST:Resources={gold:18,wood:8,stone:12,grain:4};
export const resources=(p:Game['players'][number]):Resources=>({gold:p.gold,wood:p.wood,stone:p.stone??0,grain:p.grain??0});
export function distance(a:RegionId,b:RegionId):number{
 const seen=new Set<RegionId>([a]);let layer:RegionId[]=[a],d=0;
 while(layer.length){if(layer.includes(b))return d;const next:RegionId[]=[];for(const x of layer)for(const [l,r] of EDGES){const y=l===x?r:r===x?l:null;if(y&&!seen.has(y)){seen.add(y);next.push(y);}}layer=next;d++;}return Infinity;
}
export function regionIncome(id:RegionId,level=1):Resources{
 const kind=REGIONS.find(r=>r.id===id)!.kind;const bonus=kind==='castle'?0:Math.max(0,Math.min(3,level)-1);
 return kind==='castle'?{gold:1,wood:1,stone:1,grain:1}:kind==='forest'?{gold:0,wood:3+bonus,stone:0,grain:0}:kind==='mine'?{gold:2,wood:0,stone:3+bonus,grain:0}:{gold:1,wood:0,stone:0,grain:4+bonus};
}
export function income(g:Game,side:Side):Resources{const result=zeroResources();for(const r of REGIONS)if(g.regions[r.id].owner===side)for(const k of RESOURCE_KEYS)result[k]+=regionIncome(r.id,g.regions[r.id].level??1)[k];return result;}
export const recruitCapacity=(g:Game,side:Side)=>Math.min(4,1+Math.floor(REGIONS.filter(r=>g.regions[r.id].owner===side).length/2));
export function orderCost(g:Game,side:Side,o:Order):Resources{
 if(o.type==='cannon'){const n=g.regions[o.from].army.sahi??0;return {gold:n*2,wood:0,stone:n*2,grain:0};}
 if(o.type==='recruit'){const n=o.quantity??1;const c=STRATEGY_UNITS[o.unit].cost;return{gold:Math.max(1,c.gold-(o.at==='D'?1:0))*n,wood:c.wood*n,stone:c.stone*n,grain:c.grain*n};}
 if(o.type==='upgrade'){const level=g.players[side].wallLevel??1;return{gold:2,wood:3*level,stone:4*level,grain:0};}
 if(o.type==='repair')return{gold:0,wood:2,stone:3,grain:2};return zeroResources();
}
export function plannedCost(g:Game,side:Side,orders:Order[]):Resources{const result=zeroResources();for(const o of orders){const c=orderCost(g,side,o);for(const k of RESOURCE_KEYS)result[k]+=c[k];}return result;}

type FullArmy=Required<Army>;
type Force={army:FullArmy;health:Record<Unit,number[]>;ready:Record<Unit,boolean[]>;veterans:Record<Unit,Veteran[]>};
function force(t?:Territory):Force{const army={sahi:0,...(t?.army??emptyArmy())};return{army,health:Object.fromEntries(UNIT_KEYS.map(u=>[u,t?.health?.[u]?[...t.health[u]]:Array(army[u]).fill(STRATEGY_UNITS[u].hp)])) as Force['health'],ready:Object.fromEntries(UNIT_KEYS.map(u=>[u,Array(army[u]).fill(true)])) as Force['ready'],veterans:Object.fromEntries(UNIT_KEYS.map(u=>[u,t?.veterans?.[u]?structuredClone(t.veterans[u]):Array.from({length:army[u]},(_,i)=>({id:`legacy:${u}:${i}`,born:0,age:0,battles:0}))])) as Force['veterans']};}
function sync(f:Force){for(const u of UNIT_KEYS)f.army[u]=f.health[u].length;}
function put(t:Territory,f:Force){sync(f);t.army={...f.army};t.health=structuredClone(f.health);t.veterans=structuredClone(f.veterans);}
function merge(a:Force,b:Force){for(const u of UNIT_KEYS){a.health[u].push(...b.health[u]);a.ready[u].push(...b.ready[u]);a.veterans[u].push(...b.veterans[u]);}sync(a);}
function sortHealth(f:Force,u:Unit){const pairs=f.health[u].map((hp,i)=>({hp,ready:f.ready[u][i],veteran:f.veterans[u][i]})).sort((a,b)=>a.hp-b.hp);f.health[u]=pairs.map(p=>p.hp);f.ready[u]=pairs.map(p=>p.ready);f.veterans[u]=pairs.map(p=>p.veteran);}
function take(a:Force,army:Army,relocating=false):Force{const b=force();for(const u of UNIT_KEYS){sortHealth(a,u);b.health[u]=a.health[u].splice(0,army[u]??0);b.veterans[u]=a.veterans[u].splice(0,army[u]??0);b.ready[u]=a.ready[u].splice(0,army[u]??0).map(ready=>relocating?false:ready);}sync(a);sync(b);return b;}
const marshal=(f:Force)=>UNIT_KEYS.some(u=>f.veterans[u].some(v=>v.marshal));
const armyBonus=(f:Force,damage:number)=>damage>0?damage+(marshal(f)?1:0):0;
function hit(f:Force,damage:number){if(damage>0&&marshal(f))damage=Math.max(1,damage-1);const before=count(f.army);for(const u of UNIT_KEYS){sortHealth(f,u);while(damage>0&&f.health[u].length){const n=Math.min(damage,f.health[u][0]);f.health[u][0]-=n;damage-=n;if(!f.health[u][0]){f.health[u].shift();f.ready[u].shift();f.veterans[u].shift();}}}sync(f);return before-count(f.army);}
export function armyHealth(t:Territory):number{const f=force(t);return UNIT_KEYS.reduce((n,u)=>n+f.health[u].reduce((a,b)=>a+b,0),0);}
function attack(f:Force,u:Unit,base:number){return f.health[u].reduce((n,hp)=>n+Math.ceil(base*hp/STRATEGY_UNITS[u].hp),0);}
function rangedAttack(f:Force,u:Unit,base:number){return f.health[u].reduce((n,hp,i)=>n+(f.ready[u][i]?Math.ceil(base*hp/STRATEGY_UNITS[u].hp):0),0);}
const strength=(f:Force)=>armyBonus(f,UNIT_KEYS.reduce((n,u)=>n+attack(f,u,STRATEGY_UNITS[u].melee),0));
function heal(f:Force,amount:number){let gained=0;for(const u of UNIT_KEYS)f.health[u]=f.health[u].map(hp=>{const n=Math.min(STRATEGY_UNITS[u].hp,hp+amount);gained+=n-hp;return n;});return gained;}
const label=(id:RegionId)=>REGIONS.find(r=>r.id===id)!.name;
const sideName=(s:Side)=>s===0?'Batı':'Doğu';
const mitigate=(raw:number,defending:boolean,armor=0)=>raw<=0?0:Math.max(1,Math.ceil(raw*(defending?.5:1))-armor);
const castleSide=(id:RegionId):Side|null=>id==='A'?0:id==='G'?1:null;

export function initialStrategyGame(now:number,waiting:boolean,withLogistics=false,withCommand=false):Game{
 const regions=Object.fromEntries(REGIONS.map(r=>[r.id,{owner:null,army:emptyArmy()}])) as Game['regions'];
 regions.A={owner:0,army:{piyade:3,okcu:1,kusatma:0}};regions.G={owner:1,army:{piyade:3,okcu:1,kusatma:0}};
 for(const r of REGIONS)put(regions[r.id],force(regions[r.id]));
 const player=()=>({gold:10,wood:8,stone:4,grain:6,hp:20,wall:8,wallLevel:1});
 const game:Game={ruleset:2,turn:1,phase:waiting?'waiting':'playing',winner:null,players:[player(),player()],regions,deadline:new Date(now+30000).toISOString(),matchDeadline:waiting?undefined:new Date(now+720000).toISOString(),transitionReady:[false,false],sieges:[],history:[],log:['Surlar hazır. Maden taş ve altın, orman odun, merkez köy tahıl üretir.']};
 if(withLogistics)game.logistics=initialLogistics();if(withCommand){game.command=initialCommand();for(const r of REGIONS)for(const u of UNIT_KEYS)game.regions[r.id].veterans![u].forEach((v,i)=>v.id=`${r.id}:${u}:0:${i}`);}return game;
}

export function validateStrategyOrders(g:Game,side:Side,orders:Order[]):void{
 if(g.phase!=='playing')throw new Error('Önce iki oyuncu da tura hazır olmalı.');
 if(orders.length>4)throw new Error('Bu modda bir turda en fazla dört emir verebilirsin.');
 const used:Partial<Record<RegionId,Army>>={};const actions=new Set<string>();const firing:Partial<Record<RegionId,Set<Unit>>>={};let recruits=0;
 const reserve=(at:RegionId,units:Unit[])=>{firing[at]??=new Set();for(const u of units){if(firing[at]!.has(u)||(used[at]?.[u]??0)>0)throw new Error('Aynı asker hem hareket hem atış yapamaz veya iki kez ateş edemez.');firing[at]!.add(u);}};
 for(const o of orders){
  const at='from' in o?o.from:o.at;const t=g.regions[at];
  if(!t||t.owner!==side)throw new Error('Yalnızca kendi bölgenden emir verebilirsin.');
  if(o.type==='recruit'){
   const n=o.quantity??1;if(!Number.isInteger(n)||n<1||n>4)throw new Error('Birlik adedi 1–4 olmalı.');recruits+=n;
   if((o.unit==='kusatma'||o.unit==='sahi')&&at!==HOME[side])throw new Error('Mancınık ve Şahi Topu yalnızca kendi ana kalende üretilebilir.');
  }else if(o.type==='upgrade'||o.type==='repair'){
   if(at!==HOME[side])throw new Error('Yalnızca kendi ana kalenin surlarını geliştirebilirsin.');
   if(actions.has('wall'))throw new Error('Bir turda tek sur işlemi yapılabilir.');actions.add('wall');
   if(o.type==='upgrade'&&(g.players[side].wallLevel??1)>=3)throw new Error('Surlar en fazla 3. seviye olabilir.');
   if(o.type==='repair'&&(g.players[side].wall??0)>=(g.players[side].wallLevel??1)*8&&!g.players[side].breaches?.length&&g.players[side].hp===20&&armyHealth(t)===UNIT_KEYS.reduce((n,u)=>n+(t.army[u]??0)*STRATEGY_UNITS[u].hp,0))throw new Error('Kale, surlar ve garnizon zaten tam dayanıklı.');
  }else if(o.type==='defend'){
   if(actions.has(`defend:${at}`)||!count(t.army))throw new Error('Savunma için farklı bir bölgede en az bir birlik gerekli.');actions.add(`defend:${at}`);
  }else if(o.type==='cancel'){
   if(!g.sieges?.some(s=>s.side===side&&s.from===at))throw new Error('Bu bölgede devam eden kuşatma yok.');
   if(actions.has(`attack:${at}`))throw new Error('Aynı bölgeye iki saldırı emri verilemez.');actions.add(`attack:${at}`);
  }else if(o.type==='raid'||o.type==='trade'){reserve(at,o.type==='raid'?['piyade','okcu']:UNIT_KEYS.filter(u=>(t.army[u]??0)>0));
  }else if(o.type==='move'){
   if(!neighbors(o.from,o.to))throw new Error('Hareket için çizili yoldaki komşu bölgeyi seç.');
   const owner=castleSide(o.to);if(owner!==null&&owner!==side&&(g.players[owner].wall??0)>0&&!g.players[owner].breaches?.includes(o.from)&&!orders.some(x=>x.type==='cannon'&&x.from===o.from&&x.to===o.to))throw new Error('Bu yöndeki sur ayakta. Kuşat emriyle yık veya Şahi ateşiyle gedik aç.');
   if(!count(o.army))throw new Error('En az bir birlik seç.');
   used[at]??=emptyArmy();for(const u of UNIT_KEYS){if(!Number.isInteger(o.army[u]??0)||(o.army[u]??0)<0)throw new Error('Birlik adedi geçersiz.');used[at]![u]=(used[at]![u]??0)+(o.army[u]??0);if((o.army[u]??0)>0&&firing[at]?.has(u))throw new Error('Atış yapan asker aynı tur hareket edemez.');if(used[at]![u]!>(t.army[u]??0))throw new Error('Aynı birlik iki kez kullanılamaz; yeni asker sonraki tur hazır olur.');}
   actions.add(`move:${at}`);
  }else{
   reserve(at,o.type==='fire'?[o.unit]:o.type==='cannon'?['sahi']:['piyade','okcu','kusatma']);actions.add(`attack:${at}`);
   const target=g.regions[o.to];if(!target||target.owner===side)throw new Error('Rakibin bölgesini hedef seç.');
   if(o.type==='cannon'){
    if(g.turn<(g.players[side].cannonReadyTurn??0))throw new Error(`Şahi topları dolduruluyor. ${g.players[side].cannonReadyTurn}. tur yeniden ateş edebilir.`);
    if(actions.has('cannon'))throw new Error('Bir turda tek Şahi bataryası ateş edebilir.');actions.add('cannon');
    if(castleSide(o.to)===null||castleSide(o.to)===side||!neighbors(at,o.to))throw new Error('Şahi topu rakip kaleye komşu bölgeden ateşlenir.');
    if(!t.army.sahi)throw new Error('Bu bölgede Şahi Topu yok. Önce ana kalende üretip buraya taşı.');
    
   }else if(o.type==='fire'){
    if(!t.army[o.unit])throw new Error(`Bu bölgede ${STRATEGY_UNITS[o.unit].name} yok.`);
    if(distance(at,o.to)>STRATEGY_UNITS[o.unit].range||at===o.to)throw new Error(`Menzil dışında: ${STRATEGY_UNITS[o.unit].name} en fazla ${STRATEGY_UNITS[o.unit].range} bağlantıdan vurur.`);
    if(!count(target.army))throw new Error('Atış için hedefte bir ordu olmalı. Kaleye hasar için Kuşat seç.');
   }else{
    if(castleSide(o.to)===null||castleSide(o.to)===side)throw new Error('Kuşatma hedefi rakibin ana kalesi olmalı.');
    const range=t.army.kusatma?2:1;if(!t.army.kusatma&&!t.army.piyade||distance(at,o.to)>range)throw new Error('Kuşatma için komşu bölgede piyade veya iki bağlantı içinde mancınık gerekli.');
   }
  }
 }
 if(recruits>recruitCapacity(g,side))throw new Error(`Bu tur en fazla ${recruitCapacity(g,side)} asker toplayabilirsin. Daha çok bölgeyle kapasiten artar.`);
 validateCaravanOrders(g,side,orders);
 const total=plannedCost(g,side,orders),bank=resources(g.players[side]);if(RESOURCE_KEYS.some(k=>total[k]>bank[k]))throw new Error(`Kaynak yetersiz. Gereken: ${resourceText(total)}.`);
}

export function resolveStrategyTurn(original:Game,orders:[Order[],Order[]],now:number):Game{
 if(original.matchDeadline&&now>=new Date(original.matchDeadline).getTime())return finishByLimit(original);
 for(const side of [0,1] as Side[])validateStrategyOrders(original,side,orders[side]);
 const g=structuredClone(original),log=[`${g.turn}. tur sonuçları`];const forces=Object.fromEntries(REGIONS.map(r=>[r.id,force(g.regions[r.id])])) as Record<RegionId,Force>;
 const plannedMoves:{side:Side;from:RegionId;to:RegionId;army:Army}[]=[];
 g.replay=[];const event=(e:Omit<BattleEvent,'id'>)=>g.replay!.push({...e,id:`${original.turn}:${g.replay!.length}`});
 const defense=new Set<RegionId>();const moves:{side:Side;from:RegionId;to:RegionId;force:Force}[]=[];const returns:typeof moves=[];const recruits:{side:Side;order:Extract<Order,{type:'recruit'}>}[]=[];
 g.lastShots=[];g.sieges??=[];
 for(const side of [0,1] as Side[])for(const o of orders[side]){
  const c=orderCost(g,side,o);for(const k of RESOURCE_KEYS)g.players[side][k]=(g.players[side][k]??0)-c[k];
  const at='from' in o?o.from:o.at;
  if(o.type==='recruit')recruits.push({side,order:o});
  else if(o.type==='defend'){defense.add(at);log.push(`${sideName(side)}: ${label(at)} savunmada; gelen hasar yarıya iner.`);}
  else if(o.type==='upgrade'){g.players[side].wallLevel=(g.players[side].wallLevel??1)+1;g.players[side].wall=(g.players[side].wall??0)+8;log.push(`${sideName(side)}: surlar ${g.players[side].wallLevel}. seviye, +8 dayanıklılık.`);event({phase:'prepare',kind:'repair',at,side,amount:8,text:`${label(at)}: surlar +8`});}
  else if(o.type==='repair'){g.players[side].wall=Math.min((g.players[side].wallLevel??1)*8,(g.players[side].wall??0)+6);g.players[side].hp=Math.min(20,g.players[side].hp+3);g.players[side].breaches=[];g.players[side].wallDamageByApproach={};const restored=heal(forces[at],3);log.push(`${sideName(side)}: sur +6, kale +3 (en fazla 20), yaralılara toplam +${restored} can; gedikler kapatıldı.`);event({phase:'prepare',kind:'repair',at,side,amount:restored,text:`${label(at)}: onarım ve yaralı tedavisi`});}
  else{
   if(o.type==='siege'||o.type==='cancel')g.sieges=g.sieges.filter(s=>s.from!==at);
   if(o.type==='move'){plannedMoves.push({side,from:o.from,to:o.to,army:structuredClone(o.army)});log.push(`${sideName(side)}: ${label(at)} → ${label(o.to)}, ${count(o.army)} birlik.`);}
   else if(o.type==='siege'){g.sieges.push({side,from:o.from,to:o.to});log.push(`${sideName(side)}: ${label(at)} → ${label(o.to)} kuşatması başladı; iptal edilene kadar sürer.`);}
   else if(o.type==='cancel')log.push(`${sideName(side)}: ${label(at)} kuşatması durduruldu.`);
  }
 }
 const settled:Record<RegionId,Force>={} as Record<RegionId,Force>;
 const pendingBreaches:{side:Side;from:RegionId}[]=[];
 function runFirePhase(phase:'fast'|'heavy'){
  const map=phase==='fast'?forces:settled;const damage:Partial<Record<RegionId,number>>={};const wallDamage:[number,number]=[0,0],castleDamage:[number,number]=[0,0];
  const shot=(side:Side,from:RegionId,to:RegionId,n:number,kind:'fire'|'siege',unit:Unit='okcu')=>{event({phase,kind:unit==='okcu'?'arrow':unit==='sahi'?'cannon':'stone',from,to,unit,side,amount:n,text:`${label(from)} → ${label(to)} · ${STRATEGY_UNITS[unit].name} atışı`});damage[to]=(damage[to]??0)+n;g.lastShots!.push({side,from,to,damage:n,kind});};
  for(const side of [0,1] as Side[])for(const o of orders[side]){
   if(o.type==='fire'&&(o.unit==='okcu')===(phase==='fast')){const f=map[o.from];if(g.regions[o.from].owner!==side||!f||!f.army[o.unit]||!f.ready[o.unit].some(Boolean)){log.push(`${sideName(side)}: ${label(o.from)} kaybedildi veya birlik öldü; atış yapılamadı.`);continue;}if(g.regions[o.to].owner===side)continue;const n=armyBonus(f,rangedAttack(f,o.unit,STRATEGY_UNITS[o.unit].ranged));shot(side,o.from,o.to,n,'fire',o.unit);log.push(`${sideName(side)}: ${STRATEGY_UNITS[o.unit].name} (${STRATEGY_UNITS[o.unit].speed}. öncelik), ${label(o.from)} → ${label(o.to)}, ${n} hasar.`);}
   if(phase==='heavy'&&o.type==='cannon'){
    const f=map[o.from];const shots=g.regions[o.from].owner===side&&f?f.ready.sahi.filter(Boolean).length:0;const initial=original.regions[o.from].army.sahi??0;
    const refund=Math.max(0,initial-shots)*2;g.players[side].gold+=refund;g.players[side].stone=(g.players[side].stone??0)+refund;
    if(!shots||g.regions[o.to].owner===side){log.push(`${sideName(side)}: Şahi ateş edemeden etkisiz kaldı; kullanılmayan mühimmat iade.`);continue;}
    const enemy=castleSide(o.to)!;g.players[side].cannonReadyTurn=g.turn+2;
    const splash=rangedAttack(f,'sahi',2);shot(side,o.from,o.to,splash,'siege','sahi');
    const open=!!g.players[enemy].breaches?.includes(o.from)||(g.players[enemy].wall??0)===0;
    if(open){const n=rangedAttack(f,'sahi',8);castleDamage[enemy]+=n;event({phase:'heavy',kind:'impact',at:o.to,side:enemy,amount:n,text:`${label(o.to)} kale canı −${n}`});log.push(`${sideName(side)}: Şahi açık yönden kaleye ${n}, garnizona ${splash} hasar verdi.`);}
    else{const n=rangedAttack(f,'sahi',12);event({phase:'heavy',kind:'impact',at:o.to,amount:n,side:enemy,text:`${o.from} yönündeki sur −${n}`});g.players[enemy].wallDamageByApproach??={};g.players[enemy].wallDamageByApproach![o.from]=(g.players[enemy].wallDamageByApproach![o.from]??0)+n;if(g.players[enemy].wallDamageByApproach![o.from]!>=(g.players[enemy].wall??0))pendingBreaches.push({side:enemy,from:o.from});log.push(`${sideName(side)}: Şahi ${o.from} → ${o.to} suruna ${n}, garnizona ${splash} hasar verdi. Yeni gedik sonraki tur kullanılabilir.`);}
    log.push(`${sideName(side)}: Şahi bataryası ${g.turn+2}. tur yeniden ateş edebilir.`);
   }
  }
  for(const s of g.sieges??[]){const f=map[s.from];if(!f||g.regions[s.from].owner!==s.side||g.regions[s.to].owner===s.side||!count(f.army))continue;const d=distance(s.from,s.to);if(d>(f.army.kusatma?2:1))continue;const enemy=castleSide(s.to)!;
   if(phase==='fast'&&d===1){if(!orders[s.side].some(o=>o.type==='fire'&&o.from===s.from&&o.unit==='okcu'))shot(s.side,s.from,s.to,armyBonus(f,rangedAttack(f,'okcu',3)),'fire');damage[s.from]=(damage[s.from]??0)+2+attack(map[s.to],'okcu',2);}
   if(phase==='heavy'){const n=(orders[s.side].some(o=>o.type==='fire'&&o.from===s.from&&o.unit==='kusatma')?0:rangedAttack(f,'kusatma',6))+(d===1?Math.max(0,rangedAttack(f,'piyade',1)-(g.players[enemy].breaches?.includes(s.from)?0:2)):0);if(g.players[enemy].breaches?.includes(s.from))castleDamage[enemy]+=n;else wallDamage[enemy]+=n;g.lastShots!.push({side:s.side,from:s.from,to:s.to,damage:n,kind:'siege'});event({phase:'heavy',kind:f.army.kusatma?'stone':'melee',unit:f.army.kusatma?'kusatma':'piyade',side:s.side,from:s.from,to:s.to,amount:n,text:`${label(s.from)} → ${label(s.to)} · kuşatma ${n} hasar`});log.push(`${sideName(s.side)}: ${label(s.to)} kuşatması, ${n} sur/kale hasarı.`);}
  }
  // Equal-priority attacks are computed together before any casualty is applied.
  for(const r of REGIONS){const n=mitigate(damage[r.id]??0,defense.has(r.id),(g.regions[r.id].level??1)>=3?1:0);if(n){const before={...map[r.id].army};const total=UNIT_KEYS.reduce((sum,u)=>sum+map[r.id].health[u].reduce((a,b)=>a+b,0),0);const lost=hit(map[r.id],n);const effective=total-UNIT_KEYS.reduce((sum,u)=>sum+map[r.id].health[u].reduce((a,b)=>a+b,0),0);event({phase,kind:'impact',at:r.id,side:g.regions[r.id].owner??undefined,amount:effective,text:`${label(r.id)}: −${effective} can${lost?`, ${lost} birlik kaybı`:''}`});if(lost){const dead:Army={...emptyArmy(),sahi:0};for(const u of UNIT_KEYS)dead[u]=before[u]-map[r.id].army[u];event({phase,kind:'death',at:r.id,side:g.regions[r.id].owner??undefined,army:dead,text:`${label(r.id)}: ${lost} birlik düştü`});}if(phase==='heavy')put(g.regions[r.id],map[r.id]);log.push(`${label(r.id)}: ${n} hasar, ${lost} birlik kaybı; yaralar korunur.`);}}
  for(const side of [0,1] as Side[]){if(wallDamage[side]){const shield=g.players[side].wall??0;const absorbed=Math.min(shield,wallDamage[side]);g.players[side].wall=shield-absorbed;castleDamage[side]+=wallDamage[side]-absorbed;}if(castleDamage[side])g.players[side].hp=Math.max(0,g.players[side].hp-castleDamage[side]);}
 }
 runFirePhase('fast');
 // Fast arrows hit assembled troops before their march. Casualties reduce the actual marching force.
 for(const m of plannedMoves){const amount:Army={...emptyArmy(),sahi:0};for(const u of UNIT_KEYS)amount[u]=Math.min(m.army[u]??0,forces[m.from].army[u]);if(count(amount))moves.push({side:m.side,from:m.from,to:m.to,force:take(forces[m.from],amount,true)});}
 g.lastMoves=moves.map(m=>({side:m.side,from:m.from,to:m.to,army:{...m.force.army}}));for(const m of moves)event({phase:'march',kind:'move',side:m.side,from:m.from,to:m.to,army:{...m.force.army},text:`${sideName(m.side)}: ${label(m.from)} → ${label(m.to)} · ${count(m.force.army)} birlik`});
 const recordLoss=(before:Force,after:Force,where:Pick<BattleEvent,'at'|'from'|'to'|'fieldBattle'>,side:Side)=>{const oldHp=UNIT_KEYS.reduce((n,u)=>n+before.health[u].reduce((a,b)=>a+b,0),0),newHp=UNIT_KEYS.reduce((n,u)=>n+after.health[u].reduce((a,b)=>a+b,0),0);if(oldHp>newHp)event({phase:'melee',kind:'impact',...where,side,amount:oldHp-newHp,text:`${sideName(side)}: −${oldHp-newHp} ordu canı`});const dead:Army={...emptyArmy(),sahi:0};for(const u of UNIT_KEYS)dead[u]=before.army[u]-after.army[u];if(count(dead))event({phase:'melee',kind:'death',...where,side,army:dead,text:`${sideName(side)}: ${count(dead)} birlik kaybı`});};
 const exchange=(a:Force,b:Force,da=false,db=false,armorA=0,armorB=0,where:Pick<BattleEvent,'at'|'from'|'to'|'fieldBattle'>={},firstSide:Side=0)=>{const oldA=structuredClone(a),oldB=structuredClone(b);const x=mitigate(strength(b),da,armorA),y=mitigate(strength(a),db,armorB);hit(a,x);hit(b,y);recordLoss(oldA,a,where,firstSide);recordLoss(oldB,b,where,firstSide===0?1:0);return`${x}/${y} karşılıklı hasar; kalan ${count(a.army)}/${count(b.army)} birlik.`;};
 // Group each route, then resolve opposing marches once, including all split orders.
 const grouped=new Map<string,typeof moves[number]>();for(const m of moves){const key=`${m.side}:${m.from}:${m.to}`;const old=grouped.get(key);if(old)merge(old.force,m.force);else grouped.set(key,{...m,force:structuredClone(m.force)});}
 const routes=[...grouped.values()];
 const blocked=routes.filter(m=>{const enemy=castleSide(m.to);return enemy!==null&&enemy!==m.side&&(g.players[enemy].wall??0)>0&&!g.players[enemy].breaches?.includes(m.from);});
 for(const castle of ['A','G'] as const){const waves=blocked.filter(m=>m.to===castle);if(!waves.length)continue;const attackers=force();for(const m of waves)merge(attackers,m.force);const defenders=forces[castle];const dealt=Math.max(0,strength(attackers)-2),received=strength(defenders)+2;hit(attackers,received);hit(defenders,Math.ceil(dealt*(defense.has(castle)?.5:1)));
  for(const m of waves.sort((a,b)=>a.from.localeCompare(b.from))){const amount:Army={...emptyArmy(),sahi:0};for(const u of UNIT_KEYS)amount[u]=Math.min(m.force.army[u],attackers.army[u]);returns.push({...m,force:take(attackers,amount)});m.force=force();}
  event({phase:'melee',kind:'melee',at:castle,from:waves[0].from,to:castle,side:waves[0].side,amount:dealt,text:`${label(castle)}: sur dışında çatışma; sur bu tur ayakta`});log.push(`${label(castle)}: sur dışı saldırıda ${dealt} hasar, ${received} karşı ateş. Mevcut sur bu tur geçişi engelledi.`);
 }

 for(const [a,b] of EDGES){const x=routes.find(m=>m.from===a&&m.to===b),y=routes.find(m=>m.from===b&&m.to===a);if(x&&y&&x.side!==y.side){const text=exchange(x.force,y.force,false,false,0,0,{from:a,to:b,fieldBattle:true},x.side);event({phase:'melee',kind:'melee',from:a,to:b,fieldBattle:true,text:`${a} ↔ ${b} yol çatışması · ${text}`});log.push(`${a}–${b} yol çatışması: ${text}`);for(const m of [x,y]){returns.push({...m,force:structuredClone(m.force)});m.force=force();}}}
 for(const r of REGIONS){
  const t=g.regions[r.id];const sides:[Force,Force]=[force(),force()];const garrison=t.owner!==null&&count(forces[r.id].army)>0;
  if(t.owner!==null)merge(sides[t.owner],forces[r.id]);const arrivals=routes.filter(m=>m.to===r.id);for(const m of arrivals)merge(sides[m.side],m.force);
  if(count(sides[0].army)&&count(sides[1].army)){const text=exchange(sides[0],sides[1],garrison&&t.owner===0&&defense.has(r.id),garrison&&t.owner===1&&defense.has(r.id),(t.level??1)>=3&&t.owner===0?1:0,(t.level??1)>=3&&t.owner===1?1:0,{at:r.id});event({phase:'melee',kind:'melee',at:r.id,fieldBattle:t.owner===null,text:`${r.name}: ${text}`});log.push(`${r.name}: ${text}`);}
  const both=!!count(sides[0].army)&&!!count(sides[1].army);
  const winner:Side|null=both?t.owner:count(sides[0].army)?0:count(sides[1].army)?1:null;
  if(both){for(const side of [0,1] as Side[])if(side!==winner){for(const m of arrivals.filter(m=>m.side===side).sort((a,b)=>a.from.localeCompare(b.from))){const amount:Army={...emptyArmy(),sahi:0};for(const u of UNIT_KEYS)amount[u]=Math.min(m.force.army[u],sides[side].army[u]);returns.push({...m,force:take(sides[side],amount)});}log.push(`${sideName(side)} sağ kalan birlikleri geri çekildi; ${r.name} ele geçirilemedi.`);}}
  if(winner!==null){if(t.owner!==winner){event({phase:'aftermath',kind:'capture',at:r.id,side:winner,text:`${sideName(winner)} ele geçirdi: ${r.name}`});log.push(`${sideName(winner)} ele geçirdi: ${r.name}.`);}t.owner=winner;put(t,sides[winner]);settled[r.id]=sides[winner];}else{const empty=force();put(t,empty);settled[r.id]=empty;}
 }
 for(const m of returns)if(count(m.force.army)){const t=g.regions[m.from];if(t.owner===m.side){const f=settled[m.from];merge(f,m.force);put(t,f);event({phase:'melee',kind:'move',side:m.side,from:m.to,to:m.from,army:{...m.force.army},text:`${sideName(m.side)}: sağ kalanlar ${label(m.from)} bölgesine çekildi`});}else log.push(`${sideName(m.side)}: ${label(m.from)} kaybedildi; geri çekilen ${count(m.force.army)} birlik dönemedi ve kaybedildi.`);}
 runFirePhase('heavy');
 for(const breach of pendingBreaches){g.players[breach.side].breaches??=[];if(!g.players[breach.side].breaches!.includes(breach.from)){g.players[breach.side].breaches!.push(breach.from);event({phase:'aftermath',kind:'breach',at:HOME[breach.side],from:breach.from,to:HOME[breach.side],text:`${breach.from} → ${HOME[breach.side]} yönü açıldı; gelecek tur kullanılabilir`});}}
 for(const side of [0,1] as Side[]){const t=g.regions[HOME[side]];if(t.owner!==null&&t.owner!==side&&count(t.army)){const f=force(t);const n=attack(f,'piyade',1)+attack(f,'okcu',1)+attack(f,'kusatma',6);g.players[side].hp=Math.max(0,g.players[side].hp-n);log.push(`${sideName(side)} kalesinin içinde ${n} hasar; kale ${g.players[side].hp}/20.`);}}
 for(const {side,order:o} of recruits){if(g.regions[o.at].owner===side){const f=force(g.regions[o.at]);f.health[o.unit].push(...Array(o.quantity??1).fill(STRATEGY_UNITS[o.unit].hp));f.veterans[o.unit].push(...Array.from({length:o.quantity??1},(_,i)=>({id:`${o.at}:${o.unit}:${g.turn}:${f.veterans[o.unit].length+i}`,born:g.turn,age:0,battles:0})));put(g.regions[o.at],f);event({phase:'aftermath',kind:'recruit',at:o.at,side,unit:o.unit,amount:o.quantity??1,text:`${label(o.at)}: ${o.quantity??1} ${STRATEGY_UNITS[o.unit].name} hazır`});log.push(`${sideName(side)}: ${o.quantity??1} ${STRATEGY_UNITS[o.unit].name} hazırlandı (${label(o.at)}); sonraki tur kullanılabilir.`);}else{const c=orderCost(original,side,o);for(const k of RESOURCE_KEYS)g.players[side][k]=(g.players[side][k]??0)+c[k];log.push(`${sideName(side)}: ${label(o.at)} kaybedildi; üretim iptal edildi, tüm kaynaklar iade edildi.`);}}
 for(const r of REGIONS){const t=g.regions[r.id];if(t.owner===null||r.kind==='castle'){t.level=1;t.heldTurns=0;continue;}const same=t.owner===original.regions[r.id].owner;t.heldTurns=same?(original.regions[r.id].heldTurns??0)+1:0;t.level=Math.min(3,1+Math.floor(t.heldTurns/2));if(t.level>(original.regions[r.id].level??1))log.push(`${sideName(t.owner)}: ${r.name} ${t.level}. seviyeye ulaştı; ana kaynak +${t.level-1}${t.level===3?', yerel savunma +1':''}.`);}
 updateCommanders(original,g,log,event);
 resolveCaravanOrders(original,g,orders,log,event);
 const active=new Set<RegionId>();const incoming=new Set<RegionId>();
 for(const side of [0,1] as Side[])for(const o of orders[side]){if('from' in o){active.add(o.from);if('to' in o)incoming.add(o.to);}if(o.type==='repair'||o.type==='recruit')active.add(o.at);}
 for(const siege of g.sieges){active.add(siege.from);incoming.add(siege.to);}
 for(const r of REGIONS){const t=g.regions[r.id];if(t.owner===null||t.owner!==original.regions[r.id].owner||active.has(r.id)||incoming.has(r.id)||g.players[t.owner].hp===0)continue;
  const f=force(t);const max=UNIT_KEYS.reduce((n,u)=>n+f.army[u]*STRATEGY_UNITS[u].hp,0);
  const wounded=UNIT_KEYS.reduce((n,u)=>n+f.health[u].filter(hp=>hp<STRATEGY_UNITS[u].hp).length,0);const food=Math.ceil(wounded/4);
  if(armyHealth(t)>=max||(g.players[t.owner].grain??0)<food)continue;
  const recovered=heal(f,r.kind==='castle'?2:r.kind==='village'?3:1);if(recovered){g.players[t.owner].grain=(g.players[t.owner].grain??0)-food;put(t,f);event({phase:'aftermath',kind:'heal',at:r.id,side:t.owner,amount:recovered,text:`${r.name}: +${recovered} can · ${food} tahıl`});log.push(`${sideName(t.owner)}: ${r.name} dinlenmesi +${recovered} toplam can; ${food} tahıl harcandı.`);}
 }
 g.sieges=g.sieges.filter(s=>g.regions[s.to].owner!==s.side&&g.regions[s.from].owner===s.side&&(g.regions[s.from].army.piyade>0||g.regions[s.from].army.kusatma>0)&&distance(s.from,s.to)<=(g.regions[s.from].army.kusatma?2:1));g.log=log;
 const record=()=>{g.history=[...(original.history??[]).filter(h=>h.turn!==original.turn),{turn:original.turn,lines:[...g.log]}].slice(-16);return g;};
 const lost=([0,1] as Side[]).map(s=>!g.players[s].hp||REGIONS.every(r=>g.regions[r.id].owner!==s));
 if(lost.some(Boolean)){finish(g,lost.every(Boolean)?'draw':lost[0]?1:0,g.players.some(p=>!p.hp)?'castle':'elimination');return record();}
 if(g.turn>=16){const ended=finishByLimit(g,'turn-limit');Object.assign(g,ended);return record();}
 if(g.logistics)advanceLogistics(g,Object.fromEntries(REGIONS.map(r=>[r.id,regionIncome(r.id,g.regions[r.id].level??1)])) as Record<RegionId,Resources>,log,event);
 else for(const side of [0,1] as Side[]){const c=income(g,side);for(const k of RESOURCE_KEYS)g.players[side][k]=(g.players[side][k]??0)+c[k];log.push(`${sideName(side)} geliri: ${resourceText(c)}. Asker kapasitesi: ${recruitCapacity(g,side)}/tur.`);}
 g.turn++;g.phase='review';g.reviewUntil=new Date(now+9000).toISOString();g.transitionReady=[false,false];g.deadline=new Date(now).toISOString();return record();
}
