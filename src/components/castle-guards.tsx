"use client";
import type {Game,RegionId,Side} from '@/lib/game';
import {STRATEGY_REGIONS} from '@/lib/strategy-map';
const APPROACHES=[
 {castle:'A',from:'B',side:0,x:15.2,y:9.3},
 {castle:'A',from:'H',side:0,x:15,y:16.4},
 {castle:'A',from:'C',side:0,x:10.5,y:18.8},
 {castle:'G',from:'E',side:1,x:91.4,y:74.7},
 {castle:'G',from:'M',side:1,x:86.4,y:78.2},
 {castle:'G',from:'F',side:1,x:86.4,y:85.7},
] as const;
export default function CastleGuards({game,onInspect,onHover}:{game?:Game|null;onInspect:(castle:RegionId)=>void;onHover:(castle:RegionId|null)=>void}){
 return <div className="castle-guards" aria-label="Kale yollarındaki sur korumaları">{APPROACHES.map(a=>{
  const p=game?.players[a.side as Side],capacity=(p?.wallLevel??1)*8;
  const open=!!game&&((p?.wall??0)<=0||!!p?.breaches?.includes(a.from));
  const remaining=open?0:Math.max(0,(p?.wall??8)-(p?.wallDamageByApproach?.[a.from]??0));
  const damaged=!open&&remaining<capacity,fromName=STRATEGY_REGIONS.find(r=>r.id===a.from)!.name;
  const text=!game?`${fromName} yolu · sur önizlemesi; maç başlayınca güncellenir.`:open?`${fromName} yolu · gedik açık. Bu yönde sur engeli yok; garnizon hâlâ savunur. Onarım korumayı geri getirir.`:`${fromName} yolu · sur ${remaining}/${capacity}. Şahi bu yöndeki suru kırarsa gedik sonraki tur kullanılır.`;
  return <button key={a.castle+a.from} type="button" className={`castle-guard side-${a.side} ${open?'guard-open':damaged?'guard-damaged':'guard-closed'}`} data-castle-guard={`${a.castle}:${a.from}`} data-guard-state={open?'open':'closed'} aria-label={text} title={`${text} Kale fermanını aç.`} style={{left:`${a.x}%`,top:`${a.y}%`}} onPointerEnter={()=>onHover(a.castle)} onPointerLeave={()=>onHover(null)} onFocus={()=>onHover(a.castle)} onBlur={()=>onHover(null)} onClick={e=>{e.stopPropagation();onInspect(a.castle);}}>
   <svg viewBox="0 0 28 32" aria-hidden="true">{open?<><path className="guard-broken" d="M12 3 3 6v10c0 5 3 9 8 12l-2-8 4-4-4-5Z"/><path className="guard-broken" d="m17 3 8 3v10c0 5-3 9-8 12l3-9-4-4 4-6Z"/><path d="m14 7-3 6 5 4-3 7" className="guard-crack"/></>:<><path className="guard-plate" d="M14 2 3 6v10c0 6 5 11 11 14 6-3 11-8 11-14V6Z"/><path className="guard-shine" d="m7 9 7-3 7 3v7c0 3-3 7-7 10-4-3-7-7-7-10Z"/>{damaged&&<path className="guard-crack" d="m16 7-5 6 6 3-6 8"/>}</>}
   <text x="14" y="20" textAnchor="middle">{a.from}</text></svg>
   <span className="guard-meter" aria-hidden="true"><i style={{width:`${Math.max(0,Math.min(100,remaining/capacity*100))}%`}}/></span>
  </button>;
 })}</div>;
}
