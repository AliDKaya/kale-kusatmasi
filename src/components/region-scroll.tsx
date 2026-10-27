'use client';
import {useEffect,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {count,UNIT_KEYS,UNITS,type Game,type RegionId,type Side} from '@/lib/game';
import {STRATEGY_KEYS,STRATEGY_UNITS,armyHealth,regionIncome,resourceText} from '@/lib/strategy';

type Region={id:RegionId;name:string;x:number;y:number;kind:string};
export default function RegionScroll({region:r,game,side,advanced,expanded,alwaysOpen,selected,reachable,canOrder,onToggle,onCommand,onHover}:{region:Region;game?:Game|null;side:Side;advanced:boolean;expanded:boolean;alwaysOpen:boolean;selected:boolean;reachable:boolean;canOrder:boolean;onToggle:()=>void;onCommand:()=>void;onHover:(id:RegionId|null)=>void}){
 const summaryRef=useRef<HTMLButtonElement>(null),paperRef=useRef<HTMLElement>(null);
 const storageKey=`kk:scroll-layout:${advanced?'strategy':'classic'}:${alwaysOpen?'all':'summary'}:${r.id}`;
 type Layout={pinned:boolean;x?:number;y?:number;width?:number;height?:number};
 const [saved,setSaved]=useState<{key:string;value:Layout}>({key:storageKey,value:{pinned:true}});
 const layout=saved.key===storageKey?saved.value:{pinned:true};
 const [frame,setFrame]=useState({width:advanced?960:900,height:640});
 const gesture=useRef<{kind:'move'|'resize';pointer:number;startX:number;startY:number;x:number;y:number;width:number;height:number;moved:boolean}|null>(null);
 const suppressClick=useRef(false);
 useEffect(()=>{
  let value:Layout={pinned:true};
  try{const raw=JSON.parse(localStorage.getItem(storageKey)??'null');if(raw&&typeof raw.pinned==='boolean'){value={pinned:raw.pinned};for(const key of ['x','y','width','height'] as const)if(typeof raw[key]==='number'&&Number.isFinite(raw[key]))value[key]=raw[key];}}catch{}
  queueMicrotask(()=>setSaved({key:storageKey,value}));
 },[storageKey]);
 useEffect(()=>{const el=paperRef.current?.closest('.map-frame');if(!el)return;const observer=new ResizeObserver(([entry])=>setFrame({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(el);return()=>observer.disconnect();},[]);
 function save(value:Layout){setSaved({key:storageKey,value});try{localStorage.setItem(storageKey,JSON.stringify(value));}catch{}}

 const t=game?.regions[r.id],owner=t?.owner==null?'neutral':`side-${t.owner}`,n=t?count(t.army):0;
 const label=!game?'Önizleme':t?.owner==null?'Tarafsız':t.owner===side?'Senin bölgen':'Rakip bölge';
 const keys=advanced?STRATEGY_KEYS:UNIT_KEYS;const marshal=!!t?.veterans&&Object.values(t.veterans).flat().some(v=>v.marshal);
 const hp=advanced&&t?armyHealth(t):0,max=advanced&&t?STRATEGY_KEYS.reduce((sum,u)=>sum+(t.army[u]??0)*STRATEGY_UNITS[u].hp,0):0;
 const castleSide=r.id==='A'?0:r.id==='G'?1:null;const castle=castleSide===null?null:game?.players[castleSide];
 const style={left:`${r.x}%`,top:`${r.y}%`} as CSSProperties;
 const offset=advanced?({A:16,B:16,I:20,C:28,H:24,K:32,D:8,L:12,E:16,J:36,F:16,M:24,G:12}[r.id]??16):16;
 const top=expanded?(r.y>=65?-210:r.y>=45?-75:offset):offset;
 const edge=r.x<15?(expanded?(advanced?10:52):12):r.x>85?(expanded?(advanced?-10:-52):-12):(advanced?({H:-8,K:8,D:-5,L:5}[r.id as 'H'|'K'|'D'|'L']??0):0);
 const ids=advanced?['A','B','I','C','H','K','D','L','E','J','F','M','G']:['A','B','E','D','C','F','G'];
 const index=ids.indexOf(r.id),columns=advanced?4:3,rows=Math.ceil(ids.length/columns);
 const cellWidth=frame.width/columns,cellHeight=frame.height/rows;
 const width=expanded?Math.min(Math.max(layout.width??(alwaysOpen?Math.min(206,cellWidth-20):206),168),Math.min(360,frame.width-16)):156;
 const height=expanded?Math.min(Math.max(layout.height??(alwaysOpen?Math.min(226,cellHeight-18):226),104),Math.min(360,frame.height-16)):38;
 const homeX=alwaysOpen?(index%columns+.5)*cellWidth-width/2:r.x/100*frame.width+edge-width/2;
 const homeY=alwaysOpen?Math.floor(index/columns)*cellHeight+9:r.y/100*frame.height+top;
 const x=Math.max(8,Math.min(layout.x===undefined?homeX:layout.x*frame.width,frame.width-width-8));
 const y=Math.max(8,Math.min(layout.y===undefined?homeY:layout.y*frame.height,frame.height-height-8));
 const paperStyle:CSSProperties={left:x-r.x/100*frame.width,top:y-r.y/100*frame.height,transform:'none',width,height:expanded?height:undefined,'--paper-body-height':`${height-44}px`} as CSSProperties;
 function startGesture(e:ReactPointerEvent<HTMLElement>,kind:'move'|'resize'){
  if(e.button!==0||kind==='move'&&layout.pinned||(e.target as HTMLElement).closest('.scroll-pin,.scroll-close'))return;
  if(kind==='resize')e.preventDefault();
  const target=e.target as HTMLElement;target.setPointerCapture(e.pointerId);
  gesture.current={kind,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x,y,width,height,moved:false};
 }
 function moveGesture(e:ReactPointerEvent<HTMLElement>){
  const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;
  const dx=e.clientX-g.startX,dy=e.clientY-g.startY;if(!g.moved&&Math.hypot(dx,dy)<4)return;
  g.moved=true;suppressClick.current=true;
  if(g.kind==='move')save({...layout,x:Math.max(8,Math.min(g.x+dx,frame.width-width-8))/frame.width,y:Math.max(8,Math.min(g.y+dy,frame.height-height-8))/frame.height});
  else save({...layout,x:g.x/frame.width,y:g.y/frame.height,width:Math.max(168,Math.min(g.width+dx,360,frame.width-x-8)),height:Math.max(104,Math.min(g.height+dy,360,frame.height-y-8))});
 }
 function endGesture(){gesture.current=null;setTimeout(()=>{suppressClick.current=false;},0);}

 const description=`${r.id}: ${r.name}. ${t?.owner==null?'Tarafsız':t.owner===0?'Batı':'Doğu'}. ${n} birlik.`;
 return <>
  <button style={style} onPointerEnter={()=>onHover(r.id)} onPointerLeave={()=>onHover(null)} onFocus={()=>onHover(r.id)} onBlur={()=>onHover(null)} className={`region region-city-target ${owner} ${selected?'selected':''} ${reachable?'reachable':''} ${t?.owner===side&&canOrder?'your-territory':''}`} onClick={e=>{e.stopPropagation();onCommand();}} aria-label={description} title={canOrder?`${r.name}: hamle vermek için şehre dokun. Bilgi için fermanı aç.`:`${r.name}: bölge bilgilerini aç.`}><span className="city-banner" aria-hidden="true"/>{t&&n>0&&<img className="city-army-portrait" src={`/images/${t.army.sahi?'sahi.webp':`${t.army.kusatma?'kusatma':t.army.piyade?'piyade':'okcu'}.jpg`}`} alt=""/>}<span className="visually-hidden">{r.name} · {label} {t?.owner===side?'SEN':''} · {n} birlik {marshal?'· MAREŞAL':''}</span></button>
 <div className={`region-marker ${owner} ${expanded?'scroll-open':''} ${selected?'marker-selected':''}`} style={style} onPointerEnter={()=>onHover(r.id)} onPointerLeave={()=>onHover(null)} onFocusCapture={()=>onHover(r.id)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))onHover(null);}} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'&&expanded&&!alwaysOpen){e.preventDefault();onToggle();summaryRef.current?.focus();}}}>

  <section ref={paperRef} style={paperStyle} className={`region-scroll ${expanded?'is-open':''} ${layout.pinned?'is-pinned':'is-unpinned'}`} data-scroll-id={r.id} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();}}} aria-label={`${r.name} fermanı`}>
   <span className="scroll-roller roller-top" aria-hidden="true"/>
   <div className="scroll-titlebar" onPointerDown={e=>startGesture(e,'move')} title={layout.pinned?'Ferman sabit. Taşımak için raptiyeyi çıkar.':'Başlıktan sürükleyerek fermanı taşı.'}>
   <button ref={summaryRef} className="scroll-summary" aria-expanded={expanded} aria-controls={`scroll-${r.id}`} aria-label={`${r.id} fermanını ${expanded?'kapat':'aç'}`} onClick={()=>{if(!alwaysOpen)onToggle();}} title={alwaysOpen?'Tüm fermanlar açık; görünüm ayarından özet seçebilirsin.':`${r.name} ayrıntılarını ${expanded?'kapat':'aç'}`} aria-disabled={alwaysOpen}>
    <span className="scroll-heading"><b>{r.id}</b><span>{r.name}</span>{marshal&&<em className="scroll-mini-marshal" title="Mareşal">★</em>}<span className="scroll-number" title="Toplam birlik"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 9V7a5 5 0 0 1 10 0v2h-3V5H8v4Zm1 1h8v2a4 4 0 0 1-8 0ZM2 19v-2c0-2 3-3 5-3l3 3 3-3c2 0 5 1 5 3v2Z" fill="currentColor"/></svg>{n}</span><i aria-hidden="true">{expanded?'⌃':'⌄'}</i></span>
   </button>
   <button type="button" className="scroll-pin" aria-label={`${r.id} fermanını ${layout.pinned?'serbest bırak':'sabitle'}`} aria-pressed={layout.pinned} onClick={()=>save({...layout,pinned:!layout.pinned})} title={layout.pinned?'Raptiye takılı · taşımak için çıkar':'Raptiyeyi tak · konumu sabitle'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l-1 6 4 4v2h-6v6l-1 2-1-2v-6H5v-2l4-4Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2"/></svg></button>
   </div>
   <div className="scroll-unroll" id={`scroll-${r.id}`} inert={!expanded} aria-hidden={!expanded}><div className="scroll-unroll-inner"><div className="scroll-content">
    <div className="scroll-detail-heading"><strong>{r.name}</strong>{!alwaysOpen&&<button type="button" className="scroll-close" onClick={()=>{onToggle();summaryRef.current?.focus();}} aria-label={`${r.id} fermanını kapat`}>×</button>}</div>
    <p className="scroll-owner-detail"><b>Sahiplik:</b> {label}{advanced?` · Sv.${t?.level??1}`:''}</p><dl className="scroll-unit-list">{keys.map(u=><div key={u}><dt>{advanced?STRATEGY_UNITS[u].name:UNITS[u].name}</dt><dd>{t?.army[u]??0}</dd></div>)}</dl>
    {advanced&&<><p><b>Ordu canı:</b> {hp}/{max}{marshal&&<span className="scroll-marshal"> ★ Mareşal</span>}</p><p><b>Gelişim:</b> {t?.level??1}. seviye · {t?.heldTurns??0} tur elde{(t?.level??1)>=3?' · savunma +1':''}</p><p><b>Tur üretimi:</b> {resourceText(regionIncome(r.id,t?.level??1))}</p>{game?.logistics&&<p><b>Depoda:</b> {resourceText(game.logistics.depots[r.id])}</p>}</>}
    {!advanced&&<p><b>Gelir:</b> {r.kind==='forest'?'+2 odun / tur':r.kind==='mine'?'+3 altın / tur':r.kind==='village'?'Asker toplamada −1 altın':'+1 altın, +1 odun / tur'}</p>}
    {castle&&<p><b>Kale:</b> {castle.hp}/20{advanced?` · Sur ${castle.wall??0}/${(castle.wallLevel??1)*8}`:''}</p>}
    {!game&&<p className="scroll-hint">Maç başlayınca sahiplik ve ordu bilgileri güncellenir.</p>}
   </div></div></div>
   <span className="scroll-roller roller-bottom" aria-hidden="true"/>
   {expanded&&<button className="scroll-resize" aria-label={`${r.id} fermanının boyutunu değiştir`} title="Köşeden sürükle: boyutlandır. Ok tuşlarıyla da ayarlanır." onPointerDown={e=>startGesture(e,'resize')} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();save({...layout,width:Math.max(168,Math.min(360,width+(e.key==='ArrowRight'?12:e.key==='ArrowLeft'?-12:0))),height:Math.max(104,Math.min(360,height+(e.key==='ArrowDown'?12:e.key==='ArrowUp'?-12:0)))});}}><span aria-hidden="true">◢</span></button>}
  </section>
 </div></>;
}
