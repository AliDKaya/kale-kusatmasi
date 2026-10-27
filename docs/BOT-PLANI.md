# Bilgisayara karşı antrenman — kervan ve mareşalden sonraki aşama

Kullanıcı her iki haritada tek başına oynayıp test etmek istiyor. Bu özellik mevcut savaş/harita yayınına eklenmez. İş sırası: mevcut yayını bitir → kervan → mareşal/toparlanma → bot.

## Zorluk önerisi

- Acemi — Kolay: basit üretim ve saldırı; az planlama.
- Sancak Beyi — Orta: ekonomi, karma birlik, koruma, menzil ve onarım.
- Serdar — Zor: daha uzun hamle değerlendirmesi, kuşatma, tempo, kaynak/gedik fırsatları.

Zorluk kaynak hilesi veya oyuncunun gizli emirlerini okumakla sağlanmayacak. Hamleler aynı kurallarla doğrulanacak. Ücretli LLM API zorunlu değil; kurallı arama/değerlendirme yeterli.

## Sıralama

Kullanıcı sonradan bot maçlarının da ayrı skor tablosunu istedi. Önceki “hiç skor yazılmaz” taslağı geçersizdir: bot skorları yalnız ANtrenman sıralamasına yazılacak; iki gerçek oyuncunun tablosuna karışmayacak.

- Harita: Klasik / Kuşatma Vadisi.
- Zorluk: Acemi / Sancak Beyi / Serdar.
- Bu altı kategori birbirine karşı haksız karşılaştırılmayacak.
- Skor yazımı yalnız sunucudan; oyun durumu, zorluk ve sonuç doğrulanacak. İstemcinin gönderdiği skor kabul edilmeyecek.
- Yerel ve doğrulanmamış deneme koşuları sıralamaya yazılmayacak.
- Bot gerçek insan odasındaki ikinci oyuncunun yerine gizlice konmayacak; ayrı antrenman girişinden başlatılacak.

Tahmin: sunucuda doğrulanan altı kategori dahil 3–5 saat. Tasarım ve gerçek oynanış dengesi bunu değiştirebilir.
