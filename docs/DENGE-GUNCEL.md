# Güncel denge ve değişiklik raporu — 27 Ekim 2026

36 önce + 36 son çevrimdışı bot maçı; iki harita, iki simetrik açılış, farklı seviyelerde iki taraf değişimi. Ayrıca ekonomi, kuşatma, mareşal ve Son Direniş senaryoları. İnsan kazanma oranı veya kusursuz denge iddiası değildir. Skor/veritabanı yazılmadı.

## Ölçüme göre değişenler

| Kontrol | Önce | Sonra |
|---|---:|---:|
| 4 kaynaklık karışık kervanın baskın kaybı | 4 | 1 |
| 5 kaynaklık kervanın kaybı | 2 | 1 |
| 28 / 80 kaynaklık yükün kaybı | 5 / 16 | 5 / 16 |
| Klasikte aynı seviyeli botların beraberliği | 2 / 6 | 6 / 6 |
| Büyük harita botlarının piyade / okçu / mancınık üretim emirleri | 330 / 0 / 0 | 247 / 57 / 16 |

- **Baskın nerfi:** kayıp her kaynak türünden ayrı en az 1 yerine toplam yükün beşte biri, aşağı yuvarlanmış ve toplamda en az 1. Kayıp türlere oransal dağıtılır. Ganimet tür başına en fazla 1; gecikme 1 tur, koruma 2 tur korunur. Yeni lojistik sürüm 2 odalarda; eski odalar eski hesabı korur.
- **Bot düzeltmesi:** eşit değerli emir/rota seçimleri oyuncunun kendi tarafına göre sıralanır. Piyade desteğine bağlı sınırlı karma ordu değeri eklendi; uzak kuşatma silahının rolü bir turluk hesapta yok sayılmıyor. Serdar rakibin kamusal durumdan üretilen Sancak Beyi planını da öngörür; gizli oyuncu emrine bakmaz, kaynak hilesi yapmaz.
- **Birlik istatistikleri:** can, hasar, atış önceliği ve üretim fiyatları değiştirilmedi.

## Güncel sonuçlar

- Serdar–Sancak Beyi: büyük haritada 4 Serdar galibiyeti; klasikte 2 galibiyet + 2 beraberlik. Klasikte Sancak Beyi–Acemi 2–2; daha zor etiketinin her açılışta galibiyet garantisi yok.
- Sabit simetrik ekonomide 12 turda 688 kaynak üretildi ve toplam kaynak korundu. Kervanlı modelde üretimin %80,5’i kasaya ulaştı; kalan yük depoda/yolda. Doğrudan gelir modelinde tamamı kasada.
- Tam ekonomik onarım yapan savunmada tek mancınık 16 turda kaleyi düşüremedi. İki mancınık doğrudan ekonomide 7., kervanlı ekonomide 5. salvoluk turda düşürdü. Savunan karşı saldırı yapmadı; bu bir en iyi strateji deneyi değildir. Onarım veya mancınığa ek güç değişikliği yapılmadı.
- Mareşalin bir darbede sağladığı fark 2 / 6 / 12 piyade örneklerinde sabit +1 kalan dost canı ve −1 düşman canı; asker sayısıyla katlanmıyor. Büyük saldırıda mareşal de ölebiliyor.
- **Son Direniş:** yeni komutan sürüm 2 odalarda, yaşayan mareşalin fermanında maçta bir kez; 2 altın + 2 tahıl ve bir emir. Hazırlıkta toplam en fazla +4 can; ölü diriltmez, turda hareket/atış ve aynı orduda onarım yok, pasif dinlenmeyle katlanmaz. Savunmayla kullanılabilir; mevcut kuşatma bir tur duraklar. İki tarafın ayrı hakkı var, geride olma ödülü yok. Kontrollü saldırıda aynı 4 kişilik ordunun kalan canı 16 → 20 oldu; ek bedel 2 altın + 2 tahıl.

## Sınırlar ve sonraki ölçüm

Şahi üretimi ve kervan takası bu bot matrisinde görülmedi; bunların insan kullanım dengesi sonuçlandırılmadı. Büyük haritadaki ara orman/maden türleri dönel simetrik olmadığından bütün turlarda aynalanmış hamle beklenmez; iki taraf da iki uzak kaynağa eşit graf mesafesinde ulaşır. İnsanlarla birkaç karşılıklı taraf değişimli maç ve Şahi/takas odaklı senaryolar sonraki ölçümdür. Bu nedenle sonuçlara göre rastgele fiyat/hasar indirimi yapılmadı.

Kanıt: `public/evidence/balance-current-before.json`, `balance-current.json`, `raid-balance-before.json`, `raid-balance-after.json`. Tekrar: `npx tsx scripts/balance-current.ts` ve `npx tsx scripts/balance-raids.ts`. Önceki kervansız rapor `DENGE-RAPORU.md` tarihsel kayıttır.
