# CarpaBot

CarpaBot adalah bot Telegram yang dirancang untuk membantu kamu menemukan party atau squad teman bermain game. Dengan CarpaBot, kamu dapat dengan mudah mencari rekan-rekan untuk bermain game bersama melalui grup dan channel Telegram.

[Coba bot](https://t.me/CariPartyBot)

![CarpaBot Logo](src/images/carpabot.webp)

## Fitur

- **Pencarian Party/Squad:** Cari dan temukan pemain lain untuk bergabung dalam satu party atau squad.
- **Promosi Otomatis:** Pesan yang dikirim oleh pengguna akan diteruskan secara otomatis ke grup dan channel Telegram.
- **Event Channel:** Kirimkan pesan khusus event seperti turnamen atau giveaway langsung ke channel event.
- **Moderasi Otomatis:** Bot memfilter kata-kata terlarang untuk menjaga kualitas dan keamanan konten.
- **Logging:** Semua aktivitas dan pesan bot akan dicatat secara terstruktur di dalam folder `src/logs`.

## Prasyarat

Pastikan perangkat kamu telah memenuhi syarat berikut:

- **Node.js:** Disarankan menggunakan versi terbaru.
- **npm:** Sudah termasuk saat menginstal Node.js.
- Token Bot Telegram yang didapatkan dari [BotFather](https://t.me/BotFather).

## Instalasi

Ikuti langkah-langkah berikut untuk mengatur dan menjalankan CarpaBot:

1. **Clone Repository**

   ```bash
   git clone https://github.com/mfebriann/CarpaBot.git
   cd CarpaBot
   ```

2. **Instal Dependensi**

   ```bash
   npm install
   ```

3. **Konfigurasi**

   - Salin file `.env.example` menjadi `.env`

   ```bash
   cp .env.example .env
   ```

   - Edit file `.env` dan masukkan token bot Telegram kamu

   ```
   BOT_TOKEN=
   CHANNEL_ID=
   GROUP_ID=
   CHANNEL_ID_CARISQUAD=
   CHANNEL_ID_EVENT=
   ```

4. **Jalankan Bot**
   ```bash
   npm run dev
   ```

## Penggunaan

- **/start** - Berkenalan dengan CarpaBot
- **/help** - Panduan terkait bantuan untuk menggunakan bot ini
- **/kata_terlarang** - Daftar kata-kata terlarang yang tidak diizinkan bot
- **/ketentuan** - Daftar ketentuan dalam menggunakan bot ini
- **/link** - Menampilkan daftar link yang diperbolehkan

## Kontak

Jika kamu memiliki pertanyaan atau masalah, silakan buka issue di repository GitHub atau hubungi pengembang melalui Telegram [@riann18](https://t.me/riann18).

## Terhubung dengan kita

#### Grup

- **Mobile Legends Party:** [@party_ml](https://t.me/party_ml)

#### Channel

- **Cari Party:** [@partyml_promote](https://t.me/partyml_promote)
- **Cari Squad:** [@nemu_sq](https://t.me/nemu_sq)
- **Event:** [@partyml_event](https://t.me/partyml_event)
- **Daftar Penipu:** [@list_penipu](https://t.me/list_penipu)

---

Dibuat dengan ❤️
