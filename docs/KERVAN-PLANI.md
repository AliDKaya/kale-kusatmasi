# Kervan ekonomisi — büyük mod

Yeni Kuşatma Vadisi odalarında etkin. Klasik ve önceden açılmış büyük odalar değişmez. Savaş/harita yayını önce tamamlandı; bu, sonraki ayrı güncellemedir.

- Kale üretimi doğrudan kasaya; diğer bölge üretimi yerel depoya. Harcanabilir kaynak yalnız kasadır.
- Her tarafın tek kervanı: ana kaleye kendi bölgeleriyle bağlı, en uzak dolu depodan başlar. Eşitlikte yük/bekleme ve sabit bölge kodu sırası kullanılır. Rastgele avantaj yoktur.
- Kervan yolların ortasında görünür; tamamlanan turda bir bağlantı ilerler. Eve uzaklık artmaz, U dönüşü ve tekrar ziyaret yoktur; en fazla bir kısa yan sapma, uygun yükü toplamaya izin verir.
- Kendi depolarından yük alır, kaleye bir kez teslim eder; sonraki tur yeni sefer. Rota ortasında yeni üretim için geri dönmez.
- Yol ele geçirilirse mevcut noktadan güvenli rota aranır; bulunamazsa bekler, yük silinmez. Ele geçirilen depo yeni sahibinin taşınacak stokudur; kasaya ışınlanmaz.
- Yakın piyade/okçu baskını: kaynak başına yaklaşık %20 kayıp (pozitif stokta en az 1), ganimet tür başına en fazla 1; bir tur gecikme ve sonraki iki tur baskın koruması. Kervan yok edilmez veya başa döndürülmez.
- Kendi yakındaki orduyla sefer başına bir kez takas: kargoda 2 ver/1 al, en fazla 2 alınan kaynak. Sonsuz takas kazancı yok. Takas yapan ordu aynı tur yürümez/ateş etmez. Her iki tarafın takası baskınlardan önce uygulanır.
- Sunucu tur işlemi içinde rota, yük, takas ve ganimeti doğrular. İstemci yalnız yol animasyonu gösterir.

Doğrulama: 13 lojistik kural testi + iki bağımsız tarayıcıyla oda/üretim/teslimat/takas/baskın/koruma/375px testi. 15 tur toplam kaynak korunumu kontrolü var. Kontrollü takas-baskın sahnesi testin kendi odasına yazılır; gerçek oyunculara veya skorlarına dokunulmaz.

Denge sınırı: zorunlu taşıma ilk savaş raporunun doğrudan gelir varsayımını değiştirir. İnsan kazanma oranı ölçülmedi. Küçük yükte asgari 1 baskın kaybı yüzdesel olarak yüksek olabilir; ganimet tür başına 1 ile sınırlı. İnsan denemelerinde izlenecek.
