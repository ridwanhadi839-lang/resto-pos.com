# RestaurantPOS

RestaurantPOS adalah aplikasi kasir berbasis Expo + React Native dengan backend Express + Supabase.

## Struktur

- `src/` frontend Expo / React Native
- `backend/` backend Express untuk autentikasi, katalog, dan order
- `supabase/` SQL schema dan migration

## Setup Lokal

1. Install dependency frontend dan backend:

```bash
npm install
cd backend && npm install
```

2. Copy file environment:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

3. Jalankan backend:

```bash
npm run backend:start
```

4. Jalankan frontend:

```bash
npm run web
```

## Scripts

- `npm start` menjalankan Expo
- `npm run web` menjalankan preview web
- `npm run export:web` membuat build statis ke `dist/`
- `npm run backend:start` menjalankan backend Express
- `npm run test:minimal` menjalankan test frontend dan backend minimal

## Deploy Frontend ke GitHub Pages

Frontend sudah disiapkan untuk repository GitHub Pages project site di:

`https://ridwanhadi839-lang.github.io/resto-pos.com/`

Yang sudah dikonfigurasi di repo:

- [`app.json`](./app.json) memakai `experiments.baseUrl` ke `/resto-pos.com`
- workflow GitHub Actions di [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)
- build frontend memakai `npm run export:web`

Yang perlu Anda set di GitHub repository variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

Lalu di GitHub:

1. Buka `Settings > Pages`
2. Pada `Source`, pilih `GitHub Actions`
3. Push ke branch `main`

## Deploy Backend ke Vercel

Backend disiapkan untuk dideploy sebagai project Vercel terpisah dengan root directory:

`backend`

Set environment variables berikut di Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`

Nilai `CORS_ORIGIN` untuk GitHub Pages Anda:

`https://ridwanhadi839-lang.github.io`

Setelah backend aktif, ambil URL Vercel Anda, misalnya:

`https://restaurantpos-backend.vercel.app`

Kemudian isi GitHub repository variable:

`EXPO_PUBLIC_API_BASE_URL=https://restaurantpos-backend.vercel.app`

## Keamanan

- File `.env` root dan `backend/.env` tidak ikut repo
- `node_modules`, log, cache, build output, dan key/certificate lokal tidak ikut repo
- Gunakan file `.env.example` hanya sebagai template
