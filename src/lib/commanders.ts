import type {BattleEvent,Game,Side,Unit} from './game';
export type Veteran={id:string;born:number;age:number;battles:number;marshal?:boolean};
export type CommandState={revision:1|2;cooldownUntil:[number,number];rallyUsed?:[boolean,boolean]};
const KEYS:Unit[]=['piyade','okcu','kusatma','sahi'];
export const initialCommand=():CommandState=>({revision:2,cooldownUntil:[0,0],rallyUsed:[false,false]});
export function updateCommanders(original:Game,g:Game,log:string[],emit:(e:Omit<BattleEvent,'id'>)=>void){
 if(!g.command)return;
 const entries=(state:Game,side:Side)=>Object.entries(state.regions).filter(([,r])=>r.owner===side).flatMap(([at,r])=>KEYS.flatMap(unit=>(r.veterans?.[unit]??[]).map(v=>({at:at as keyof Game['regions'],unit,v}))));
 for(const side of [0,1] as Side[]){
  const before=entries(original,side),after=entries(g,side),oldLeader=before.find(e=>e.v.marshal);
  if(oldLeader&&!after.some(e=>e.v.id===oldLeader.v.id)){
   g.command.cooldownUntil[side]=g.turn+3;
   for(const e of after){e.v.age=0;e.v.battles=0;delete e.v.marshal;}
   const text=`${side===0?'Batı':'Doğu'} mareşali düştü; sonraki iki tur yeni terfi ilerlemesi durur.`;log.push(text);emit({phase:'aftermath',kind:'commander',side,text});continue;
  }
  if(g.turn<g.command.cooldownUntil[side])continue;
  for(const e of after){if(e.v.born>=g.turn)continue;e.v.age++;
   const fought=g.replay?.some(ev=>ev.phase!=='aftermath'&&((ev.kind==='impact'&&ev.side===side&&ev.at===e.at&&(ev.amount??0)>0)||(['arrow','stone','cannon'].includes(ev.kind)&&ev.side===side&&ev.from===e.at&&(ev.amount??0)>0)||ev.kind==='melee'&&(ev.at===e.at||ev.from===e.at||ev.to===e.at)));
   if(fought)e.v.battles++;
  }
  if(after.some(e=>e.v.marshal))continue;
  const candidate=after.filter(e=>e.unit==='piyade'&&e.v.age>=4&&e.v.battles>=2).sort((a,b)=>b.v.battles-a.v.battles||b.v.age-a.v.age||a.v.id.localeCompare(b.v.id))[0];
  if(candidate){candidate.v.marshal=true;const text=`${side===0?'Batı':'Doğu'}: ${candidate.at} bölgesinde kıdemli piyade mareşal oldu. Aynı orduya toplam +1 ordu hasarı ve 1 hasar azaltma; sonraki turdan itibaren.`;log.push(text);emit({phase:'aftermath',kind:'commander',side,at:candidate.at,text});}
 }
}
