# Backend

Backend ini disiapkan untuk Express.js + Supabase.

## Struktur

- `src/app.js` untuk konfigurasi Express.
- `src/server.js` untuk menjalankan server.
- `src/config/supabase.js` untuk koneksi Supabase.
- `src/routes/health.routes.js` untuk endpoint pengecekan awal.
- `src/routes/auth.routes.js` untuk login PIN.
- `src/routes/catalog.routes.js` untuk kategori dan produk.
- `src/routes/dashboard.routes.js` untuk fondasi dashboard console: outlet, device, device session, dan cash shift.
- `src/routes/order.routes.js` untuk order dan update status.
- `src/middleware/auth-session.js` untuk proteksi endpoint dengan token sesi.

## Menjalankan

1. Copy `.env.example` menjadi `.env`
2. Isi kredensial Supabase
3. Install dependency:

```bash
npm install
```

4. Jalankan development server:

```bash
npm run dev
```

## Deploy ke Vercel

Backend ini bisa dideploy sebagai project Vercel terpisah dengan:

- Repository: repo ini
- Root Directory: `backend`
- Framework Preset: `Other`

File `api/index.js` dan `vercel.json` sudah disiapkan agar Express berjalan sebagai Vercel serverless function.

Environment variables yang wajib diisi di Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `INTEGRATION_API_KEY`

Untuk test backend lokal tanpa hardcode PIN di source code, isi juga di `backend/.env`:

- `TEST_LOGIN_RESTAURANT_CODE`
- `TEST_LOGIN_PIN`

Untuk frontend GitHub Pages pada repo ini, isi `CORS_ORIGIN` dengan:

`https://ridwanhadi839-lang.github.io`

Contoh base URL backend setelah deploy:

`https://your-backend-project.vercel.app`

Setelah backend berhasil deploy, isi `EXPO_PUBLIC_API_BASE_URL` di aplikasi POS dengan URL HTTPS tersebut sebelum build AAB release. Jangan gunakan `http://localhost:4000` untuk build Play Store karena tablet customer tidak bisa mengakses backend lokal developer.

## Endpoint Awal

- `GET /api/health`
- `POST /api/auth/pin-login`
- `GET /api/catalog`
- `POST /api/catalog/categories`
- `PATCH /api/catalog/categories/:id`
- `DELETE /api/catalog/categories/:id`
- `POST /api/catalog/products`
- `PATCH /api/catalog/products/:id`
- `DELETE /api/catalog/products/:id`
- `GET /api/dashboard/outlets`
- `POST /api/dashboard/outlets`
- `PATCH /api/dashboard/outlets/:id`
- `GET /api/dashboard/devices`
- `POST /api/dashboard/devices`
- `PATCH /api/dashboard/devices/:id`
- `GET /api/dashboard/device-sessions`
- `POST /api/dashboard/device-sessions`
- `PATCH /api/dashboard/device-sessions/:id/revoke`
- `GET /api/dashboard/cash-shifts`
- `GET /api/orders`
- `POST /api/orders`
- `POST /api/orders/external`
- `PATCH /api/orders/:id/status`

## Catatan

- Route selain `health` butuh kredensial Supabase backend di file `.env`.
- Route `catalog` dan `orders` sekarang butuh token Bearer hasil login.
- Route `dashboard` butuh token Bearer. Endpoint baca bisa dipakai member restoran, endpoint tulis dibatasi `owner`, `admin`, atau `supervisor`.
- Route `POST /api/orders/external` memakai `x-integration-api-key` dan `x-restaurant-code`.
- Katalog write dibatasi untuk role `owner`, `admin`, atau `supervisor`.
- Semua akses database backend memakai Supabase query builder dan validasi input, bukan menyusun SQL manual dari input user.
- Jika ingin memakai mode `delivery`, pastikan constraint `order_type` di database Supabase juga sudah ikut diperbarui.
