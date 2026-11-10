# Kale Kuşatması 0.2.0-beta.1 — 10 Kasım 2026
- Netlify yayını eklendi; Vercel ve Supabase korundu. Ağ/DNS ayarları değiştirilmedi.
- Büyük harita bekleme ekranında dört birlik, Şahi kartı ve doğru mod kuralları görünür; üretim maç başlayana kadar kilitli.
- Kaleye bağlı üç yol için yönlü sur kalkanı; hasar/gedik/onarım görünümü, takım renkleri, tıklayınca kale fermanı.
- 401 durumunda aynı kullanıcıyla tek yenileme ve tek tekrar; işlem kimliği korunur. Geçersiz oturum yenilemede oda sahibinin yerine yeni anonim kimlik yaratılmaz.
- Oturum servisi geçici hatası 503 olarak ayrılır. Oda bilgisi yüklenirken kapatma düğmesi açıklamalı/kilitli görünür; yetki sunucuda denetlenir.
## Doğrulama
- TypeScript: başarılı. Oyun testleri: 114/114.
- tests/auth-recovery.check.ts: yenileme, aynı işlemle tekrar, geçersiz yenilemede kimlik korunumu.
- tests/castle-guards.check.ts: bekleme ekranı dört kart, altı kalkan, yönlü gedik, 4/16 sur, onarım, inceleme emir yazmaz, mobil375 taşma yok.
- Netlify önceki main sürümü: ana sayfa/skor API ve Brave iki açılış 200. Bu commitin canlı kontrolü yayın sonrasında ayrıca yapılacak.
- Testlerde gerçek maç veya skor oluşturulmadı. Canlı iki oyunculu maç bu sürüm için henüz doğrulanmadı.
## Sıradaki işler
- Piyade için altın/tahıl maliyeti; otomatik yerine oyuncu seçimli mareşal terfisi.
- E-posta/şifre ve Google girişi, hesaba bağlı Maç Geçmişim. Google OAuth kurulumu gerekli.
- Misafire kalıcı kişisel geçmiş tutmama; süre tabanlı temizlik tasarımı mevcut gerçek skorları korumalı.
