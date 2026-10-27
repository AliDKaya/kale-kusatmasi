# Son değişiklikler — 27 Ekim 2026

- Klasik: 10 tur / 20 saniye / 2 emir. Büyük: 16 tur / 30 saniye / 4 emir.
- Yeni büyük odalar: bölge üretimi önce depoda; yol üstündeki kervan kaleye taşıyınca harcanır. Sınırlı baskın ve 2’ye1 takas, bekleyen depolar ve yol kapanması işlendi. Eski odalar değişmez.
- Mareşal: kalıcı bir asker kimliği, 4 hayatta kalma + 2 çatışma turu. Ordu başına sabit +1 normal hasar / 1 hasar azaltma, terfide can dolmaz; ölüm sonrası 2 tur yeni terfi beklemesi. Büyük orduya asker başına sınırsız bonus verilmedi.
- Antrenman: iki harita, Acemi / Sancak Beyi / Serdar. Bot taslağı görmez, kaynak hilesi yapmaz. Sunucu aynı savaş motoruyla çözer; ayrı harita+zorluk sıralaması. İnsan skorlarına karışmaz.
- Savaş hareket/atış/hasar/ölüm/gedik/tedavi görselleri, ses ve rehber önceki yayında tamamlandı.

## Kanıt
98 kural testi geçti. Yerel üç savaş/klasik/rehber regresyon testi geçti. Kervan, mareşal ve iki haritalı antrenman canlı adreste kontrollü tarayıcılarla geçti. Antrenmanda sahiplik, istemci skorunun reddi ve yinelenen işlemde tek skor kontrol edildi. 375px taşma kontrolü geçti. Test kayıt/skorları temizlendi. Derleme ve tip kontrolü geçti; lint hata yok (mevcut görsel öneri uyarıları var).

## Denge sınırı / kalan
İlk DENGE-RAPORU kontrollü, kervansız/mareşalsiz savaş ölçümüdür. Yeni ekonominin ve üç bot seviyesinin insan kazanma oranları ölçülmedi. Kervan için kaynak korunumu; mareşal için bonusun katlanmaması; bot için bütçe/yasal emir ve iki haritada8tur kontrolleri yapıldı. Bunlar tam oyun dengesi kanıtı değildir.

Özel toparlanma/Milli Mücadele etkinliği uygulanmadı; bilerek geri düşmeyi ödüllendirmeyen ayrı tasarım gerekiyor. Geniş yeni denge deneyi ve sonuca göre gerekçeli buff/nerf raporu sonraki çalışmaya kaldı. Rastgele güç değişikliği yapılmadı.

## Harita ve ferman güncellemesi
- Bölge adları büyüdü ve tamamı taraf rengine boyandı. Sınırlar yapıları sarıyor; takım rengi dışında hafif renkli kırık beyaz neon çekirdek var.
- Fermanlar taşınabilir, açıkken boyutlandırılabilir, kaydırılabilir ve raptiyeyle sabitlenebilir. Sıfırlama konum/boyutları geri alır, raptiyeleri takar. Tümü açık başlangıç düzeni çakışmaz.
- 13 görsel merkez ve 23 kesikli yol hizalandı; asker ve kervan görselleri aynı merkezleri kullanır. Fermanların yapı örtüşmeleri düzeltildi.
- Büyük haritada kale fermanından yükselt/onar/kuşat/Şahi/durdur emri verilir. Kaynak ordu açıkça seçilir; hazır, bütçe, menzil ve emir hakkı kısıtları korunur. Sağ panelde yinelenen kale taktikleri kaldırıldı.
- Yerel taktik sınaması geçti: kaynak seçimi, dört emir, yetersiz bütçe, kilitli tur, 375 px ve işlemin yalnız taslakta kalması. Skor oluşturulmadı.
