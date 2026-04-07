# Security Notes

## Apa yang harus tetap private

- `backend/.env`
- `.env`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `INTEGRATION_API_KEY`

File di atas tidak boleh di-commit ke GitHub. Repo ini sudah mengabaikannya lewat `.gitignore`.

## Yang tidak bisa benar-benar disembunyikan di frontend

Nilai dengan prefix `EXPO_PUBLIC_` akan ikut masuk ke bundle frontend/web. Jadi:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

memang harus dianggap public-facing. Jangan taruh secret backend pada variable `EXPO_PUBLIC_*`.

## Aturan aman

- Simpan secret asli hanya di file `.env` lokal atau environment variable server.
- Pakai `.env.example` hanya sebagai template placeholder.
- Jika secret pernah sempat ter-push ke GitHub, lakukan rotasi key di provider terkait.
