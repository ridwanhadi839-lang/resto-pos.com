# Supabase Setup

1. Buat project Supabase baru.
2. Buka SQL Editor, lalu jalankan file berikut satu per satu dengan query terpisah:
   - `supabase/schema.sql`
   - `supabase/seed.sql` (opsional, untuk restoran contoh `resto-a` dan `resto-b`)
3. Jika database kamu sudah telanjur memakai schema lama satu restoran, jalankan juga:
   - `supabase/multi_restaurant_migration.sql`
   - script ini akan membuat restoran default dengan code `main`
4. Copy `.env.example` jadi `.env`, isi:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_API_BASE_URL` jika mobile app akan memakai backend Express
5. Masuk ke Supabase `Authentication > Users`, buat user auth.
   - email: contoh `cashier@restaurant.com`
   - password: bebas, karena login app sekarang memakai `restaurant code + PIN` via backend
6. Tambahkan profil app user dan PIN per restoran:
   - jalankan isi file `supabase/pin_migration.sql`
   - ganti placeholder `auth_user_id`, `restaurant code`, `role`, dan `PIN`
7. Untuk mengamankan PIN lama yang masih plaintext, jalankan:
   - `supabase/security_hardening_migration.sql`
8. Jika database lama belum mendukung `delivery`, jalankan:
   - `supabase/order_type_delivery_migration.sql`
9. Jika memakai backend Express:
   - masuk ke folder `backend`
   - copy `backend/.env.example` jadi `backend/.env`
   - isi `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, dan `JWT_SECRET`
   - jalankan `npm install` lalu `npm run dev`
10. Jalankan app:
   - `npm start`
11. Untuk koneksi mobile ke backend:
   - isi `.env` app dengan `EXPO_PUBLIC_API_BASE_URL`
   - untuk device fisik, gunakan IP LAN komputer, contoh `http://10.15.34.135:4000`
   - untuk Android emulator biasanya gunakan `http://10.0.2.2:4000`

## Fitur yang sudah terhubung

- Login via backend Express dengan format `restaurant code + PIN 6 digit`.
- Setiap restoran bisa punya PIN yang berbeda untuk user yang sama.
- PIN disimpan dalam bentuk hash, bukan plaintext.
- Order disimpan per restoran di PostgreSQL Supabase.
- Status order: `pending`, `paid`, `sent_to_kitchen`.
- Realtime sync antar device via Supabase realtime.
- Offline queue: order/status tetap tersimpan lokal dan auto-sync saat online.
- Payment:
  - Split bill
  - Multiple payment (`cash` + `qr`)
  - Diskon + pajak otomatis
- Catalog:
  - CRUD kategori & produk langsung dari tab `Catalog`

## Printer

- Default pakai `expo-print`.
- Untuk thermal ESC/POS, perlu native module (`react-native-esc-pos-printer`) di custom dev client / bare workflow.
- Toggle `Thermal (ESC/POS)` sudah tersedia di modal payment; jika module thermal belum siap, app fallback ke `expo-print`.
