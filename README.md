# LearnToPoker

Hiç poker bilmeyenler için animasyonlu, uygulamalı ve simülatörlü bir poker okulu; Türkçe ve İngilizce kullanılabilir.

## Özellikler

- Landing sayfası ve 3D hero sahnesi
- Temeller dersi
- Adım adım örnek eller ve quiz içeren 11 varyant dersi
- Botlara karşı oynanabilen dört varyant: Texas Hold'em, Omaha, Five-Card Draw ve Seven-Card Stud
- Koç paneli ve poker sözlüğü

## Teknolojiler

Vite, React 18, React Router, Three.js, react-three-fiber, drei, framer-motion, zustand, i18next ve vitest.

## Kurulum

```bash
npm install
npm run dev
npm run build
npm test
```

## Proje yapısı

- `src/engine` — Poker kuralları, el değerlendirme ve oyun motoru
- `src/pages` — Uygulama sayfaları
- `src/components` — Paylaşılan arayüz bileşenleri
- `src/three` — 3D masa, kart ve sahne bileşenleri
- `src/i18n` — Türkçe ve İngilizce çeviriler
- `src/content` — Varyant ve örnek el içerikleri

## Dağıtım

Vercel'de depoyu içe aktarın, framework olarak Vite'ı seçin, build komutunu `npm run build` ve çıktı klasörünü `dist` olarak ayarlayın. `vercel.json`, SPA sayfa yönlendirmesini sağlar.

## Lisans

MIT

Gerçek para yoktur; proje eğitim amaçlıdır.
