'use client';
import type {CSSProperties} from 'react';
import type {Game,RegionId,Side} from '@/lib/game';
import {STRATEGY_REGIONS} from '@/lib/strategy-map';
import {caravanEdge,depotTotal,findCaravan,type Caravan} from '@/lib/logistics';
import {RESOURCE_KEYS,RESOURCE_NAMES,resourceText,resourceTotal,type ResourceKind} from '@/lib/resources';
import type {BattleMode} from './strategy-controls';

const point=(id:RegionId)=>STRATEGY_REGIONS.find(r=>r.id===id)!;
function midpoint(edge:[RegionId,RegionId]){const a=point(edge[0]),b=point(edge[1]);return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};}
function CaravanIcon(){return <svg viewBox="0 0 60 44" width="50" height="38" aria-hidden="true"><path d="M9 30V12h35v18H9Z" fill="#a47340" stroke="#463622" strokeWidth="2"/><path d="M9 15Q11 0 27 0t17 15Z" fill="#e4cf96" stroke="#6b5331" strokeWidth="2"/><path d="M20 1v15M35 1v15M45 29h11M9 23h35" stroke="#755930" strokeWidth="2"/><circle cx="16" cy="33" r="7" fill="#433b2b" stroke="#d7bd80" strokeWidth="2"/><circle cx="39" cy="33" r="7" fill="#433b2b" stroke="#d7bd80" strokeWidth="2"/><path d="M24 5h10v8H24Z" fill="var(--side,#335e82)"/></svg>;}
export function CaravanLayer({game,onSelect,selected}:{game:Game;onSelect:(id:string)=>void;selected:string|null}){
 if(!game.logistics)return null;
 return <div className="caravan-map-layer">{game.logistics.caravans.filter((c):c is Caravan=>!!c).map(c=>{
  const edge=caravanEdge(c),pos=c.status==='delivered'?point(c.side===0?'A':'G'):midpoint(edge);const previous=c.lastEdge?midpoint(c.lastEdge):pos;const via=point(edge[0]);const protectedNow=c.protectedUntil>=game.turn;
  const style={left:`${pos.x}%`,top:`${pos.y}%`,'--cart-from-x':`${previous.x}%`,'--cart-from-y':`${previous.y}%`,'--cart-via-x':`${via.x}%`,'--cart-via-y':`${via.y}%`,'--cart-to-x':`${pos.x}%`,'--cart-to-y':`${pos.y}%`} as CSSProperties;
  return <button key={`${c.id}:${c.edge}:${game.turn}`} style={style} data-caravan-id={c.id} data-edge={edge.join('-')} className={`caravan-token side-${c.side} ${c.lastEdge?'cart-moving':''} ${selected===c.id?'cart-selected':''} ${protectedNow?'cart-protected':''} cart-${c.status}`} title={`${c.side===0?'Batı':'Doğu'} kervanı · ${resourceText(c.cargo)} · ${c.route.join(' → ')}${protectedNow?' · geçici baskın koruması':''}`} aria-label={`${c.side===0?'Batı':'Doğu'} kervanı · ${c.id}`} onClick={()=>onSelect(c.id)}><CaravanIcon/><span>{c.status==='delivered'?'KASAYA ULAŞTI':c.status==='blocked'?'YOL KAPALI':`${resourceTotal(c.cargo)} yük${protectedNow?' · KORUMALI':''}`}</span></button>;
 })}</div>;
}

export function CaravanPanel({game,side,mode,selected,selectedSource,give,take,amount,onGive,onTake,onAmount,onSelect}:{game:Game;side:Side;mode:BattleMode;selected:string|null;selectedSource:RegionId|null;give:ResourceKind;take:ResourceKind;amount:number;onGive:(k:ResourceKind)=>void;onTake:(k:ResourceKind)=>void;onAmount:(n:number)=>void;onSelect:(id:string)=>void}){
 if(!game.logistics)return null;const own=game.logistics.caravans[side];const focus=selected?findCaravan(game,selected):own;
 return <details className="caravan-panel" open={mode==='trade'||mode==='raid'||!!selected}><summary>▣ Kervan ve depolar <span>Depoda {resourceTotal(depotTotal(game,side))} · yolda {own?resourceTotal(own.cargo):0}</span></summary><p>Bölge üretimi depoda bekler. Harcanabilir kaynak, kaleye teslim edilen yüktür. Kale kendi üretimini doğrudan kasaya koyar.</p>
  {game.logistics.caravans.filter((c):c is Caravan=>!!c).map(c=><button className={`caravan-list-item ${c.id===focus?.id?'selected':''}`} key={c.id} onClick={()=>onSelect(c.id)} title="Yükü ve rotayı gösterir. Baskın/takas modunda kaynak ordu seçtiysen emri hazırlar."><b>{c.side===side?'Senin':'Rakip'} kervan</b><span>{c.route.join(' → ')} · {c.status==='delivered'?'Teslim edildi':c.status==='blocked'?'Yol kapalı':'Yolda'}</span><small>{resourceText(c.cargo)}</small></button>)}
  {!own&&<p>Bağlantılı bir üretim bölgesini ele geçirince kervanın yola çıkar. Yol kapanırsa depodaki yük kaybolmaz.</p>}
  {focus&&<p className="caravan-focus">{focus.protectedUntil>=game.turn?`${focus.protectedUntil}. tur sonuna kadar baskın koruması. `:''}{focus.traded?'Bu seferin takası kullanıldı.':'Sefer başına bir takas.'}</p>}
  {mode==='raid'&&<p className="caravan-instruction">{selectedSource?`${selectedSource} seçildi. Düşman kervanına dokun.`:'Önce haritadan piyade/okçu bulunan kendi bölgeni seç.'} {game.logistics.revision>=2?'Baskın toplam yükün yaklaşık %20’sini (toplamda en az 1) kaybettirir':'Bu eski odada baskın kaynak türü başına yaklaşık %20 (en az 1) kaybettirir'}, kaynak başına en fazla 1 ganimet verir; bir tur geciktirir ve iki tur koruma başlatır.</p>}
  {mode==='trade'&&<><div className="trade-fields"><label>Verilecek<select aria-label="Takas verilecek kaynak" value={give} onChange={e=>onGive(e.target.value as ResourceKind)}>{RESOURCE_KEYS.map(k=><option value={k} key={k}>{RESOURCE_NAMES[k]}</option>)}</select></label><label>Alınacak<select aria-label="Takas alınacak kaynak" value={take} onChange={e=>onTake(e.target.value as ResourceKind)}>{RESOURCE_KEYS.map(k=><option value={k} key={k}>{RESOURCE_NAMES[k]}</option>)}</select></label><label>Adet<select aria-label="Takas alınacak adet" value={amount} onChange={e=>onAmount(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select></label></div><p className="caravan-instruction">{amount*2} {RESOURCE_NAMES[give]} → {amount} {RESOURCE_NAMES[take]}, yalnız kervanın yükünde değiştirilir. {selectedSource?`${selectedSource} seçildi; kendi kervanına dokun.`:'Önce kendi ordunun bölgesini seç, sonra kendi kervanına dokun.'} Takas yapan ordu bu tur yürümez/ateş etmez.</p></>}
 </details>;
}
