> Arşiv: Bu rapor eski, kervansız ve mareşalsiz ölçümdür. Güncel sonuçlar ve uygulanan değişiklikler [DENGE-GUNCEL.md](DENGE-GUNCEL.md) içindedir.

# Kuşatma Vadisi — ilk denge raporu

27 Ekim 2026. Bu rapor kontrollü senaryolara dayanır; insan maçlarından kazanma oranı veya kusursuz denge iddiası değildir. Ham çıktı: `public/evidence/balance.json`. Tekrar üretme: `npx tsx scripts/balance.ts`. Veritabanına veya skor tablosuna kayıt yazmaz.

## Güncel kartlar

| Birlik | Altın / odun / taş / tahıl | Can | Öncelik | Rol |
|---|---|---:|---:|---|
| Piyade | 3 / 1 / 0 / 2 | 10 | 2 | Yakın dövüş 3; ön safta hasar karşılar |
| Okçu | 4 / 3 / 0 / 2 | 5 | 3 | Bir bağlantıdan orduya 3; yakın dövüşte 1 |
| Mancınık | 10 / 8 / 6 / 3 | 8 | 1 | İki bağlantıdan sur/kaleye 6 veya orduya 2 |
| Şahi | 18 / 8 / 12 / 4 | 3 | 1 | Komşu kalenin yönlü suruna 12; açık yönden kaleye 8; garnizona 2 |

Bunlar tam canlı birlik başına değerlerdir. Yaralıların verdiği hasar kalan can oranıyla azalır, yukarı yuvarlanır. Şahi salvosu top başına 2 altın ve 2 taş harcar; bir tur doldurur. Aynı öncelik birlikte çözülür; daha erken ölen yavaş birlik ateş edemez. Aynı asker yürüyüp ateş edemez; aynı bölgedeki ayrı askerler farklı işler yapabilir.

## Ölçülen senaryolar

Saha senaryolarında saldıran piyadeyle ilerler, varsa okçu/mancınıkla destek atışı yapar. Savunan elindeki atışları ve savunma emrini kullanır. Dinlenme kapalıdır; yeni asker üretilmez. Kompozisyonların kaynak bütçeleri eşit değildir; sonuçlar tüm oyuncu stratejilerini temsil etmez.

| Saha senaryosu | Ölçülen sonuç |
|---|---|
| 1 piyade → 1 savunan okçu | Piyade 3. turda öldü; okçu 1 canla kaldı |
| 3 piyade → savunma emrindeki 3 piyade | Saldıran 4. turda tükendi |
| 2 piyade + 1 okçu → savunan 3 piyade | 16 turda bölge alınamadı; uzun yıpratma |
| 3 piyade → savunan 2 piyade + 1 okçu | Saldıran 4. turda tükendi |
| 2 piyade + 1 mancınık → savunan 3 piyade | 16 turda bölge alınamadı; mancınık tek başına iyi bir alan işgalcisi değil |

Kuşatma senaryosunda mancınıklar iki bağlantıdan sürekli ateş eder. Savunan karşı saldırı yapmaz, kaynakları elverdiğinde onarır. Bu bir en iyi strateji veya insan oyuncu deneyi değildir.

| Kuşatma senaryosu | Ölçülen sonuç |
|---|---|
| 1 mancınık, yalnız kale geliriyle onaran rakip | 10. salvoluk turda kale düştü; 4 onarım |
| 1 mancınık, orman/maden/köyü olan onaran rakip | 16 tur sonunda kale 20 can; 15 onarım |
| 2 mancınık, yalnız kale geliriyle onaran rakip | 4. salvoluk turda kale düştü |
| 2 mancınık, tam üretim zinciri olan onaran rakip | 7. salvoluk turda kale düştü; 6 onarım |

## Bulunan ve düzeltilenler

- İlk yol ağında doğu tarafının iki daha kısa takviye bağlantısı vardı. Bu iki bağlantı kaldırıldı; başlangıç taraflarının topolojik erişimi artık otomatik simetri testiyle doğrulanıyor.
- Savunma ve gelişmiş köy bonusu, düşük ordu hasarını sıfıra indirebiliyordu. Pozitif ordu saldırısı artık en az 1 hasar verir; sonsuz hasarsız döngü önlendi. Ayakta kale suru ayrı bir fiziksel engeldir.
- Bir askerin yürümesi bütün bölgedeki diğer askerlerin atışını engelliyordu. Atış/hareket rezervasyonu birlik türüne göre ayrıldı.
- Okçu atışı yürüyüşten önce uygulanır; hareket ederek hızlı atıştan ücretsiz kaçış önlendi.
- Yeni gelen ağır birlik aynı tur ateş edemez. Sağ kalan ağır birliklerin hareket bilgisi çatışma boyunca korunur.
- Dinlenme maliyeti her dört yaralı için 1 tahıl oldu; büyük ordular sabit 1 tahılla tedavi edilmez.
- Yeni Şahi gediği aynı tur piyadeye bedava geçiş vermez. Mevcut savunmaya karşı sur dışı çatışma yapılır; gedik sonraki tur açılır.

## Buff / nerf önerileri

**Piyade:** Şimdilik buff yok. 10 canı ve düşük kaynak maliyeti zaten ön saf rolünü veriyor. Yığın veya mareşal zırhı eklemek savunma ağırlığını artırır.

**Okçu:** Hızlı öncelik sayesinde yalnız piyadeye karşı etkili. Şimdilik hasar buff'ı gerekmiyor. Hareket eden ordunun önce ok vurularak yaralanması rolünü belirginleştiriyor.

**Mancınık:** Şimdilik hasar buff'ı yok. Orduya 2 hasarının düşük olması uzmanlık bedeli. İki mancınık güçlü ekonomik savunmayı aşabiliyor; asıl işi kale yıpratmak. İnsan maçında hiç tercih edilmiyorsa ilk aday hasar değil, üretim maliyetinde küçük indirim olur.

**Şahi:** Güçlü patlama ve yönlü gedik, yüksek fiyat ve 3 canla sınırlandırılıyor. Korumasız Şahi hızlı okçuya tek atışta kaybedilebilir. İlk insan denemelerinde taşınamadan sürekli ölüyorsa canını en fazla 3→4 yapmak adaydır; henüz uygulanmadı. Hasar/can/atış beklemesini aynı anda güçlendirmeyelim.

**Onarım:** En önemli izlenecek mekanik. Tek mancınığı tam ekonomiyle tamamen durduruyor; iki mancınığı durduramıyor. Bu, kaynak bölgelerine saldırmayı anlamlı kılıyor. İnsan maçlarında herkes yalnız onarım yapıyorsa önce onarımın kale iyileştirmesini 3→2 veya tahıl maliyetini 2→3 denemek uygun. Henüz uygulanmadı.

**Bölge gelişimi:** En fazla +2 ana kaynak ve +1 savunma. Ele geçirmede sıfırlama, önde olanın büyümesini sınırlıyor. Şimdilik yeni bonus eklenmesin.

**Kalıcı mareşal:** Bu yayına eklenmedi. Öneri: 4 ayrı gerçek çatışmadan sağ çıkan bir piyade, oyuncu başına en fazla 1 mareşal, yalnız azami can 10→12. Hasar, hız ve zırh değişmez; terfi anında ücretsiz iyileşmez. Unvan hayattayken taşınır, ölümde miras bırakılmaz. Uygulamadan önce onay ve ayrı veri modeli/test gerekir.

## Sonuç ve sınırlar

Savunma ve karma ordu desteği belirgin güçlü. Saf piyade hücumu veya tek mancınık her savunmayı otomatik yenmiyor. Bu bir tasarım sonucu; yine de insanlarla denenmeden dengeli ilan edilmemeli. Mevcut kapsam yayınlandıktan sonra en az birkaç farklı kompozisyonla maç, maç süresi, tercih edilen kartlar ve onarım kullanımını izlemek gerekir. Otomatik test oyuncuları ürüne eklenmedi; bunlar yalnız çevrimdışı analiz senaryolarıdır. Kervan ve mareşal bu sürümün kapsamı dışındadır.
