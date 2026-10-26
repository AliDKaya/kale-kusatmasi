# Kale Kuşatması

İki insan oyuncu için Next.js App Router / TypeScript, Supabase Auth + Postgres + Realtime ve Vercel üzerinde Orta Çağ bölge stratejisi.

## Yerel çalışma

1. `npm ci`
2. `.env.example` dosyasını `.env.local` olarak kopyalayıp kendi yeni Supabase projenin değerlerini doldur. Gizli `DATABASE_URL` yalnızca sunucuda kullanılır.
3. Supabase SQL Editor'da `supabase/migrations/001_game.sql` dosyasını bir kez çalıştır. Anonymous Sign-Ins seçeneğini etkinleştir.
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

Kaynaklar ve skor localStorage'da saklanmaz. Tarayıcıda yalnızca Supabase oturumu, takma ad tercihi ve son oda kodu tutulur. Savaş kuralları ve gerçek kanıt durumu `/rapor` içindedir.

## Yayın

Vercel CLI ile ayrı `kale-kusatmasi` projesi kullanılır; GitHub zorunlu değildir. Üç ortam değişkenini production'a ekledikten sonra `npx vercel deploy --prod --yes`. `.env.local`, `.vercel`, test çıktıları ve yönerge PDF'si yayın paketinden hariçtir. Teslim yalnızca herkese açık oyun alan adıdır. GitHub'a gönderirken `.env.local` hiçbir zaman eklenmez.

## Güncel oyun akışı

İki oyuncu da Maça hazırım demeden ilk sayaç başlamaz. Her tur iki gizli emir hazırlanır; iki emir onayı veya 15 saniye sonunda çözüm yapılır. Sonuç aşamasında tur sayacı durur; iki oyuncu Sonraki tura hazırım demeden yeni tur başlamaz. Toplam maç sınırı başlangıç onayları tamamlandıktan sonra üç dakikadır. Hiç bölgesi ve ordusu kalmayan oyuncu elenir. Başlangıç 8 altın / 5 odun; kale geliri 1/1, maden 3 altın, orman 2 odundur.
