[English README](README.md)

# LearnToPoker

LearnToPoker, pokeri hiç bilmeyen birini desteyi tanımaktan masada karar vermeye taşıyan, iki dilli bir poker okuludur. Etkileşimli dersler, görsel örnek eller, quizler ve açıklamalı koçluk sunan simülatör, kuralları uygulamayla birleştirir; deneyime sinematik bir 3B sunum eşlik eder.

**[LearnToPoker'i ziyaret et](https://learntopoker.vercel.app)**

![Royal flush yelpazeli açılış görseli](docs/screenshots/01-hero-fan.jpg)

## Bu proje neden var?

Her kararın bağlamı anlaşıldığında pokeri öğrenmek kolaylaşır. LearnToPoker **öğren → pratik yap → oyna** yolunu izler: kartlar, el sıralaması ve bahislerle başla; türlerin kuralları nasıl değiştirdiğini keşfet; ardından ne olduğunu ve nedenini görerek botlara karşı oyna.

Bu, sanal fişlerle kullanılan bir eğitim projesidir. Gerçek parayla oyun yoktur.

## Özellikler

### Açılış sayfası ve sinematik 3B görsel

Açılış sayfası öğrenme yolunu, el sıralamasını ve poker türlerini tanıtır. Kartlar altı düzen arasında geçiş yapar: **yelpaze, atlıkarınca, şelale, karıştırma, dağılma ve sarmal**. Şelale düzeni kaynak kodda `cascade` adını taşır. Sayfa kaydırıldıkça mevcut düzene bir çıkış hareketi eklenir; kartlar açılır ve kameraya yaklaşır. WebGL kullanılamadığında CSS ile hazırlanmış bir kart yelpazesi gösterilir.

![Royal flush yelpazesi](docs/screenshots/01-hero-fan.jpg)
![Atlıkarınca düzeni](docs/screenshots/02-hero-carousel.jpg)
![Açılış sayfasındaki el sıralaması](docs/screenshots/03-landing-hands.jpg)
![Açılış sayfasındaki poker türleri](docs/screenshots/04-landing-variants.jpg)

### Temel bilgiler dersi

Desteyi ve renkleri öğren, örnekler ve olasılıklar içeren açılır el sıralamasını incele ve fold, check, call, bet, raise, all-in hamlelerini kavra. Etkileşimli şemalar kör bahisleri, anteyi, potu, bir Hold'em elinin akışını ve masa pozisyonunu açıklar. **Sekiz soruluk quiz**, sonraki aşamaya geçmeden önce bilgileri pekiştirir.

![Temel bilgilere giriş](docs/screenshots/05-basics-hero.jpg)
![El sıralaması](docs/screenshots/06-basics-ladder.jpg)
![Bahis hamleleri](docs/screenshots/07-basics-actions.jpg)
![Temel bilgiler quizi](docs/screenshots/08-basics-quiz.jpg)

### Poker türü dersleri

**On bir poker türünü** keşfet, aileye veya simülatörde oynanabilirliğe göre filtrele ve her biri için ayrı bir ders aç. Derslerde kurallar, Hold'em'den farklar, pratik ipuçları ve **beş soruluk quiz** bulunur. Örnek el oynatıcısı kartları, bahisleri, hamleleri ve açıklamaları adım adım gösterir. Otomatik oynatma, önceki/sonraki adım, başa dönme, doğrudan adım seçimi ve görünür durumdayken Sol/Sağ ok tuşlarıyla gezinme desteklenir.

![Poker türü dersleri](docs/screenshots/09-variants-grid.jpg)
![Türün kuralları ve ayrıntıları](docs/screenshots/10-variant-detail.jpg)
![Örnek el oynatıcısı](docs/screenshots/11-stepplayer.jpg)
![Poker türü quizi](docs/screenshots/12-variant-quiz.jpg)

### Simülatör

**Texas Hold'em, Omaha, Five-Card Draw veya Seven-Card Stud** oyunlarını **iki ila beş bota** karşı oyna; kadroda sıkı, dengeli, gevşek ve maniac karakterler bulunur. 500, 1.000 veya 2.000 sanal fiş seç. Adım adım ilerle veya otomatik modun botları ve dağıtımı yürütmesini, senin kararlarında beklemesini sağla.

- Hamle çubuğunda yasal hamleler, miktar kaydırıcısı, minimum/½ pot/pot/all-in seçenekleri ve uygun oyunlarda sabit limit düğmeleri bulunur. Miktarlar bahis limitlerine uyar; pot-limit oyununda maksimum seçenek tüm bakiyenden düşük olabilir.
- Five-Card Draw'da atılacak kartları seçebilir veya tüm eli koruyabilirsin.
- Koç Monte Carlo equity tahminini, pot oranlarını, öneriyi ve gerekçeleri gösterir. Kart değiştirme önerisi sezgisel bir kurala dayanır; equity gelecekteki değişimleri simüle etmez.
- Sade dilli oyun günlüğü hamleleri ve bahis turu geçişlerini açıklar. El özetleri sonuçları ve uygun durumlarda pasif oyun geri bildirimi dahil değerlendirme notlarını gösterir.
- Fişlerin bittiğinde yeniden fiş alma seçeneği başlangıç bakiyeni geri yükler.
- 3B masa dağıtılan/çevrilen kartları, bahisleri, fiş yığınlarını ve ödemeleri gösterir. WebGL kullanılamazsa veya hata verirse 2B masa açılır; `/play/holdem?flat` bunu doğrudan seçer.

Adım modunda masa senin kararını beklemiyorsa Sağ ok tuşu bir bot hamlesini veya oyun adımını ilerletir.

![Simülatör kurulumu](docs/screenshots/13-play-setup.jpg)
![3B poker masası](docs/screenshots/14-play-table.jpg)
![Değiştirilecek kartların seçimi](docs/screenshots/15-play-draw.jpg)
![El özeti ve değerlendirme](docs/screenshots/16-play-summary.jpg)

### Sözlük

Tanımları ve örnekleriyle **85 terimi** incele. Arama hem Türkçe hem İngilizce kayıtları tarar; kategori filtreleri bahis, kartlar, eller, masa, poker türleri ve stratejiyi kapsar.

![Aranabilir poker sözlüğü](docs/screenshots/17-glossary.jpg)

### Mobil

Duyarlı düzenler dersleri, gezinmeyi ve açılış görsellerini küçük ekranlara uyarlar. Simülatörde kapatılabilir bir yan panel bulunur; dikey telefon ekranındaki masa için ek iyileştirmeler yol haritasındadır.

<p align="center"><img src="docs/screenshots/18-mobile-landing.jpg" width="45%"> <img src="docs/screenshots/19-mobile-play.jpg" width="45%"></p>

### Çoklu dil desteği: Türkçe ve İngilizce

Arayüz ve ders içerikleri, sayfa bazında çeviri ad alanlarıyla **TR ve EN** dillerinde sunulur. İlk açılışta Türkçe kullanılır, eksik çevirilerde İngilizceye dönülür ve seçilen dil yerel olarak saklanır. Belgenin dil niteliği de seçime göre güncellenir.

![İngilizce açılış sayfası](docs/screenshots/20-en-landing.jpg)

### Hareket tercihleri ve erişilebilirlik

Hareket düğmesi **Otomatik / Açık / Kapalı** seçenekleri sunar. Otomatik, `prefers-reduced-motion` ayarını izler; Açık ve Kapalı işletim sistemi tercihini geçersiz kılar. Yerel olarak saklanan seçim CSS, arayüz geçişleri ve 3B hareket kodu tarafından paylaşılır.

Erişilebilirlik önlemleri arasında 3B sahne için ekran okuyucu masa metni, etiketli kontroller, açılır el sıralaması düğmeleri, örnek ellerde ve adım modunda klavye kullanımı ve kurulum penceresinde odak sınırlandırması bulunur. Kurulum açıldığında odak içeri taşınır, kapanınca geri yüklenir; devam edilebilecek bir oyun varsa Escape ile kapatılır.

## Poker türleri

Tablo ders verilerini ve mevcut simülatör kayıtlarını yansıtır. Limitler bu projede öğretilen yapılandırmalardır.

| Poker türü | Aile | Bahis limiti | Oynanabilir |
| --- | --- | --- | --- |
| Texas Hold'em | Ortak kartlı | Limitsiz | Evet (`holdem`) |
| Omaha | Ortak kartlı | Pot limitli | Evet (`omaha`) |
| Omaha Hi-Lo | Ortak kartlı | Sabit limitli | Hayır |
| Seven-Card Stud | Stud | Sabit limitli | Evet (`sevenCardStud`) |
| Razz | Stud | Sabit limitli | Hayır |
| Five-Card Draw | Kart değiştirmeli | Sabit limitli | Evet (`fiveCardDraw`) |
| 2-7 Triple Draw | Kart değiştirmeli | Sabit limitli | Hayır |
| Short Deck | Ortak kartlı | Limitsiz | Hayır |
| Pineapple | Ortak kartlı | Limitsiz | Hayır |
| Badugi | Kart değiştirmeli | Sabit limitli | Hayır |
| H.O.R.S.E. | Karma | Karma | Hayır |

Simülatörü bulunmayan türler ders olarak erişilebilir ve benzer bir oynanabilir oyuna bağlantı verir.

## Oyun motoru

`src/engine/`, kartlar, kurallar ve kararlar için arayüz kütüphanelerinden bağımsız JavaScript içerir.

- **El değerlendirmesi:** beş kartlı yüksek eller, *n* kart içinden en iyi beşli, Omaha'da tam iki özel kart ve üç ortak kart kuralı, sekiz veya altı yeterlilik kontrolüyle as-beş düşük el, iki-yedi düşük el ve Badugi. Düşük el değerlendiricileri bulunur, ancak ilgili türler henüz oynanabilir değildir.
- **Bahis:** limitsiz, pot limitli, dört artırma sınırıyla sabit limitli oyun, minimum artırmalar, kısa all-in sonrası yeniden artırma kuralları (biriken kısa artırmalar dahil), yan potlar ve hesaplaşma öncesinde karşılanmamış bahislerin iadesi.
- **El akışı:** tür yapılandırmaları kör bahisleri/anteleri, dağıtımı, bahisleri, kart değişimini, el açmayı ve tamamlanmayı yönetir. Dışarıya sunulan geçişler yeni durum döndürür; tohumlu karıştırma ellerin aynı şekilde tekrarlanmasını sağlar.
- **Stud:** en düşük açık kart bring-in kararını belirler; tam bahse tamamlama seçeneği vardır. Sonraki turlarda en iyi açık el önce oynar; açık el eşitliklerini kart renkleri bozmaz.
- **Kart değiştirme:** yeni kartlar dağıtıldıktan sonra oyuncunun kendi attığı kartlar atık destesine eklenir. Kalan deste bittiğinde daha önce atılan kartlar yeniden karıştırılabilir.
- **Equity:** Monte Carlo örneklemesi, pas geçmiş stud oyuncularının açık kartları dahil görünen kartları dikkate alır ve beraberlik paylarını böler. Gizli eller rakip el aralıklarından çıkarılmak yerine örneklenir.
- **Botlar ve koç:** karakter parametreleri agresifliği ve gevşekliği belirler. Koçluk equity ile pot oranlarını karşılaştırır, çevrilmiş gerekçelerle yasal hamleler önerir ve el sonu değerlendirme notları sunar.

### Testler

Vitest paketi, döngülerdeki ayrı durumlar sayıldığında **69 test tanımlar: 65 oyun motoru testi ve dört açılış düzeni testi**. Kapsam; el sınıfları ve yan kartlar, Omaha kısıtları, düşük eller, bahis limitleri, yan potlar, iadeler, stud sırası, deste tükenmesi, yasal bot kararları ve tamamlanan elleri içerir.

Fuzz testleri **oynanabilir her tür için 200 el** oynar: rastgele yasal kararlar, iki ila altı oyuncu ve farklı bakiyelerle toplam 800 el. Fişlerin korunması, negatif olmayan bakiyeler, benzersiz kartlar, geçerli sıralar, yasal artırma sınırları ve ödeme toplamları denetlenir. Görsel düzen testleri farklı düzenleri ve beş/yedi kartlı yerleşimlerde sonlu, belirli sınırlar içinde kalan konumları kontrol eder.

`npm test` komutunu çalıştır. Bu sayılar kaynak dosyalardaki testleri tanımlar; çalıştırma sonuçları yerel ortamında doğrulanmalıdır.

## Teknoloji yığını

| Alan | Teknoloji |
| --- | --- |
| Arayüz | React 18, React Router 6 |
| Derleme | Vite 5, React eklentisi |
| 3B | Three.js, React Three Fiber, Drei |
| Animasyon | Framer Motion 11 |
| Durum yönetimi | Zustand 5 |
| Diller | i18next, react-i18next |
| Stil | Ortak tasarım değerleriyle CSS |
| Testler | Vitest 2 |
| Barındırma | Vercel |

## Başlangıç

Node.js ve npm kurduktan sonra proje klasöründe bu komutları çalıştır. Bu tarayıcı uygulaması yerel geliştirme için ayrı bir uygulama sunucusu gerektirmez.

| Komut | Amaç |
| --- | --- |
| `npm install` | Bağımlılıkları kur |
| `npm run dev` | Vite geliştirme sunucusunu başlat |
| `npm run build` | Üretim sitesini `dist/` klasörüne derle |
| `npm test` | Vitest paketini bir kez çalıştır |
| `npm run preview` | Derleme sonrasında üretim çıktısını yerel olarak sun |

Vite'ın yazdırdığı yerel adresi aç. Kullanışlı yollar: `/basics`, `/variants`, `/variants/holdem`, `/play/holdem`, `/glossary`. 2B masa için simülatör adresine `?flat` ekle.

## Proje yapısı

```text
LearnToPoker/
├── docs/screenshots/           # README ekran görüntüleri
├── index.html                 # Tarayıcı giriş belgesi
├── package.json               # Bağımlılıklar ve npm komutları
├── package-lock.json          # Sabitlenen bağımlılık sürümleri
├── vite.config.js             # React eklentisi ve test dosyası seçimi
├── vercel.json                # SPA yönlendirmesi ve varlık önbellek başlıkları
└── src/
    ├── main.jsx               # React kökü ve yönlendirici kurulumu
    ├── App.jsx                # Yollar, düzen, yükleme ve hata yönetimi
    ├── cards/                 # 2B kartlar, çevirme, yerleşim ve doku çizimi
    ├── components/            # Ortak ders ve simülatör arayüzü
    ├── content/
    │   ├── variants.js        # On bir ders türünün yapısal verileri
    │   └── walkthroughs.js    # Örnek ellerin görsel adımları
    ├── engine/
    │   ├── deck.js            # Kartlar, tohumlu rastgele sayılar ve karıştırma
    │   ├── evaluator.js       # Yüksek el, düşük el ve Badugi değerlendirmesi
    │   ├── betting.js         # Yasal hamleler, bahis turları ve potlar
    │   ├── game.js            # El durum makinesi ve hesaplaşma
    │   ├── equity.js          # Monte Carlo tahminleri ve kart atma önerileri
    │   ├── bots.js            # Bot karakterleri ve kararları
    │   ├── coach.js           # Öneriler ve el sonu değerlendirme
    │   ├── variants/          # Dört oynanabilir yapılandırma ve kayıtları
    │   └── __tests__/         # El, bahis, oyun, regresyon ve fuzz testleri
    ├── i18n/                  # Başlatma ve TR/EN ad alanı JSON dosyaları
    ├── motion/                # Hareket tercihi deposu ve kancaları
    ├── pages/                 # Landing, Basics, Variants, VariantDetail, Play, Glossary
    ├── store/gameStore.js     # Oyun yaşam döngüsü, arayüz durumu ve günlük metin yardımcıları
    ├── styles/                # Genel CSS ve tokens.css
    └── three/                 # Açılış, düzenler, masa, kartlar, fişler ve düzen testleri
```

## Mimari notlar

- **Yollar:** Landing doğrudan yüklenir; diğer sayfalar Suspense içinde tembel içe aktarmalar kullanır. Yola duyarlı hata sınırı ana sayfaya dönüş bağlantısı sunar ve gezinme sonrasında sıfırlanır.
- **Çeviriler:** ortak kaynaklar başlatma sırasında yüklenir. Sayfalar ve ortak ders bileşenleri içe aktarıldıklarında kendi TR/EN ad alanı paketlerini kaydeder.
- **Tasarım:** `src/styles/tokens.css`, genel CSS ile bileşen/sayfa CSS dosyalarının uyguladığı ortak tasarım değerlerini tutar.
- **Hareket:** ayrı bir Zustand deposu, saklanan tercihi işletim sistemi ayarıyla birlikte değerlendirir; kancalar ve React dışında kullanılabilecek bir değer sunar.
- **Motor sınırı:** oyun motorunun React bağımlılığı yoktur. `gameStore.js`, oyun yaşam döngüsü ve hamleler için durum tutan köprüdür. Arayüz kodu ayrıca görünen kartlar, pot değerleri ve koçluk için salt okunur motor yardımcılarını çağırır.

## Yayınlama

Canlı site **[Vercel](https://learntopoker.vercel.app)** üzerinde barındırılır. Derleme komutu olarak `npm run build`, çıktı klasörü olarak `dist` kullanılır.

`vercel.json`, SPA isteklerini `/index.html` adresine yönlendirerek ders ve simülatör yollarına doğrudan erişimi sağlar. `/assets/`, uzun süreli önbellekleme için `Cache-Control: public, max-age=31536000, immutable` başlığını alır.

## Yol haritası

- Three.js ve 3B masa için daha fazla paket bölme.
- Dikey telefon ekranlarında daha rahat bir simülatör masası.
- Kart değiştirme aşamasını ve değişimleri modelleyen equity tahmini.
- Yüksek/düşük pot paylaşımı içeren Omaha Hi-Lo motoru.
- Mevcut dördün ötesinde daha fazla oynanabilir poker türü.

## Lisans

Telif hakkı © 2026 Ayberk Arda. [MIT Lisansı](LICENSE) kapsamında sunulur.

LearnToPoker, sanal fişlerle eğitim ve pratik içindir. Gerçek parayla oyun yoktur.
