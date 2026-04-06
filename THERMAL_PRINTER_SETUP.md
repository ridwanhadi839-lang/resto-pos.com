# Thermal Printer Setup (react-native-esc-pos-printer)

Panduan ini untuk **native build / custom dev client** (bukan Expo Go), termasuk target **tablet**.

## Penting

- `react-native-esc-pos-printer` adalah **native module**.
- Tidak bisa dipakai di **Expo Go**.
- Untuk Expo SDK 51 (React Native 0.74), gunakan:
  - `react-native-esc-pos-printer@4.3.3`
- Tambahkan:
  - `expo-dev-client`
  - `expo-font`

## Catatan Windows

- Hindari build dari folder sinkronisasi cloud (contoh OneDrive), karena bisa menyebabkan lock file Gradle.
- Disarankan build dari path lokal seperti `C:\dev\RestaurantPOS`.

## Build Custom Dev Client Android (Tablet)

1. Install dependency:
   - `npm install`
   - `npx expo install expo-dev-client expo-font`
   - `npm install react-native-esc-pos-printer@4.3.3`
2. Generate native project:
   - `npx expo prebuild --clean`
3. Pastikan `android/local.properties` berisi SDK path:
   - `sdk.dir=C:\\Users\\<username>\\AppData\\Local\\Android\\Sdk`
4. Build + install ke device:
   - `npx expo run:android`
5. Jalankan bundler dev client:
   - `npx expo start --dev-client --port 8081`

## Buka App Dev Client ke Bundler

- Jika app belum otomatis connect, buka via deep link:
  - `exp+restaurantpos://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081` (emulator)
  - gunakan IP laptop untuk tablet fisik, misalnya:
    - `exp+restaurantpos://expo-development-client/?url=http%3A%2F%2F192.168.1.10%3A8081`

## Koneksi Printer

- Bluetooth:
  - Buka tab `More`
  - Pilih `Bluetooth`
  - Tap `Scan Printer`
  - Tap `Connect`
- LAN:
  - Tablet dan printer harus satu jaringan
  - Buka tab `More`
  - Pilih `LAN`
  - Tap `Scan Printer`
  - Tap `Connect`

## Test Print

1. Di tab `More`, tap `Test Print`.
2. Di alur checkout:
   - aktifkan `Thermal (ESC/POS)`
   - aktifkan `Print Kasir` dan/atau `Print Kitchen`
3. Jika thermal gagal atau belum terhubung, app fallback ke `expo-print`.

## iOS

- Build iOS native (`npx expo run:ios`) hanya bisa dijalankan dari macOS (Xcode).
