'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, session, supabase } from '@/lib/browser';
type Score = {sira:number;ad:string;skor:number;zaman:string};
export default function Leaderboard() {
  const [filter,setFilter]=useState<'all'|'today'>('all');const [rows,setRows]=useState<Score[]>([]);const [own,setOwn]=useState<Score[]>([]);
  const [error,setError]=useState('');const [loaded,setLoaded]=useState(false);const [live,setLive]=useState(false);
  const load=useCallback(async()=>{
    try{
      const result=await api<{skorlar:Score[]}>(`/api/leaderboard?filter=${filter}`,undefined,false);setRows(result.skorlar);setError('');
      try{const mine=await api<{scores:Score[]}>(`/api/my-rank?filter=${filter}`);setOwn(mine.scores);}catch{setOwn([]);}
    }catch(e){setError(e instanceof Error?e.message:'Skorlar alınamadı.');}finally{setLoaded(true);}
  },[filter]);
  useEffect(()=>{
    void Promise.resolve().then(load);let stop=false;let cleanup=()=>{};
    void(async()=>{try{
      await session();if(stop)return;const sb=supabase();const {data}=await sb.auth.getSession();await sb.realtime.setAuth(data.session?.access_token);
      const channel=sb.channel('leaderboard',{config:{private:true}}).on('broadcast',{event:'changed'},()=>{void load();}).subscribe(status=>{if(!stop)setLive(status==='SUBSCRIBED');if(status==='SUBSCRIBED')void load();});
      cleanup=()=>{void sb.removeChannel(channel);};
    }catch{setLive(false);}})();
    const recover=()=>{if(navigator.onLine)void load();};window.addEventListener('online',recover);
    const timer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)void load();},15000);
    return()=>{stop=true;cleanup();clearInterval(timer);window.removeEventListener('online',recover);};
  },[load]);
  const ownRank=new Set(own.map(r=>r.sira));const best=own[0];
  return <main className="leaderboard-page"><div className="eyebrow">KRALLIĞIN ŞEREF DEFTERİ</div><h1>Meydanın <em>en iyileri.</em></h1><p>Kaleler yıkılır, isimler kalır. Tamamlanan gerçek maçların kalıcı skorları.</p><div className="leaderboard-toolbar"><div className="segmented"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Tüm zamanlar</button><button className={filter==='today'?'active':''} onClick={()=>setFilter('today')}>Bugün</button></div><span className="live-label"><i className={live?'connected':''}/>{live?'CANLI GÜNCELLENİYOR':'BAĞLANTI BEKLENİYOR'}</span></div>{error&&<p className="error" role="alert">{error}</p>}<div className="score-table-wrap"><table className="score-table"><caption className="sr-only">{filter==='today'?'Bugünün':'Tüm zamanların'} en yüksek on skoru</caption><thead><tr><th scope="col">SIRA</th><th scope="col">KOMUTAN</th><th scope="col">SKOR</th><th scope="col">ZAMAN</th></tr></thead><tbody>{rows.map(row=><tr key={row.sira} className={`${ownRank.has(row.sira)?'own-score':''} rank-${row.sira}`}><td><span className="rank-badge">{row.sira===1?'♛':row.sira.toString().padStart(2,'0')}</span></td><th scope="row">{row.ad}{ownRank.has(row.sira)&&<small> SEN</small>}</th><td><b>{row.skor}</b></td><td><time dateTime={row.zaman}>{new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'}).format(new Date(row.zaman))}</time></td></tr>)}</tbody></table>{!rows.length&&<div className="empty-scores"><span>⚑</span><h2>{loaded?'İlk zaferini buraya yaz.':'Şeref defteri açılıyor…'}</h2><p>{error?'Veritabanı bağlantısı tamamlanınca skorlar burada görünecek.':'Bu dönemde henüz tamamlanmış maç yok.'}</p></div>}</div>{best&&best.sira>10&&<div className="own-outside"><b>Sen: {best.sira}. sıra</b><span>{best.ad} · {best.skor} puan</span></div>}<div className="score-explanation"><b>Skor nasıl hesaplanır?</b><p>Kalan kale dayanıklılığı × 10 + kontrol edilen bölge × 20 + sonuç bonusu (zafer 200, beraberlik 100). Eşit puanda önce kaydedilen skor üsttedir. Bugün filtresi Türkiye saatini kullanır.</p></div><Link className="primary" href="/">Sancağını yükselt →</Link></main>;
}
