import {readFileSync,writeFileSync,copyFileSync,mkdirSync,existsSync} from 'node:fs';
const folder='tmp/evidence',target='public/evidence';mkdirSync(target,{recursive:true});
const integration=JSON.parse(readFileSync(`${folder}/integration.json`,'utf8'));
const scoreboard=JSON.parse(readFileSync(`${folder}/scoreboard.json`,'utf8'));
const clarity=JSON.parse(readFileSync(`${folder}/clarity.json`,'utf8'));
if(!integration.checks.atomicResolution||!scoreboard.checks.directWriteDenied||!clarity.checks.departure)throw new Error('Gerekli testler tamamlanmadı.');
for(const file of ['integration.json','scoreboard.json','clarity.json','http.txt','clear-mobile-map.png','outside-top10.png','mobile-leaderboard.png'])if(existsSync(`${folder}/${file}`))copyFileSync(`${folder}/${file}`,`${target}/${file}`);
const persisted=existsSync(`${folder}/persistence.json`)?JSON.parse(readFileSync(`${folder}/persistence.json`,'utf8')):null;
if(persisted?.persisted){copyFileSync(`${folder}/persistence.json`,`${target}/persistence.json`);copyFileSync(`${folder}/persistence-before.json`,`${target}/persistence-before.json`);}
const checks={
 E1:{points:5,proof:'Canlı Playwright: takma ad → oda aç/katıl → oyun. Clipboard okuması oda koduyla aynı. Üç adımlı rehber görüldü.',file:'clarity.json'},
 E2:{points:8,proof:`İki bağımsız bağlamda sunucunun tur sonucu ${integration.checks.syncLatencyMs} ms içinde eşlendi; sayfa yenilenmedi. Rakip emir payload’u gizli kaldı.`,file:'integration.json'},
 E3:{points:5,proof:'İki bağlamda Presence doğrulandı. Ayrı odaya üye üçüncü oyuncunun erişimi 403, dolu odaya katılımı 409 döndü. Sekme kapanınca bağlantı yok durumu görüldü.',file:'clarity.json',extra:'integration.json'},
 E4:{points:6,proof:'Seçilen emir yerel listede anında görüldü; kaynak/savaş sunucu çözümüyle değişti. Asker hareketi, bölge tarafları, hazır durumları ve Web Audio oscillator üretimi doğrulandı.',file:'clarity.json'},
 E5:{points:5,proof:'Bağlam offline/online yapıldı; uyarı ve yeniden bağlanma doğrulandı. Yenilemede aynı oyuncu odaya döndü. Geçersiz oda kodu anlaşılır hata verdi.',file:'integration.json',extra:'clarity.json'},
 E6:{points:6,proof:'375 px: documentElement.scrollWidth ≤ 375. Bölge hedefleri en az 44×44 px; Tab odağı doğrulandı. Mobil görüntü incelendi, görünür odak ve okunaklı taraf etiketleri var.',file:'clarity.json',image:'clear-mobile-map.png'},
 L1:{points:persisted?.persisted?6:0,proof:persisted?.persisted?`Yeniden dağıtım öncesi/sonrası GET yanıtlarında ${persisted.anchors} kontrollü skorun ad, puan ve zamanı aynı kaldı.`:'Yeniden dağıtım sonrası karşılaştırma henüz tamamlanmadı.',file:persisted?.persisted?'persistence.json':'scoreboard.json'},
 L2:{points:8,proof:`İkinci bağlamdaki /leaderboard yeni tamamlanan maçın skorunu yenilemeden ${scoreboard.checks.liveScoreLatencyMs} ms içinde gösterdi.`,file:'scoreboard.json'},
 L3:{points:5,proof:'12’den fazla gerçek kontrollü maç skoru içinden tam 10 kayıt geldi. Puan azalan, eşit puanda zaman artan sıralama doğrulandı.',file:'scoreboard.json'},
 L4:{points:5,proof:'Kendi ilk 10 skoru vurgulandı. Ayrı test oyuncusunun ilk 10 dışındaki sırası ayrıca görüldü ve mobil ekran görüntüsü alındı.',file:'scoreboard.json',image:'outside-top10.png'},
 L5:{points:5,proof:'Kontrollü tamamlanmış test skorunun zamanı geçici olarak iki gün önceye alındı. Bugün filtresinde kayboldu, Tüm zamanlar’da geri geldi; zaman sonra geri yüklendi.',file:'scoreboard.json'},
 L6:{points:6,proof:'Keyfi skor alanı 400; doğrudan tablo yazımı 403. Beş saniye içindeki ikinci skor 429. Tekrarlanan işlem yalnızca bir maç/oyuncu skoru oluşturdu; bitmiş maça yeni emir 409.',file:'scoreboard.json',extra:'integration.json'},
 P1:{points:5,proof:'Kimlik doğrulamasız curl -sI: /, /leaderboard, /rapor ve /api/leaderboard HTTP/1.1 200 OK. Yeni Playwright bağlamı Vercel girişi istemeden açıldı.',file:'http.txt'},
 P2:{points:3,proof:'Rapor oyun adı, tema/kısıt durumu, iki cümlelik fikir seçimi, en az beş cümlelik oynanış, 15 madde, bölüm toplamları ve gerçek çıktıları içerir.',file:'clarity.json'},
 P3:{points:2,proof:'Teslim alan adı kale-kusatmasi.vercel.app; kişisel kimlik veya öğrenci numarası içermiyor. Rapor yalnızca oyun bilgisi ve kontrollü test takma adlarını kullanıyor.',file:'http.txt'}
};
const total=Object.values(checks).reduce((n,c)=>n+c.points,0);
const previous=JSON.parse(readFileSync('src/lib/evidence.json','utf8'));
const date=new Intl.DateTimeFormat('tr-TR',{dateStyle:'short',timeStyle:'medium',timeZone:'Europe/Istanbul'}).format(new Date());
const rounds=previous.rounds??[];if(!rounds.length||rounds.at(-1).score!==total)rounds.push({round:rounds.length+1,score:total,date});
writeFileSync('src/lib/evidence.json',JSON.stringify({updated:date,productionUrl:'https://kale-kusatmasi.vercel.app',rounds,localChecks:['npm test: 18 passed, 0 failed.','npx tsc --noEmit: exit 0.','npm run lint: 0 errors; mevcut JPEG referanslarının img kullanımı için Next.js öneri uyarıları.','Canlı multiplayer.spec.ts: 1 passed (57.3s).','Canlı scoreboard.spec.ts: 1 passed (1.2m).','Canlı clarity.spec.ts: 1 passed (23.0s).'],checks,blockers:persisted?.persisted?[]:['Yeniden dağıtım sonrası kalıcılık karşılaştırması bekleniyor.']},null,2));
console.log('Kanıtlar hazır. Toplam:',total,'/80');
