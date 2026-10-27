'use client';
import {useEffect,useState,type CSSProperties,type ReactNode} from 'react';
import {regionsFor,type BattleEvent,type Game,type Unit,type RegionId} from '@/lib/game';
import {STRATEGY_KEYS,STRATEGY_UNITS} from '@/lib/strategy';

const PHASES=[['prepare','Hazırlık ve onarım',900],['fast','Okçu atışları · öncelik 3',1100],['march','Ordular ilerliyor',1300],['melee','Yakın dövüş · öncelik 2',1600],['heavy','Ağır silahlar · öncelik 1',1900],['aftermath','Kayıplar, gedikler ve tedavi',1500]] as const;
const portrait=(u:Unit)=>`/images/${u==='sahi'?'sahi.webp':`${u}.jpg`}`;
export default function BattleReplay({game,onSound,children,positions}:{positions?:{id:RegionId;x:number;y:number}[];game:Game|null|undefined;onSound:(events:BattleEvent[])=>void;children:(overlay:ReactNode)=>ReactNode}){
 const [step,setStep]=useState(-1),[play,setPlay]=useState(0);const events=game?.replay??[];const key=events.map(e=>e.id).join('|');const stages=PHASES.filter(([phase])=>events.some(e=>e.phase===phase));
 useEffect(()=>{
  if(!key)return;let elapsed=0;const timers:ReturnType<typeof setTimeout>[]=[];
  for(let i=0;i<stages.length;i++){const index=i;timers.push(setTimeout(()=>setStep(index),elapsed));elapsed+=stages[i][2];}
  timers.push(setTimeout(()=>setStep(-1),elapsed));return()=>{for(const timer of timers)clearTimeout(timer);};
  // Same server event IDs must not restart when a presence or room refresh arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,play]);
 const stage=step>=0?stages[step]:undefined;const visible=stage?events.filter(e=>e.phase===stage[0]):[];
 useEffect(()=>{if(stage)onSound(visible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[step,key,play,onSound]);
 const map=positions??regionsFor(game);const region=(id:BattleEvent['at'])=>map.find(r=>r.id===id);const playing=!!stage;
 const styleAt=(e:BattleEvent):CSSProperties=>{if(e.fieldBattle&&!e.at&&e.from&&e.to){const a=region(e.from),b=region(e.to);if(a&&b)return{left:`${(a.x+b.x)/2}%`,top:`${(a.y+b.y)/2}%`};}const at=region(e.at??e.to);return{left:`${at?.x??50}%`,top:`${at?.y??50}%`};};
 const overlay=<div className={`combat-layer ${playing?'replaying':''}`} aria-hidden="true" key={`${key}:${play}:${step}`}>
  <svg className="combat-projectiles" viewBox="0 0 100 100" preserveAspectRatio="none">{visible.filter(e=>e.kind==='arrow'||e.kind==='stone'||e.kind==='cannon').map(e=>{const a=region(e.from),b=region(e.to);if(!a||!b)return null;const path=`M${a.x},${a.y} Q${(a.x+b.x)/2},${Math.min(a.y,b.y)-10} ${b.x},${b.y}`;return <g key={e.id} className={`projectile-${e.kind}`}><path d={path} className="projectile-trail"/><g><animateMotion dur={`${(stage?.[2]??1000)*.00065}s`} begin="0.1s" fill="freeze" path={path} rotate="auto"/>{e.kind==='arrow'?<path d="M-2 0H1.5M.4-.6 1.5 0 .4.6" className="flying-arrow"/>:<circle r={e.kind==='cannon'?.9:1.1} className="flying-ball"/>}</g>{e.kind==='cannon'&&<circle cx={a.x} cy={a.y} r="3" className="muzzle-flash"/>}<circle cx={b.x} cy={b.y} r="3.5" className="projectile-impact"/></g>;})}</svg>
  {visible.map(e=>{
   if(e.kind==='move'){const a=region(e.from),b=region(e.to);if(!a||!b)return null;return STRATEGY_KEYS.filter(u=>(e.army?.[u]??0)>0).map((u,i)=><div key={`${e.id}:${u}`} className={`combat-march side-${e.side??0} march-${u}`} style={{'--from-x':`${a.x}%`,'--from-y':`${a.y}%`,'--to-x':`${b.x}%`,'--to-y':`${b.y}%`,'--march-time':`${stage?.[2]??1300}ms`,marginLeft:i*18-9} as CSSProperties}><img src={portrait(u)} alt=""/><span>{e.side===0?'BATI':'DOĞU'} · {STRATEGY_UNITS[u].name} ×{e.army?.[u]}</span></div>);}
   if(e.kind==='melee')return <div key={e.id} style={styleAt(e)} className={`combat-melee ${e.fieldBattle?'field-battle':''}`}><div><img src={portrait('piyade')} alt=""/><b>⚔</b><img src={portrait('piyade')} alt=""/></div><strong>{e.fieldBattle?'MEYDAN SAVAŞI':'YAKIN DÖVÜŞ'}</strong></div>;
   if(e.kind==='impact')return <div key={e.id} style={{...styleAt(e),marginLeft:(visible.filter(x=>x.kind==='impact'&&x.at===e.at).findIndex(x=>x.id===e.id)-.5)*44}} className="combat-hit"><span>−{e.amount??0}</span><small>{e.text.includes('sur')?'SUR':e.text.includes('kale canı')?'KALE':'ORDU CANI'}</small></div>;
   if(e.kind==='death')return <div key={e.id} style={styleAt(e)} className="combat-loss">{STRATEGY_KEYS.filter(u=>(e.army?.[u]??0)>0).map(u=><span key={u}><img src={portrait(u)} alt=""/>−{e.army?.[u]}</span>)}</div>;
   if(e.kind==='capture')return <div key={e.id} style={styleAt(e)} className={`combat-flag side-${e.side??0}`}><b>⚑</b><span>{e.side===0?'BATI':'DOĞU'} ELE GEÇİRDİ</span></div>;
   if(e.kind==='breach')return <div key={e.id} style={styleAt(e)} className="combat-breach"><b>ϟ</b><span>GEDİK AÇILDI</span></div>;
   if(e.kind==='heal'||e.kind==='repair'||e.kind==='recruit')return <div key={e.id} style={styleAt(e)} className="combat-heal"><b>+{e.amount||'✚'}</b><span>{e.kind==='recruit'?'YENİ BİRLİK':e.kind==='repair'?'ONARIM':'TEDAVİ'}</span></div>;
   return null;
  })}
 </div>;
 return <>{events.length>0&&<section className="combat-replay-bar" aria-label="Savaş animasyonu"><div><b>{playing?stage?.[1]:'Son turun savaş özeti'}</b><span>{playing?`${step+1}/${stages.length} · ${visible[0]?.fieldBattle?'Tarafsız bölgede meydan savaşı':visible[0]?.text??''}`:game?.phase==='playing'?'Tekrar izlerken oyun sayacı devam eder.':'Hangi birliğin nereye gittiğini tekrar izleyebilirsin.'}</span></div><button title="Sunucunun son çözdüğü turun görsel olaylarını yeniden oynatır. Oyun durumunu değiştirmez." onClick={()=>setPlay(n=>n+1)}>{playing?'Baştan izle ↻':'Tekrar izle ↻'}</button>{playing&&<div className="combat-stage-progress" key={`${step}:${play}`} style={{animationDuration:`${stage?.[2]}ms`}}/>}</section>}{children(playing?overlay:null)}</>;
}
