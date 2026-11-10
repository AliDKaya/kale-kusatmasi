"use client";
import {useState} from 'react';
import Link from 'next/link';
import HowToPlay from './how-to-play';
import GuideWalkthrough from './guide-walkthrough';
export default function FullGuide(){const [classic,setClassic]=useState(true);return <main className="full-guide-page"><div className="eyebrow">MEYDANA ÇIKMADAN ÖNCE</div><h1>Nasıl oynanır?</h1><p>Bir mod seç; başlangıçtan savaş sonucuna kadar kurallarını öğren.</p><div className="account-tabs" role="group" aria-label="Rehber modu"><button aria-pressed={classic} onClick={()=>setClassic(true)}>Klasik / Blitz</button><button aria-pressed={!classic} onClick={()=>setClassic(false)}>Kuşatma Vadisi</button></div><GuideWalkthrough/><HowToPlay key={String(classic)} legacy={classic} logistics={!classic} maxTurns={classic?10:16}/><section className="account-card"><h2>Birlikleri yakından tanı</h2><p>Kartların maliyetlerini, dayanıklılıklarını, menzillerini ve hareket animasyonlarını karşılaştır.</p><Link href="/birlikler">Birlikler ve özellikleri →</Link></section><Link href="/">Lobiye dön →</Link></main>;}
