# Backend

Backend ini disiapkan untuk Express.js + Supabase.

## Struktur

- `src/app.js` untuk konfigurasi Express.
- `src/server.js` untuk menjalankan server.
- `src/config/supabase.js` untuk koneksi Supabase.
- `src/routes/health.routes.js` untuk endpoint pengecekan awal.
- `src/routes/auth.routes.js` untuk login PIN.
- `src/routes/catalog.routes.js` untuk kategori dan produk.
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

Environment variables yang wajib diisi di Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`

Untuk frontend GitHub Pages pada repo ini, isi `CORS_ORIGIN` dengan:

`https://ridwanhadi839-lang.github.io`

Contoh base URL backend setelah deploy:

`https://your-backend-project.vercel.app`

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
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`

## Catatan

- Route selain `health` butuh kredensial Supabase backend di file `.env`.
- Route `catalog` dan `orders` sekarang butuh token Bearer hasil login.
- Katalog write dibatasi untuk role `supervisor`.
- Jika ingin memakai mode `delivery`, pastikan constraint `order_type` di database Supabase juga sudah ikut diperbarui.
