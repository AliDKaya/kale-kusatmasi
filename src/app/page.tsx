'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, browserConfigured } from '@/lib/browser';
import { nicknameSchema, codeSchema } from '@/lib/schema';
import { Emblem } from '@/components/icons';
import HowToPlay from '@/components/how-to-play';
export default function Lobby() {
  const router = useRouter();
  const [nickname,setNickname] = useState(''); const [code,setCode] = useState('');
  const [tab,setTab] = useState<'create'|'join'>('create'); const [busy,setBusy] = useState(false);
  const [error,setError] = useState(''); const [resume,setResume] = useState('');
  useEffect(() => { queueMicrotask(()=>{setNickname(localStorage.getItem('kk:nickname') ?? ''); setResume(localStorage.getItem('kk:room') ?? '');}); },[]);
  async function enter(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const name = nicknameSchema.parse(nickname); const room = tab === 'join' ? codeSchema.parse(code) : undefined;
      const result = await api<{code:string}>('/api/rooms',{nickname:name, ...(room?{code:room}:{})});
      localStorage.setItem('kk:nickname',name); localStorage.setItem('kk:room',result.code); router.push(`/room/${result.code}`);
    } catch(e) { setError(e instanceof Error ? ('issues' in e ? 'Takma adını ve altı karakterli oda kodunu kontrol et.' : e.message) : 'Odaya girilemedi.'); }
    finally { setBusy(false); }
  }
  return <main className="lobby"><div className="hero"><div className="eyebrow"><span/> ÇEVRİMİÇİ STRATEJİ OYUNU</div><h1>Bir krallık.<br/>İki sancak.<br/><em>Tek galip.</em></h1><p>Ordunu topla, kaynaklarını koru.<br/>Rakibin planını görmeden kendi hamleni yap.<br/>Son sözünü savaş meydanında söyle.</p><div className="hero-facts"><span><b>2</b> OYUNCU</span><span><b>15 sn</b> HER TUR</span><span><b>10</b> TUR</span></div><div className="hero-art"><img src="/images/harita.jpg" alt="İki kale, ormanlar, madenler ve merkez köyden oluşan savaş haritası"/><span className="map-caption">YEDİ BÖLGE · SAYISIZ TAKTİK</span></div></div>
    <section className="entry-card" aria-labelledby="entry-title"><div className="entry-seal"><Emblem/></div><div className="eyebrow">MEYDAN SENİ BEKLİYOR</div><h2 id="entry-title">Sancağını yükselt</h2><p>Bir takma ad seç. Arkadaşını düelloya çağır.</p><form onSubmit={enter}><label htmlFor="nickname">TAKMA ADIN</label><input id="nickname" value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Örn. DemirŞövalye" maxLength={20} minLength={2} autoComplete="nickname" required/><div className="segmented" role="group" aria-label="Odaya giriş yöntemi"><button type="button" className={tab==='create'?'active':''} onClick={()=>setTab('create')}>Oda aç</button><button type="button" className={tab==='join'?'active':''} onClick={()=>setTab('join')}>Koda katıl</button></div>{tab==='join'&&<><label htmlFor="code">ODA KODU</label><input id="code" className="code-input" placeholder="ABC234" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={6} required autoComplete="off"/></>}<button className="primary full" disabled={busy}>{busy?'Sancak hazırlanıyor…':tab==='create'?'Oda oluştur  →':'Meydana katıl  →'}</button>{error&&<p className="error" role="alert">{error}</p>}</form>{resume&&<Link className="resume" href={`/room/${resume}`}>↩ {resume} odasına geri dön</Link>}<div className="entry-note"><span>✦</span><p><b>Kartı seç, bölgeye dokun.</b><br/>En fazla iki emir hazırla. İkiniz de hazır olunca savaş başlasın.</p></div>{!browserConfigured()&&<p className="setup-note">Servis kurulumu bekleniyor. Gerçek çevrimiçi oyun için Supabase bağlantısı gerekli.</p>}<div className="entry-footer">KAYIT YOK · İKİ GERÇEK OYUNCU · ÜCRETSİZ</div></section><div className="lobby-guide"><HowToPlay compact/></div><div className="lobby-bottom"><span>TOPRAĞINI KORU. PLANINI GİZLE.</span><Link href="/leaderboard">Krallığın en iyileri ↗</Link></div></main>;
}
