'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { api, session, supabase } from '@/lib/browser';
import { Army, EDGES, Game, Order, REGIONS, RegionId, Side, UNITS, UNIT_KEYS, count, emptyArmy, neighbors, validateOrders, score } from '@/lib/game';
import { Resource } from './icons';
import HowToPlay from './how-to-play';
import BattleJournal from './battle-journal';
type Snapshot = { id:string;code:string;version:number;game:Game|null;side:Side;serverTime:string;players:{id:string;nickname:string;side:Side;ready:boolean}[];ownOrders:Order[] };
type Mode = 'piyade'|'okcu'|'kusatma'|'move'|'defend';
export default function Battlefield({code}:{code:string}) {
  const [snap,setSnap] = useState<Snapshot|null>(null); const snapshot = useRef<Snapshot|null>(null);
  const [orders,setOrders] = useState<Order[]>([]); const draft = useRef<Order[]>([]); const dirty = useRef(false);
  const [mode,setMode] = useState<Mode>('piyade'); const [selected,setSelected] = useState<RegionId|null>(null);
  const [army,setArmy] = useState<Army>(emptyArmy()); const [error,setError] = useState('');
  const [status,setStatus] = useState('Odaya bağlanılıyor…'); const [busy,setBusy] = useState(false); const [saving,setSaving] = useState(false);
  const [online,setOnline] = useState<string[]>([]); const [network,setNetwork] = useState(true); const [remaining,setRemaining] = useState(15);
  const [sound,setSound] = useState(false); const audio = useRef<AudioContext|null>(null); const soundRef = useRef(false);
  const [totalRemaining,setTotalRemaining]=useState<number|null>(null);const [reviewRemaining,setReviewRemaining]=useState(0);
  const [copied,setCopied] = useState(false); const [confirm,setConfirm] = useState(false);
  const lastRequest = useRef(0); const offset = useRef(0); const pending = useRef<ReturnType<typeof setTimeout>|null>(null);
  const submitting = useRef(false); const mounted = useRef(true);
  const resultAnchor = useRef<HTMLElement|null>(null);const phaseAnchor=useRef<HTMLElement|null>(null);
  const beep = useCallback((kind:'click'|'turn'|'warning'|'victory'='click') => {
    if (!soundRef.current) return;
    try {
      const ctx = audio.current ??= new AudioContext();
      void ctx.resume().then(()=>{
        const notes=kind==='victory'?[392,494,587,784]:kind==='turn'?[262,330,392]:kind==='warning'?[740,740]:[440,587];
        notes.forEach((hz,i)=>{const time=ctx.currentTime+i*.13;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(hz,time);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.16,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+.23);osc.connect(gain).connect(ctx.destination);osc.start(time);osc.stop(time+.25);});
      });
    } catch { /* Sound is optional. */ }
  },[]);
  const apply = useCallback((data:Snapshot) => {
    if (!mounted.current) return;
    const previous = snapshot.current;
    if (previous && data.version < previous.version) return;
    offset.current = new Date(data.serverTime).getTime()-Date.now();
    const changedTurn = previous?.game?.turn !== data.game?.turn || previous?.game?.phase !== data.game?.phase;
    snapshot.current = data; setSnap(data);
    if(data.game?.phase==='playing')setRemaining(Math.max(0,Math.ceil((new Date(data.game.deadline).getTime()-new Date(data.serverTime).getTime())/1000)));
    setReviewRemaining(data.game?.reviewUntil?Math.max(0,Math.ceil((new Date(data.game.reviewUntil).getTime()-new Date(data.serverTime).getTime())/1000)):0);
    if (!previous || changedTurn || !dirty.current) { draft.current=data.ownOrders;setOrders(data.ownOrders);dirty.current=false; }
    if (previous && changedTurn) {setSelected(null);setArmy(emptyArmy());setError('');beep(data.game?.phase==='finished'?'victory':'turn');}
    const phase=data.game?.phase;const ready=data.players.find(p=>p.side===data.side)?.ready;
    setStatus(!data.game?'İkinci oyuncu bekleniyor. Oda kodunu arkadaşına gönder.':phase==='finished'?'Maç tamamlandı.':phase==='waiting'?(ready?'Hazırsın. Rakibin maça hazır olması bekleniyor.':'İkiniz de Maça hazırım demeden sayaç başlamaz.'):phase==='review'?(ready?'Sonraki tur için hazırsın. Rakibin bekleniyor.':'Tur bitti. Sonuçları inceleyin; ikiniz de hazır olunca sonraki tur başlar.'):ready?'Emirlerin kilitlendi. Rakibin emirleri bekleniyor.':'İki emrini seç, sonra Emirlerim hazır düğmesine bas.');
  },[beep]);
  const refresh = useCallback(async () => {
    try { const data=await api<Snapshot>(`/api/rooms/${code}`); apply(data); }
    catch(e) { if(mounted.current) setError(e instanceof Error?e.message:'Bağlantı kurulamadı.'); }
  },[code,apply]);
  const send = useCallback(async (ready:boolean) => {
    const s=snapshot.current;if(!s?.game||s.game.phase!=='playing'||submitting.current) return;
    if (pending.current) clearTimeout(pending.current);
    const current=draft.current;
    submitting.current=true;setSaving(true);if(ready)setBusy(true);
    try {
      const wait=1100-(Date.now()-lastRequest.current);if(wait>0) await new Promise(r=>setTimeout(r,wait));
      if(snapshot.current?.game?.phase!=='playing'||snapshot.current.game.turn!==s.game.turn)return;
      lastRequest.current=Date.now();
      const data=await api<Snapshot>(`/api/rooms/${code}`,{action:'orders',operationId:crypto.randomUUID(),turn:s.game.turn,orders:current,ready});
      if(draft.current===current) dirty.current=false;apply(data);setError('');
    } catch(e) {setError(e instanceof Error?e.message:'Emir gönderilemedi.');await refresh();}
    finally {submitting.current=false;setBusy(false);setSaving(false);}
  },[code,apply,refresh]);
  async function readyTransition(){
    const s=snapshot.current;if(!s?.game||submitting.current)return;submitting.current=true;setBusy(true);
    try{const wait=1100-(Date.now()-lastRequest.current);if(wait>0)await new Promise(r=>setTimeout(r,wait));lastRequest.current=Date.now();const data=await api<Snapshot>(`/api/rooms/${code}`,{action:'continue',operationId:crypto.randomUUID(),turn:s.game.turn});apply(data);setError('');beep();}catch(e){setError(e instanceof Error?e.message:'Hazır durumu kaydedilemedi.');await refresh();}finally{submitting.current=false;setBusy(false);}
  }
  useEffect(()=>{
    mounted.current=true;localStorage.setItem('kk:room',code);
    let stop=false;let cleanup=()=>{};
    void (async()=>{
      try {
        const uid=await session();const data=await api<Snapshot>(`/api/rooms/${code}`);if(stop)return;apply(data);
        const sb=supabase();const {data:auth}=await sb.auth.getSession();await sb.realtime.setAuth(auth.session?.access_token);
        const channel=sb.channel(`room:${data.id}`,{config:{private:true,presence:{key:uid}}});
        channel.on('broadcast',{event:'changed'},()=>{void refresh();})
          .on('presence',{event:'sync'},()=>{if(!stop)setOnline(Object.keys(channel.presenceState()));})
          .subscribe(async state=>{if(stop)return;if(state==='SUBSCRIBED'){setNetwork(true);await channel.track({connected:true});void refresh();}else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT'||state==='CLOSED'){setNetwork(false);}});
        const {data:listener}=sb.auth.onAuthStateChange((_event,newSession)=>{if(newSession)void sb.realtime.setAuth(newSession.access_token);});
        cleanup=()=>{listener.subscription.unsubscribe();void sb.removeChannel(channel);};
      }catch(e){if(!stop)setError(e instanceof Error?e.message:'Bağlantı kurulamadı.');}
    })();
    const back=()=>{setNetwork(navigator.onLine);if(navigator.onLine)void refresh();};
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    window.addEventListener('online',back);window.addEventListener('offline',back);document.addEventListener('visibilitychange',visible);
    const recovery=setInterval(()=>{if(navigator.onLine&&document.visibilityState==='visible')void refresh();},10000);
    return()=>{stop=true;mounted.current=false;cleanup();clearInterval(recovery);if(pending.current)clearTimeout(pending.current);window.removeEventListener('online',back);window.removeEventListener('offline',back);document.removeEventListener('visibilitychange',visible);};
  },[code,apply,refresh]);
  useEffect(()=>{
    let resolving=false;let lastResolve=0;let lastWarning='';
    const timer=setInterval(()=>{
      const s=snapshot.current;if(!s?.game||s.game.phase==='finished')return;
      const now=Date.now()+offset.current;
      const total=s.game.matchDeadline?Math.max(0,Math.ceil((new Date(s.game.matchDeadline).getTime()-now)/1000)):null;setTotalRemaining(total);
      setReviewRemaining(s.game.reviewUntil?Math.max(0,Math.ceil((new Date(s.game.reviewUntil).getTime()-now)/1000)):0);
      const rest=s.game.phase==='playing'?Math.max(0,Math.ceil((new Date(s.game.deadline).getTime()-now)/1000)):15;setRemaining(rest);
      const warning=`${s.game.turn}:${rest}`;if(s.game.phase==='playing'&&rest>0&&rest<=3&&warning!==lastWarning){lastWarning=warning;beep('warning');}
      if((s.game.phase==='playing'&&rest===0||total===0)&&!resolving&&navigator.onLine&&Date.now()-lastResolve>1200){
        resolving=true;lastResolve=Date.now();void api<Snapshot>(`/api/rooms/${code}`,{action:'resolve',operationId:crypto.randomUUID(),turn:s.game.turn}).then(apply).catch(()=>{setStatus('Tur sonucu sunucudan bekleniyor…');}).finally(()=>{resolving=false;});
      }
    },250);return()=>clearInterval(timer);
  },[code,apply,beep]);
  function change(next:Order[]) {
    const s=snapshot.current;if(!s?.game)return;
    try{validateOrders(s.game,s.side,next);}catch(e){setError(e instanceof Error?e.message:'Geçersiz emir.');return;}
    dirty.current=true;draft.current=next;setOrders(next);setError('');beep();
    if(pending.current)clearTimeout(pending.current);pending.current=setTimeout(()=>void send(false),1100);
  }
  const game=snap?.game; const side=snap?.side??0; const mine=snap?.players.find(p=>p.side===side); const opponent=snap?.players.find(p=>p.side!==side);
  const locked=!!mine?.ready||busy||game?.phase!=='playing'||remaining===0;
  const intermission=game?.phase==='waiting'||game?.phase==='review';const reviewing=game?.phase==='review';const shownTurn=reviewing?(game?.turn??1)-1:game?.turn;
  
  useEffect(()=>{if(snap?.game?.phase==='review')phaseAnchor.current?.scrollIntoView({behavior:'smooth',block:'start'});if(snap?.game?.phase==='finished')resultAnchor.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});},[snap?.game?.phase]);
  function regionClick(id:RegionId){
    if(!game||locked)return;
    if(mode==='move'){
      if(!selected){if(game.regions[id].owner!==side){setError('Önce kendi ordunun bulunduğu bölgeyi seç.');return;}setSelected(id);setArmy(structuredClone(game.regions[id].army));return;}
      if(id===selected){setSelected(null);return;}
      if(!neighbors(selected,id)){setError('Hedef çizili bir bağlantıyla komşu olmalı.');return;}
      const before=draft.current.length;change([...draft.current,{type:'move',from:selected,to:id,army:{...army}}]);if(before<2)setSelected(null);
    }else change([...draft.current,mode==='defend'?{type:'defend',at:id}:{type:'recruit',at:id,unit:mode}]);
  }
  async function surrender(){if(!game)return;setBusy(true);try{const data=await api<Snapshot>(`/api/rooms/${code}`,{action:'surrender',operationId:crypto.randomUUID(),turn:game.turn});apply(data);setConfirm(false);}catch(e){setError(e instanceof Error?e.message:'İstek tamamlanamadı.');}finally{setBusy(false);}}
  async function copy(){try{await navigator.clipboard.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError(`Oda kodun: ${code}`);}}
  const costs=orders.reduce((total,o)=>{if(o.type==='recruit'){total.gold+=Math.max(1,UNITS[o.unit].gold-(o.at==='D'?1:0));total.wood+=UNITS[o.unit].wood;}return total;},{gold:0,wood:0});
  return <main className="battle-page"><div className="battle-heading"><div><div className="eyebrow">SAVAŞ MEYDANI</div><h1>Kale Kuşatması</h1></div><div className="room-tools"><button onClick={copy} className="room-code" aria-label="Oda kodunu kopyala">{copied?'Kopyalandı ✓':`ODA ${code} ⧉`}</button><button aria-pressed={sound} onClick={()=>{soundRef.current=!sound;setSound(!sound);if(!sound)beep();}}>{sound?'Ses açık ♫':'Ses kapalı ♩'}</button></div></div>
    <HowToPlay compact/>
    {!network&&<div className="connection-warning" role="status">Bağlantı kesildi. Otomatik yeniden bağlanma deneniyor; sunucu sayacı sürüyor.</div>}
    {error&&<div className="error" role="alert">{error} <button onClick={()=>void refresh()}>Yeniden dene</button></div>}
    <div className="match-clock"><span>TOPLAM MAÇ SÜRESİ</span><b>{totalRemaining===null?'İlk onaylar bekleniyor':`${Math.floor(totalRemaining/60)}:${String(totalRemaining%60).padStart(2,'0')}`}</b><small>Başladıktan sonra en fazla 3 dakika · sonuç beklemeleri dahil</small></div>{!!game?.lastTimedOut?.length&&<p className="timeout-note">Önceki tur süre dolduğu için çözüldü. {game.lastTimedOut.map(s=>s===side?'Sen':'Rakip').join(' ve ')} hazır değildi; yalnızca sunucuda kayıtlı emirleri uygulandı.</p>}<div className="player-strip"><div className={`player-banner side-${side}`}><span className="banner-mark">⚑</span><div><b>{mine?.nickname??'Sen'}</b><span>{online.includes(mine?.id??'')?'● Çevrimiçi':'○ Bağlanıyor'} · {side===0?'Batı':'Doğu'} sancağı</span></div><strong>♜ {game?.players[side].hp??20}<small>/20</small></strong></div><div className="turn-block"><span>TUR {shownTurn??'—'} / 10</span><small>{intermission?'SAYAÇ DURUYOR':'TUR SÜRESİ'}</small><strong className={remaining<=5?'urgent':''}>{game?.phase==='finished'?'SON':intermission?'BEKLE':`${game?remaining:'—'} sn`}</strong><div className="timer-track"><i style={{width:`${remaining/15*100}%`}}/></div></div><div className={`player-banner side-${side===0?1:0}`}><span className="banner-mark">⚑</span><div><b>{opponent?.nickname??'Rakip bekleniyor'}</b><span>{opponent?(online.includes(opponent.id)?'● Çevrimiçi':'○ Bağlantı yok'):'Oda kodunu paylaş'} · {opponent?.ready?'Hazır ✓':'Hazırlanıyor'}</span></div><strong>♜ {game?.players[side===0?1:0].hp??20}<small>/20</small></strong></div></div>
    <div className="battle-layout"><BattleJournal game={game} players={snap?.players??[]}/><section className="map-section">{game?.phase==='finished'&&<section className="result-panel match-summary" ref={resultAnchor} aria-labelledby="result-title" role="status"><div className="eyebrow">MEYDANIN HÜKMÜ · {game.turn}. TUR</div><h2 id="result-title">{game.winner==='draw'?'Beraberlik!':game.winner===side?'Zafer senin!':'Rakibin kazandı.'}</h2><p>{game.winner==='draw'?'Kale dayanıklılıkları ve bölge sayıları eşit.':`${snap?.players.find(p=>p.side===game.winner)?.nickname??'Kazanan'} bu meydanın galibi.`} Skorlar kalıcı olarak kaydedildi.</p><p className="finish-reason"><b>Bitiş nedeni:</b> {game.finishReason==='elimination'?'Bir oyuncunun hiç bölgesi ve birliği kalmadı.':game.finishReason==='surrender'?'Bir oyuncu teslim oldu.':game.finishReason==='castle'?'Kale dayanıklılığı sıfıra indi.':game.finishReason==='match-time'?'Toplam 3 dakikalık maç süresi doldu.':'10 tur tamamlandı; kale dayanıklılığı ve bölge sayısı karşılaştırıldı.'}</p><div className="match-score-cards">{([0,1] as Side[]).map(s=>{const hp=game.players[s].hp;const regions=REGIONS.filter(r=>game.regions[r.id].owner===s).length;const bonus=game.winner===s?200:game.winner==='draw'?100:0;return <article key={s} className={`match-score-card side-${s} ${s===side?'your-score':''}`}><div className="match-player"><b>{snap?.players.find(p=>p.side===s)?.nickname}</b><span>{s===side?'SEN':'RAKİP'} · {game.winner===s?'GALİP':game.winner==='draw'?'BERABERE':'MAĞLUP'}</span></div><dl><div><dt>Kale dayanıklılığı</dt><dd>{hp} × 10 <b>+{hp*10}</b></dd></div><div><dt>Kontrol edilen bölge</dt><dd>{regions} × 20 <b>+{regions*20}</b></dd></div><div><dt>{game.winner===s?'Zafer':game.winner==='draw'?'Beraberlik':'Sonuç'} bonusu</dt><dd><b>+{bonus}</b></dd></div></dl><div className="match-total"><span>TOPLAM PUAN</span><strong>{score(game,s)}</strong></div></article>;})}</div><p className="score-rule">Puan = kalan kale dayanıklılığı × 10 + bölge sayısı × 20 + sonuç bonusu.</p><div className="result-actions"><Link className="primary" href="/leaderboard">Skor tablosunu gör →</Link><Link href="/">Yeni maç için lobiye dön</Link></div></section>}{intermission&&<section className="phase-panel" ref={phaseAnchor} aria-live="polite"><div><div className="eyebrow">{reviewing?`${shownTurn}. TUR SONUCU`:'BAŞLANGIÇ ONAYI'}</div><h2>{reviewing?'Hamleleri okuyun. Sonra devam edin.':'İkiniz de hazır mısınız?'}</h2><p>{reviewing?'Savaş akışı panelini ve değişen askerleri inceleyin. İkiniz de onaylayınca sonraki 15 saniye başlar.':'Ordular eşit. Süre henüz başlamadı. İkiniz de Maça hazırım düğmesine basınca ilk tur başlayacak.'}</p></div><button className="primary phase-ready-button" disabled={busy||!!mine?.ready||reviewing&&reviewRemaining>0} onClick={()=>void readyTransition()}>{mine?.ready?'Hazırsın · rakip bekleniyor':busy?'Kaydediliyor…':reviewing&&reviewRemaining>0?`Sonuçları inceleyin · ${reviewRemaining} sn`:reviewing?'Sonraki tura hazırım →':'Maça hazırım →'}</button></section>}<div className="map-readiness planning-status" aria-live="polite"><b>{game?.phase==='playing'?'İkiniz de aynı anda emir hazırlıyorsunuz':reviewing?'Tur sonucu · devam onayı':game?.phase==='waiting'?'Maç başlangıç onayı':'Oyuncu durumları'}</b><div className="readiness-chips"><span className={mine?.ready?'is-ready':'is-planning'}>Sen: {mine?.ready?'HAZIR ✓':intermission?'ONAY BEKLENİYOR':remaining===0&&game?'SÜRE DOLDU':'EMİR HAZIRLIYOR'}</span><span className={opponent?.ready?'is-ready':'is-planning'}>Rakip: {opponent?.ready?'HAZIR ✓':!opponent?'BEKLENİYOR':intermission?'ONAY BEKLENİYOR':remaining===0?'SÜRE DOLDU':'EMİR HAZIRLIYOR'}</span></div></div><div className="map-topline"><span>KRALLIK HARİTASI</span><span><i className="legend side-0"/> BATI <i className="legend side-1"/> DOĞU</span></div><div className="map-frame"><img className="map-image" src="/images/harita.jpg" alt="Yedi bölgeden oluşan savaş haritası"/><svg className="map-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{EDGES.map(([a,b])=>{const from=REGIONS.find(r=>r.id===a)!,to=REGIONS.find(r=>r.id===b)!;return <line key={a+b} x1={from.x} y1={from.y} x2={to.x} y2={to.y}/>;})}</svg>{game?.lastMoves?.map((m,i)=>{const from=REGIONS.find(r=>r.id===m.from)!,to=REGIONS.find(r=>r.id===m.to)!;const u=m.army.kusatma?'kusatma':m.army.piyade?'piyade':'okcu';return <div key={`${game.turn}-${game.phase}-${i}`} className={`marcher side-${m.side}`} style={{'--from-x':`${from.x}%`,'--from-y':`${from.y}%`,'--to-x':`${to.x}%`,'--to-y':`${to.y}%`} as CSSProperties} aria-hidden="true"><img src={`/images/${u}.jpg`} alt=""/><span>{count(m.army)}</span></div>;})}{REGIONS.map(r=>{const t=game?.regions[r.id];return <button key={r.id} className={`region ${t?.owner===null||t?.owner===undefined?'neutral':`side-${t.owner}`} ${selected===r.id?'selected':''} ${selected&&neighbors(selected,r.id)?'reachable':''} ${t?.owner===side&&!locked?'your-territory':''}`}  style={{left:`${r.x}%`,top:`${r.y}%`}} onClick={()=>regionClick(r.id)} disabled={!game||locked} aria-label={`${r.id}: ${r.name}. ${t?.owner==null?'Tarafsız':t?.owner===0?'Batı':'Doğu'}. ${t?count(t.army):0} birlik.`}><span className="region-letter">{r.id}</span>{t&&count(t.army)>0&&<img className="region-portrait" src={`/images/${t.army.kusatma>0?'kusatma':t.army.piyade>0?'piyade':'okcu'}.jpg`} alt=""/>}<span className="region-name">{r.name}</span><span className="region-owner">{t?.owner==null?'Tarafsız':t.owner===side?'⚑ SEN':'⚑ RAKİP'}</span><span className="region-count">{t?count(t.army):0} birlik</span><span className="region-units">{t&&count(t.army)?UNIT_KEYS.filter(u=>t.army[u]>0).map(u=>`${u==='piyade'?'P':u==='okcu'?'O':'K'}:${t.army[u]}`).join(' · '):'—'}</span></button>;})}</div><div className="map-bottomline">{game?.phase==='waiting'?'İkiniz de Maça hazırım dedikten sonra emir verebilirsiniz.':game?.phase==='review'?'Tur sonucu gösteriliyor. Sonraki tur için iki oyuncunun onayı bekleniyor.':mode==='move'?(selected?`${selected} seçildi. Birlik adetlerini ayarla, komşu hedefe dokun.`:'Hareket: önce kendi bölgeni, sonra komşu hedefi seç.'):mode==='defend'?'Savunma: kendi birliklerinin bulunduğu bölgeye dokun.':`${UNITS[mode].name}: toplamak için kendi bölgene dokun.`}</div><details className="territory-details" open><summary>Bölge durumu · P: piyade, O: okçu, K: kuşatma</summary><div className="territory-grid">{REGIONS.map(r=><div key={r.id} className={`territory-row ${game?.regions[r.id].owner==null?'neutral':`side-${game.regions[r.id].owner}`}`}><b>{r.id} · {r.name} <span className="territory-owner">{game?.regions[r.id].owner==null?'Tarafsız':game.regions[r.id].owner===side?'SEN':'RAKİP'}</span></b><span>{UNIT_KEYS.map(u=>`${UNITS[u].name}: ${game?.regions[r.id].army[u]??0}`).join(' · ')}</span><small>{r.kind==='forest'?'+2 odun':r.kind==='mine'?'+3 altın':r.kind==='village'?'Toplamada −1 altın':'Temel gelir +1 altın, +1 odun'}</small></div>)}</div></details></section>
    <aside className="command-panel"><div className="resources"><span><Resource kind="gold"/><b>{game?.players[side].gold??'—'}</b> altın</span><span><Resource kind="wood"/><b>{game?.players[side].wood??'—'}</b> odun</span></div><div className="panel-label">EMRİNİ SEÇ <span>Her tur en fazla 2</span></div><div className="unit-cards">{UNIT_KEYS.map(u=><button key={u} className={`unit-card ${mode===u?'active':''}`} onClick={()=>{setMode(u);setSelected(null);}} disabled={locked}><img src={`/images/${u}.jpg`} alt=""/><span className="unit-name">{UNITS[u].name}</span><span className="unit-price"><Resource kind="gold"/>{UNITS[u].gold}<Resource kind="wood"/>{UNITS[u].wood}</span><small>Güç {UNITS[u].power}{u==='kusatma'?' · Kale ×6':''}</small></button>)}</div><div className="tactic-buttons"><button className={mode==='move'?'active':''} onClick={()=>{setMode('move');setSelected(null);}} disabled={locked}>⚔ Hareket / Saldırı</button><button className={mode==='defend'?'active':''} onClick={()=>{setMode('defend');setSelected(null);}} disabled={locked}>⛨ Savunma +2</button></div>
    {selected&&mode==='move'&&<fieldset className="army-picker"><legend>{selected} bölgesinden taşınacak birlikler</legend>{UNIT_KEYS.map(u=><label key={u}>{UNITS[u].name}<input type="number" min={0} max={game?.regions[selected].army[u]??0} value={army[u]} onChange={e=>setArmy({...army,[u]:Math.max(0,Number(e.target.value)||0)})}/></label>)}</fieldset>}
    <div className="panel-label order-label">SEÇİLİ EMİRLER <span>{orders.length}/2</span></div><ol className="order-list">{orders.map((o,i)=><li key={i}><span className="order-number">{i+1}</span><div><b>{o.type==='recruit'?UNITS[o.unit].name:o.type==='move'?'Hareket / Saldırı':'Savunma'}</b><span>{o.type==='move'?`${o.from} → ${o.to} · ${count(o.army)} birlik`:`${o.at} bölgesi`}</span></div><button disabled={locked} onClick={()=>change(orders.filter((_,j)=>j!==i))} aria-label={`${i+1}. emri kaldır`}>×</button></li>)}{Array.from({length:2-orders.length},(_,i)=><li className="empty-order" key={`empty${i}`}><span className="order-number">{orders.length+i+1}</span> Bir kart ve bölge seç</li>)}</ol><div className="enemy-plan"><img src="/images/kart-sirti.jpg" alt="Rakibin gizli emirlerinin kart sırtı"/><span>Rakibin emirleri tur sonuna kadar gizli.</span></div><div className="reservation">Planlanan harcama: {costs.gold} altın · {costs.wood} odun</div>{!intermission&&<button className="primary full ready-button" disabled={!game||locked||saving} onClick={()=>void send(true)}>{mine?.ready?'Emirlerin hazır ✓':busy?'Sunucuya gönderiliyor…':'Emirlerim hazır · Kilitle →'}</button>}<p className="command-status" role="status">{saving?'Emirler sunucuya kaydediliyor…':status}</p><p className="fine-print">Yalnızca sunucunun kabul ettiği emirler uygulanır.</p></aside></div>

<footer className="battle-footer"><Link href="/rapor">Kurallar ve rapor ↗</Link>{(game?.phase==='playing'||game?.phase==='review')&&(confirm?<span>Teslim olmak istediğine emin misin? <button onClick={()=>void surrender()} disabled={busy}>Evet, teslim ol</button><button onClick={()=>setConfirm(false)}>Vazgeç</button></span>:<button className="text-button" onClick={()=>setConfirm(true)}>Teslim ol</button>)}</footer>
  </main>;
}
