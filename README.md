# Kale Kuşatması

İki insan oyuncu için Next.js App Router / TypeScript, Supabase Auth + Postgres + Realtime ve Vercel üzerinde Orta Çağ bölge stratejisi.

## Yerel çalışma

1. `npm ci`
2. `.env.example` dosyasını `.env.local` olarak kopyalayıp kendi yeni Supabase projenin değerlerini doldur. Gizli `DATABASE_URL` yalnızca sunucuda kullanılır.
3. Supabase SQL Editor'da `supabase/migrations/001_game.sql` dosyasını, ardından `002_room_modes.sql` dosyasını bir kez çalıştır. Anonymous Sign-Ins seçeneğini etkinleştir.
4. `npm run check:setup`, ardından `npm run dev`.

## Kontroller

- `npm test`: deterministik savaş ve emir kuralları.
- `npm run build`: üretim derlemesi ve TypeScript.
- `npm run test:e2e`: Edge üzerinden bağımsız bağlamlarla gerçek Supabase testi; yerel sunucu çalışıyor olmalı.
- Canlı testi başka adreste çalıştırmak için `TEST_BASE_URL` ortam değişkenini kullan.
- Testler sahte multiplayer kullanmaz; kontrollü gerçek maç kayıtları oluşturur ve bitişte kendi verilerini otomatik temizler. Hazır akışı ve kaynak/tur geçmişi testleri skor üretmez. `tmp/test-cleanup.json` kaydındaki kullanıcı ve odalar yalnızca bu çalıştırmaya aittir.

## Mimari

Tarayıcı anonim Supabase oturumu açar; sunucu JWT'yi `getUser` ile doğrular. İstemci emirleri Zod ile doğrulanır. Oda satırı `FOR UPDATE` ile kilitlenir; kabul, kaynak denetimi, savaş, sürüm artışı, skor ve bildirim aynı Postgres transaction içinde yapılır. UUID işlem kimliği tekrarları engeller; tur numarası eski emirleri reddeder. Rakibin emir payload'u yanıt içine alınmaz.

Veritabanı tablolarında RLS ve doğrudan istemci erişimi yasağı vardır. Realtime özel oda kanalına yalnızca üyeler bağlanabilir; Presence yalnızca bağlantı göstergesidir ve oyun otoritesi değildir. Skor bildirimleri kayıtla aynı işlemde üretilir. İstemciler bildirimi alınca doğrulanmış görünümü yeniden çeker; yeniden bağlantıda ve sayfa dönüşünde durumu toparlar. Sunucuda sürekli zamanlayıcı yoktur.

Kaynaklar ve skor localStorage'da saklanmaz. Tarayıcıda yalnızca Supabase oturumu, takma ad, son oda ve kozmetik harita tercihi tutulur. Savaş kuralları ve gerçek kanıt durumu `/rapor` içindedir.

## Yayın

Vercel CLI ile ayrı `kale-kusatmasi` projesi kullanılır; GitHub zorunlu değildir. Üç ortam değişkenini production'a ekledikten sonra `npx vercel deploy --prod --yes`. `.env.local`, `.vercel`, test çıktıları ve yönerge PDF'si yayın paketinden hariçtir. Teslim yalnızca herkese açık oyun alan adıdır. GitHub'a gönderirken `.env.local` hiçbir zaman eklenmez.

## Güncel oyun akışı

Oda açarken **Klasik** (7 bölge, 10 tur, 20 sn, 2 emir) veya **Kuşatma Vadisi** (13 bölge, 16 tur, 30 sn, 4 emir) seçilir. Katılan oyuncu oda türünü koddan alır. Eski açık maçlar eski süre/kural sürümüyle biter.

İki oyuncu Maça hazırım demeden ilk sayaç başlamaz. Emir onayları tamamlanınca veya tur süresi bitince çözüm yapılır. Sonuçta sayaç durur; iki devam onayı beklenir. Toplam maç sınırı klasik için 6, büyük mod için 12 dakikadır; sonuç beklemeleri dahildir.

Klasik kaynakları ve savaş hesabı korunur. Altın Vadi haritası klasik için yalnız kozmetiktir. Büyük modda taş ve tahıl, toplu üretim, asker başına kalıcı can/yaralanma, orduya uzaktan atış, sur/gedik, Şahi topu ve bölge gelişimi vardır. Haritanın köşe kaleleri ve oynanabilir alanları SVG kontür/yol katmanıyla ayrılır; mobilde yalnız harita kendi içinde kayar.

Büyük mod: piyade 10 can, okçu 5, mancınık 8, Şahi 3 can. Yaralıların verdiği hasar kalan canlarıyla azalır. Okçu 1, mancınık 2 bağlantıdan vurur. İki ağır araç yalnız ana kalede üretilir. Şahi komşu kaleye top başına en fazla 2 ordu hasarı ve o yönde gedik açar; 1 tur doldurma bekler, salvo başına top başına 2 altın + 2 taş harcar. Gedik garnizonu öldürmez; savunmacılar hayattaysa kale alınmaz. Kuşatma emri iptale kadar tekrarlar.

Maden altın/taş, orman odun, köy tahıl üretir. Tutulan bölge iki tam turda bir, en fazla 3. seviyeye çıkar; ana kaynak +1/+2, 3. seviyede yerel savunma +1. Ele geçirmede gelişim sıfırlanır. Asker üretim kapasitesi bölge sayısıyla en fazla 4/tur olur. Dinlenme ve onarım ölen askeri diriltmez; ayrıntılı maliyet/iyileşme kuralları oyun içi rehberdedir.

Yeni Kuşatma Vadisi odalarında kervan ekonomisi vardır. Bölge üretimi depoda birikir; kendi yollarında ilerleyen kervan kaleye teslim ettiğinde harcanabilir. Yakındaki ordu baskın veya sınırlı 2’ye 1 yük takası yapabilir. Klasik ve eski açık büyük odalar önceki ekonomiyi korur. Kurallar/test kapsamı `docs/KERVAN-PLANI.md` içindedir.

Oda sahibi üstteki Odayı kapat düğmesiyle onay vererek odayı kapatabilir. Başlamayan maçta skor yazılmaz; başlamış maçta kapatmak teslim sayılır. Kapanış diğer oyuncuya canlı bildirilir, eski kodla katılım engellenir ve yeni oda açılabilir.

Yeni büyük odalarda mareşal: aynı piyadenin 4 hayatta kalma + 2 çatışma turuyla terfisi, yerel ordu bonusu ve ölüm sonrası iki tur terfi beklemesi. Ayrıntı: `docs/MARESAL.md`. Otomatik toparlanma etkinliği henüz yoktur.

`/antrenman`: iki haritada Acemi / Sancak Beyi / Serdar. Bot kamuya açık durumdan planlar; insan taslağını görmez. Oyun sunucuda çözülür, skor yalnız ayrı `training_scores` tablosuna yazılır; istemci puanı kabul edilmez. Altı harita/zorluk kategorisinde en iyi kişi skoru listelenir. Kurulumda `003_training.sql` de uygulanmalıdır.
