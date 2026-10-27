'use client';
import {useRef,type CSSProperties} from 'react';
import {count,UNIT_KEYS,UNITS,type Game,type RegionId,type Side} from '@/lib/game';
import {STRATEGY_KEYS,STRATEGY_UNITS,armyHealth,regionIncome,resourceText} from '@/lib/strategy';

type Region={id:RegionId;name:string;x:number;y:number;kind:string};
export default function RegionScroll({region:r,game,side,advanced,expanded,alwaysOpen,selected,reachable,canOrder,onToggle,onCommand}:{region:Region;game?:Game|null;side:Side;advanced:boolean;expanded:boolean;alwaysOpen:boolean;selected:boolean;reachable:boolean;canOrder:boolean;onToggle:()=>void;onCommand:()=>void}){
 const summaryRef=useRef<HTMLButtonElement>(null);
 const t=game?.regions[r.id],owner=t?.owner==null?'neutral':`side-${t.owner}`,n=t?count(t.army):0;
 const label=!game?'Önizleme':t?.owner==null?'Tarafsız':t.owner===side?'Senin bölgen':'Rakip bölge';
 const keys=advanced?STRATEGY_KEYS:UNIT_KEYS;const marshal=!!t?.veterans&&Object.values(t.veterans).flat().some(v=>v.marshal);
 const hp=advanced&&t?armyHealth(t):0,max=advanced&&t?STRATEGY_KEYS.reduce((sum,u)=>sum+(t.army[u]??0)*STRATEGY_UNITS[u].hp,0):0;
 const castleSide=r.id==='A'?0:r.id==='G'?1:null;const castle=castleSide===null?null:game?.players[castleSide];
 const style={left:`${r.x}%`,top:`${r.y}%`} as CSSProperties;
 const offset=advanced?({A:16,B:16,I:20,C:28,H:24,K:32,D:8,L:12,E:16,J:36,F:16,M:24,G:12}[r.id]??16):16;
 const top=expanded?(r.y>=65?-210:r.y>=45?-75:offset):offset;
 const edge=r.x<15?(expanded?(advanced?10:52):12):r.x>85?(expanded?(advanced?-10:-52):-12):(advanced?({H:-8,K:8,D:-5,L:5}[r.id as 'H'|'K'|'D'|'L']??0):0);
 const paperStyle:CSSProperties={left:edge,top,transform:'translateX(-50%)'};
 const description=`${r.id}: ${r.name}. ${t?.owner==null?'Tarafsız':t.owner===0?'Batı':'Doğu'}. ${n} birlik.`;
 return <div className={`region-marker ${owner} ${expanded?'scroll-open':''} ${selected?'marker-selected':''}`} style={style} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'&&expanded&&!alwaysOpen){e.preventDefault();onToggle();summaryRef.current?.focus();}}}>
  <button className={`region region-city-target ${owner} ${selected?'selected':''} ${reachable?'reachable':''} ${t?.owner===side&&canOrder?'your-territory':''}`} onClick={onCommand} disabled={!game||!canOrder} aria-label={description} title={`${r.name}: hamle vermek için şehre dokun. Bilgi için yukarıdaki fermanı aç.`}><span className="city-banner" aria-hidden="true"/>{t&&n>0&&<img className="city-army-portrait" src={`/images/${t.army.sahi?'sahi.webp':`${t.army.kusatma?'kusatma':t.army.piyade?'piyade':'okcu'}.jpg`}`} alt=""/>}<span className="visually-hidden">{r.name} · {label} {t?.owner===side?'SEN':''} · {n} birlik {marshal?'· MAREŞAL':''}</span></button>
  <section style={paperStyle} className={`region-scroll ${expanded?'is-open':''}`} aria-label={`${r.name} fermanı`}>
   <span className="scroll-roller roller-top" aria-hidden="true"/>
   <button ref={summaryRef} className="scroll-summary" aria-expanded={expanded} aria-controls={`scroll-${r.id}`} aria-label={`${r.id} fermanını ${expanded?'kapat':'aç'}`} onClick={onToggle} title={alwaysOpen?'Tüm fermanlar açık; görünüm ayarından özet seçebilirsin.':`${r.name} ayrıntılarını ${expanded?'kapat':'aç'}`} disabled={alwaysOpen}>
    <span className="scroll-heading"><b>{r.id}</b><span>{r.name}</span>{marshal&&<em className="scroll-mini-marshal" title="Mareşal">★</em>}<span className="scroll-number" title="Toplam birlik"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 9V7a5 5 0 0 1 10 0v2h-3V5H8v4Zm1 1h8v2a4 4 0 0 1-8 0ZM2 19v-2c0-2 3-3 5-3l3 3 3-3c2 0 5 1 5 3v2Z" fill="currentColor"/></svg>{n}</span><i aria-hidden="true">{expanded?'⌃':'⌄'}</i></span>
   </button>
   <div className="scroll-unroll" id={`scroll-${r.id}`} inert={!expanded} aria-hidden={!expanded}><div className="scroll-unroll-inner"><div className="scroll-content">
    <div className="scroll-detail-heading"><strong>{r.name}</strong>{!alwaysOpen&&<button type="button" className="scroll-close" onClick={()=>{onToggle();summaryRef.current?.focus();}} aria-label={`${r.id} fermanını kapat`}>×</button>}</div>
    <p className="scroll-owner-detail"><b>Sahiplik:</b> {label}{advanced?` · Sv.${t?.level??1}`:''}</p><dl className="scroll-unit-list">{keys.map(u=><div key={u}><dt>{advanced?STRATEGY_UNITS[u].name:UNITS[u].name}</dt><dd>{t?.army[u]??0}</dd></div>)}</dl>
    {advanced&&<><p><b>Ordu canı:</b> {hp}/{max}{marshal&&<span className="scroll-marshal"> ★ Mareşal</span>}</p><p><b>Gelişim:</b> {t?.level??1}. seviye · {t?.heldTurns??0} tur elde{(t?.level??1)>=3?' · savunma +1':''}</p><p><b>Tur üretimi:</b> {resourceText(regionIncome(r.id,t?.level??1))}</p>{game?.logistics&&<p><b>Depoda:</b> {resourceText(game.logistics.depots[r.id])}</p>}</>}
    {!advanced&&<p><b>Gelir:</b> {r.kind==='forest'?'+2 odun / tur':r.kind==='mine'?'+3 altın / tur':r.kind==='village'?'Asker toplamada −1 altın':'+1 altın, +1 odun / tur'}</p>}
    {castle&&<p><b>Kale:</b> {castle.hp}/20{advanced?` · Sur ${castle.wall??0}/${(castle.wallLevel??1)*8}`:''}</p>}
    {!game&&<p className="scroll-hint">Maç başlayınca sahiplik ve ordu bilgileri güncellenir.</p>}
   </div></div></div>
   <span className="scroll-roller roller-bottom" aria-hidden="true"/>
  </section>
 </div>;
}
