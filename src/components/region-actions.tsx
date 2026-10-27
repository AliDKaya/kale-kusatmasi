"use client";
import {useState} from 'react';
import {count,validateOrders,type Game,type Order,type RegionId,type Side} from '@/lib/game';
import {distance,HOME,orderCost,resourceText} from '@/lib/strategy';
import {STRATEGY_REGIONS} from '@/lib/strategy-map';
import type {BattleMode} from './strategy-controls';

type Props={game:Game;side:Side;region:RegionId;orders:Order[];locked:boolean;lockReason:string;onOrder:(order:Order)=>void;onMode:(mode:BattleMode,from:RegionId)=>void};
export default function RegionActions({game,side,region,orders,locked,lockReason,onOrder,onMode}:Props){
 const [chosen,setChosen]=useState<RegionId|null>(null);
 const territory=game.regions[region],own=territory.owner===side,home=region===HOME[side],enemyCastle=region===HOME[side===0?1:0];
 const sources=STRATEGY_REGIONS.filter(r=>game.regions[r.id].owner===side&&count(game.regions[r.id].army)>0&&distance(r.id,region)<=2&&r.id!==region);
 const source=sources.length===1?sources[0].id:sources.some(r=>r.id===chosen)?chosen:null;
 const reason=(order:Order)=>{if(locked)return lockReason;try{validateOrders(game,side,[...orders,order]);return '';}catch(error){return error instanceof Error?error.message:'Bu emir şu anda verilemiyor.';}};
 const orderButton=(order:Order,label:string,icon:string)=>{const problem=reason(order),cost=resourceText(orderCost(game,side,order));return <div className="map-action" key={label}><button type="button" disabled={!!problem} title={problem||`${label} · ${cost} · Tur çözülünce uygulanır.`} onClick={()=>onOrder(order)}><span aria-hidden="true">{icon}</span>{label}</button><small>{problem||`${cost} · tur emri`}</small></div>;};
 const targeted=(type:'siege'|'cannon'|'okcu'|'kusatma',label:string,icon:string)=>{if(!source)return <div className="map-action" key={type}><button type="button" disabled title={locked?lockReason:'Önce kaynak ordunu seç.'}><span aria-hidden="true">{icon}</span>{label}</button><small>{locked?lockReason:sources.length?'Kaynak ordunu seç.':'Menzilde uygun bir ordun yok.'}</small></div>;return orderButton(type==='siege'||type==='cannon'?{type,from:source,to:region}:{type:'fire',unit:type,from:source,to:region},label,icon);};
 const sieges=(game.sieges??[]).filter(s=>s.side===side&&(s.from===region||s.to===region));
 if(!own&&!enemyCastle&&!count(territory.army)&&!sieges.length)return null;
 return <section className="region-actions" aria-label={`${region} bölge eylemleri`}><div className="region-action-heading"><b>BURADAN EMİR VER</b><span>{orders.length}/4 emir</span></div>
  {own&&home&&<>{orderButton({type:'upgrade',at:region},'Sur yükselt','⇧')}{orderButton({type:'repair',at:region},'Onar / tedavi','✚')}</>}
  {own&&count(territory.army)>0&&<><div className="map-action"><button type="button" disabled={locked||orders.length>=4} title={locked?lockReason:'Sonra çizili yoldaki komşu hedefi seç. Birlik adetlerini sağdaki panelden değiştirebilirsin.'} onClick={()=>onMode('move',region)}><span aria-hidden="true">➜</span>Buradan ilerle</button><small>Sonra komşu hedefe dokun.</small></div>{orderButton({type:'defend',at:region},'Bölgeyi savun','⛨')}
   {!!territory.army.okcu&&<div className="map-action"><button type="button" disabled={locked||orders.length>=4} onClick={()=>onMode('archer-fire',region)} title="Sonra bir bağlantıdaki düşman ordusunu seç.">➶ Okçu hedefi seç</button></div>}
   {!!territory.army.kusatma&&<div className="map-action"><button type="button" disabled={locked||orders.length>=4} onClick={()=>onMode('catapult-fire',region)} title="Sonra iki bağlantıdaki düşman ordusunu seç.">◉ Mancınık hedefi seç</button></div>}
  </>}
  {!own&&(enemyCastle||count(territory.army)>0)&&<>
   <label className="map-source-label">Kaynak ordu<select aria-label={`${region} hedefi için kaynak ordu`} value={source??''} disabled={locked||sources.length===0} onChange={e=>setChosen(e.target.value as RegionId||null)}><option value="">{sources.length?'Ordunu seç…':'Menzilde ordu yok'}</option>{sources.map(r=><option key={r.id} value={r.id}>{r.id} · {r.name} · {count(game.regions[r.id].army)} birlik</option>)}</select></label>
   {enemyCastle&&<>{targeted('siege','Kuşatma başlat','⚔')}{targeted('cannon','Şahi ateşle','✹')}</>}
   {count(territory.army)>0&&<>{targeted('okcu','Okçu atışı','➶')}{targeted('kusatma','Mancınık atışı','◉')}</>}
  </>}
  {sieges.map(s=><div key={s.from}>{orderButton({type:'cancel',at:s.from},`${s.from} kuşatmasını durdur`,'■')}</div>)}
  <p className="map-action-note">Düğmeler emir hazırlar. Sonuçlar tur sonunda uygulanır.</p>
 </section>;
}
