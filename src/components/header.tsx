import Link from 'next/link';
import { Emblem } from './icons';
export default function Header() {
  return <header className="site-header"><Link className="brand" href="/"><Emblem small/><span>KALE <b>KUŞATMASI</b></span></Link><nav aria-label="Ana menü"><Link href="/">Lobi</Link><Link href="/leaderboard">Skorlar</Link><Link href="/rapor">Rapor</Link></nav><span className="header-tag"><i/> İKİ SANCAK. TEK MEYDAN.</span></header>;
}
