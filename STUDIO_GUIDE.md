# ⚡ WMS Nexus • Unified Developer & Testing Hub (`/studio`)
## Buku Panduan Lengkap: Filosofi, Arsitektur, Fitur, & Alasan Desain Sistem

Dokumen ini menjelaskan secara mendalam **seluruh seluk-beluk `/studio`**: mengapa sistem ini dibangun, mengapa setiap fitur dan tombol dihadirkan, bagaimana arsitektur teknis di baliknya bekerja, serta perbedaan mendasar perintah eksekusi server (`npm run dev` vs `npm run dev:all` vs `npm run dev:full`).

---

## DAFTAR ISI
1. [Latar Belakang: Kenapa Sistem `/studio` Ini Dibuat?](#1-latar-belakang-kenapa-sistem-studio-ini-dibuat)
2. [Perintah Eksekusi: Kenapa `npm run dev`, Kenapa Bukan `dev:all` atau `dev:full`?](#2-perintah-eksekusi-kenapa-npm-run-dev-kenapa-bukan-devall-atau-devfull)
3. [Arsitektur Dual-Track: Kenapa Harus Menggunakan UDP untuk Telemetri?](#3-arsitektur-dual-track-kenapa-harus-menggunakan-udp-untuk-telemetri)
4. [Tri-Layer Self-Healing: Kenapa Ada 3 Metode Pemulihan Paket?](#4-tri-layer-self-healing-kenapa-ada-3-metode-pemulihan-paket)
5. [Bedah 5 Kartu Radar Metrik Live: Kenapa Ada Kartu Ini?](#5-bedah-5-kartu-radar-metrik-live-kenapa-ada-kartu-ini)
6. [Bedah Lengkap 16 Tombol Interactive Testbed Suite: Kenapa Tombol Ini Ada?](#6-bedah-lengkap-16-tombol-interactive-testbed-suite-kenapa-tombol-ini-ada)
7. [Unified Log & Inspection Deck: Kenapa Ada 3 Tampilan Log?](#7-unified-log--inspection-deck-kenapa-ada-3-tampilan-log)
8. [Fitur-Fitur Produktivitas Lanjutan](#8-fitur-fitur-produktivitas-lanjutan)
9. [Peta Lokasi Kode Sumber (Source Code Map)](#9-peta-lokasi-kode-sumber-source-code-map)

---

## 1. Latar Belakang: Kenapa Sistem `/studio` Ini Dibuat?

Sebelum `/studio` dibangun, proyek WMS Nexus memiliki dua halaman terpisah:
1. **`/api-docs` (Swagger UI):** Tempat menguji endpoint REST API bisnis (Purchase Order, Inventory, dsb).
2. **`/benchmark` (Telemetry Lab):** Tempat menguji ketahanan server dan metrik performa.

### Masalah Nyata di Lapangan:
* **Pengalaman Terfragmentasi:** Pengembang, dosen, maupun penguji harus membuka dua tab browser berbeda dan bolak-balik menyalin token autentikasi.
* **Tidak Ada Pembuktian Keterhubungan (*Cause & Effect*):** Ketika user membuat Purchase Order di REST API, user tidak bisa melihat bukti langsung bagaimana log telemetri tersebut diproses oleh server tanpa membebani database.
* **Ketidakpercayaan Penguji (*Lack of Empirical Proof*):** Mengklaim "Sistem kami memiliki *packet loss recovery*" hanya dengan menampilkan teks persentase membuat orang ragu: *"Apakah paketnya benar-benar hilang? Di mana nomor sequence-nya? Mana buktinya di database?"*

### Solusi WMS Nexus Studio:
Menyatukan seluruh ekosistem ke dalam **satu URL (`/studio`)**. Semua URL lama (`/benchmark` dan `/api-docs`) otomatis dialihkan (*auto-redirect*) ke `/studio` dengan sinkronisasi URL hash (`#telemetry`, `#api`, `#architecture`). State aplikasi (token login, log terminal, riwayat pengujian) berpindah instan (< 10ms) tanpa reload halaman.

---

## 2. Perintah Eksekusi: Kenapa `npm run dev`, Kenapa Bukan `dev:all` atau `dev:full`?

Di dalam `package.json`, terdapat tiga skrip utama untuk menjalankan aplikasi backend/frontend:

```json
"scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "dev:all": "concurrently -n \"API,AGG\" -c \"blue,green\" \"npm run dev\" \"npm run aggregator:dev\"",
    "dev:full": "concurrently -n \"API,AGG,FE\" -c \"blue,green,magenta\" \"npm run dev\" \"npm run aggregator:dev\" \"npm run dev:fe\""
}
```

Berikut alasan mendalam mengapa Anda **hanya perlu menjalankan `npm run dev`**:

### A. Kenapa Sekarang Cukup `npm run dev`? (Solusi Terintegrasi)
* **Embedded Daemon Architecture:** Di dalam `src/index.ts`, kami telah menanamkan `startAggregator()` secara langsung. Artinya, saat Anda mengetik `npm run dev`, server Express (HTTP Port 5000) dan UDP Aggregator (Port 5001) hidup di dalam **satu proses Node.js yang sama (Shared In-Memory Context)**.
* **Sinkronisasi Metrik 100% Akurat:** Karena berada dalam satu proses memori, endpoint `/api/benchmark/metrics` dapat membaca variabel `totalPacketLossCount`, `totalRecoveredCount`, dan `lastSequenceId` secara langsung dari memori yang sama tanpa jeda jaringan.
* **Hemat Sumber Daya:** Hanya menggunakan 1 thread proses Node.js di komputer Anda, tidak memboroskan CPU dan RAM.

### B. Kenapa `npm run dev:all` Malah Membuat Metrik Terbaca 0? (Process Isolation)
* `npm run dev:all` menggunakan pustaka `concurrently` untuk menyalakan **2 proses Node.js yang benar-benar terpisah** di Sistem Operasi:
  * **Proses A (PID 1024):** Menjalankan `src/index.ts` (API Port 5000).
  * **Proses B (PID 2048):** Menjalankan `src/aggregator/index.ts` (Port 5001).
* **Akar Masalah (Isolasi Memori OS):** Sistem Operasi (Windows/Linux) melarang Proses A membaca isi RAM Proses B (*Process Memory Protection*). 
* Ketika paket UDP diterima oleh Proses B, variabel `totalRecoveredCount` di Proses B bertambah. Namun ketika browser meminta data metrik ke Proses A (`GET http://localhost:5000/api/benchmark/metrics`), Proses A hanya bisa membaca variabel memorinya sendiri yang masih bernilai `0`. Akibatnya, kartu metrik di Studio tampak tidak bertambah (`Last Seq: #0`, `Recovered: 0`).

### C. Kenapa dan Kapan `npm run dev:full` Digunakan?
* `npm run dev:full` menambahkan proses ketiga: `npm --prefix frontend run dev` (Vite/React frontend WMS).
* Perintah ini **hanya digunakan jika Anda sedang mengembangkan antarmuka aplikasi gudang utama berbasis React** yang ada di folder `/frontend`.
* Jika Anda sedang fokus menguji REST API, menguji kestabilan server, atau mendemokan fitur WMS Nexus di `/studio`, Anda **tidak membutuhkan `dev:full`** karena antarmuka `/studio` sudah disajikan secara mandiri dan sangat ringan oleh server Express dari folder `/public`.

---

## 3. Arsitektur Dual-Track: Kenapa Harus Menggunakan UDP untuk Telemetri?

### Masalah Arsitektur Tradisional (Single-Track Blocking):
Pada arsitektur backend biasa, setiap kali user melakukan aksi (misal POST Purchase Order), server melakukan dua hal secara berurutan:
1. Memproses transaksi bisnis di database.
2. Melakukan `INSERT INTO audit_logs ...` ke database lewat koneksi TCP.

Operasi ke-2 ini memicu **Event Loop Lag** dan **I/O Contention**. Database harus mengunci baris (*row lock*), menulis ke disk WAL, dan merespons balik. Jika ada 1.000 transaksi bersamaan, response time server melonjak dari 5ms menjadi 500ms–2.000ms hanya karena menunggu penulisan log audit!

### Solusi Dual-Track WMS Nexus:
```
[ HTTP Client ] ──(Port 5000)──> [ Express Backend Core ] ───> [ Response 200 OK (~0.2ms) ]
                                          │
                        Non-blocking UDP  │ Fire-and-Forget
                         (Port 5001)      ▼
                                 [ UDP Aggregator ]
                                          │
                     Threshold: 100 logs  │ In-Memory Double Buffer
                      atau interval 2.0s  ▼
                                 [ Bulk SQL INSERT ] ───> [ PostgreSQL Database ]
```

1. **Track 1 (Jalur Bisnis Cepat):** Express memproses pesanan gudang, lalu langsung mengembalikan respon ke user dalam hitungan ~0.2 milidetik.
2. **Track 2 (Jalur Telemetri Asinkron):** Log telemetri ditembakkan ke soket lokal UDP port 5001 secara *fire-and-forget* tanpa menunggu balasan apapun.
3. **Double-Buffering & Multi-Row Bulk Insert:** Aggregator menampung paket di RAM, lalu mengeksekusi satu perintah SQL raksasa (`INSERT INTO telemetry_logs VALUES (...), (...), (...)`) setiap kali antrean mencapai 100 log atau 2 detik sekali. Ini menghemat beban I/O database hingga 98%.

---

## 4. Tri-Layer Self-Healing: Kenapa Ada 3 Metode Pemulihan Paket?

UDP terkenal memiliki sifat tidak menjamin paket sampai (*unreliable datagram*). Jika jaringan macet atau CPU jenuh, paket bisa terbuang (*dropped*). Untuk mengatasi ini, WMS Nexus menciptakan **Tri-Layer Self-Healing Protocol**:

```
                       ┌───────────────────────────────┐
                       │  Deteksi Paket Hilang di UDP  │
                       └──────────────┬────────────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            ▼                         ▼                         ▼
  [ Gap <= 2 Paket ]         [ Gap > 2 Paket ]        [ Log Fatal / Error 500 ]
            │                         │                         │
  Metode 3: PIGGYBACK        Metode 1: TCP NACK        Metode 2: TCP FALLBACK
 (Zero-RTT Redundancy)      (Selective ARQ Loop)      (Circuit Breaker Ingest)
            │                         │                         │
  Pulih instan 0ms delay    Ditarik dari Ring Buffer   100% Anti-Hilang Garansi
```

### 1) Metode 3: Zero-RTT Piggybacking (Pemulihan Skala Mikro)
* **Kenapa dibuat?** Dalam jaringan nyata, paket hilang paling sering terjadi secara sporadis (hanya 1 atau 2 paket yang terlewat karena jitter). Meminta kirim ulang lewat TCP membuang waktu (*high latency*).
* **Cara kerja:** Setiap kali Express mengirim paket UDP, paket tersebut "menggendong" salinan dari 2 paket sebelumnya di bagian payload `piggyback: [seq-1, seq-2]`.
* **Hasil:** Ketika paket `#102` hilang tetapi paket `#103` tiba, Aggregator langsung membuka gendongan `#103` dan menyelamatkan `#102` seketika itu juga tanpa perlu kirim ulang (**0-RTT = Zero Round Trip Time**).

### 2) Metode 1: Selective TCP NACK ARQ (Pemulihan Skala Menengah/Besar)
* **Kenapa dibuat?** Jika terjadi lonjakan paket hilang yang besar (misal 9 sampai 50 paket hilang), metode *piggyback* tidak bisa digunakan karena datagram UDP akan menjadi terlalu gemuk dan melebihi batas MTU jaringan (*packet fragmentation*).
* **Cara kerja:** Express menyimpan 3.000 paket terakhir di memori pengirim (*Circular Ring Buffer*). Begitu Aggregator mendeteksi ada celah sequence besar (misal loncat dari `#100` ke `#110`), Aggregator menembak HTTP POST request balik via TCP ke `/api/benchmark/telemetry-resend` meminta paket `#101 s.d #109`.
* **Hasil:** Seluruh paket yang tertinggal dikirim ulang via TCP dan masuk kembali ke database secara berurutan.

### 3) Metode 2: Circuit Breaker TCP Fallback (Penanganan Log Kritis)
* **Kenapa dibuat?** Tidak semua log berbobot sama. Log informasi navigasi boleh hilang sejenak, tetapi log kesalahan fatal (*HTTP 500 Internal Server Error* atau kegagalan transaksi inventaris) **TIDAK BOLEH HILANG SAMA SEKALI**.
* **Cara kerja:** Jika log memiliki level `ERROR`, status code $\ge 500$, atau buffer UDP lokal penuh (*backpressure ENOBUFS*), sistem otomatis mematikan jalur UDP dan membelokkan pengiriman ke jalur **Direct TCP HTTP Ingest** (`/api/benchmark/telemetry-tcp-ingest`).
* **Hasil:** Jaminan integritas 100% anti-hilang untuk log penting.

---

## 5. Bedah 5 Kartu Radar Metrik Live: Kenapa Ada Kartu Ini?

Di bagian atas Tab 1, terdapat 5 kartu radar real-time yang memantau kesehatan server:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Effective Loss  │ │ Total Recovered │ │   PostgreSQL    │ │   RAM Buffer    │ │   Memory RSS    │
│     0.00%       │ │     18 pkts     │ │   1,420 rows    │ │     0 items     │ │    48.20 MB     │
│    Zero-Loss    │ │ NACK: 3 • #141  │ │ telemetry_logs  │ │ Threshold: 100  │ │ Uptime: 120s    │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

1. **Effective Loss Rate (Target: 0.00% Zero-Loss):**
   * **Kenapa ada?** Membuktikan bahwa meski jaringan UDP tidak stabil, database akhir tidak kehilangan data.
   * **Rumus:**
     $$\text{Effective Loss Rate} = \frac{\text{Raw Drop} - \text{Total Recovered}}{\text{Total Expected Packets}} \times 100\%$$
   * Jika semua paket yang drop berhasil dipulihkan oleh Piggyback atau NACK, nilainya akan selalu **0.00% (Zero-Loss)**.
2. **Total Recovered Packets:**
   * **Kenapa ada?** Menghitung total akumulasi paket yang sempat hilang namun berhasil diselamatkan kembali ke database.
   * Dilengkapi informasi **`NACK: X`** (frekuensi request TCP retransmission) dan **`Last Seq: #X`** (nomor sequence paket terakhir).
3. **PostgreSQL Persisted:**
   * **Kenapa ada?** Menunjukkan jumlah baris riil yang telah tersimpan di tabel fisik `telemetry_logs` di database PostgreSQL. Tombol *`📋 Lihat Log Database`* langsung membuka tabel data riil tersebut.
4. **RAM Buffer Queue:**
   * **Kenapa ada?** Menampilkan antrean log yang sedang ditahan sementara di RAM sebelum di-*flush* ke database. Ambang batasnya adalah **100 log atau interval 2 detik**.
5. **Memory RSS (Resident Set Size):**
   * **Kenapa ada?** Memantau penggunaan memori fisik Node.js secara langsung untuk membuktikan bahwa penanganan ribuan paket log tidak menyebabkan kebocoran memori (*memory leak*).
6. **Sparkline Area Gradient & Pulsing Dot:**
   * Setiap kartu memiliki grafik gelombang visual mini (*wave sparkline*) dengan gradasi warna SVG dan titik hidup berkedip di ujung terbarunya yang berfluktuasi saat beban trafik masuk.

---

## 6. Bedah Lengkap 16 Tombol Interactive Testbed Suite: Kenapa Tombol Ini Ada?

Seluruh 16 tombol aksi dibagi ke dalam 3 kartu fungsional:

### Kelompok 1: Throughput UDP (Stress Testing)
1. **⚡ Single UDP Datagram (1 Log):**
   * *Kenapa ada?* Menguji latensi satu paket log asinkron. Membuktikan bahwa request selesai dalam hitungan mikrodetik (~0.2 ms) tanpa menunggu penulisan database.
2. **🚀 Batch Trigger (100 Logs):**
   * *Kenapa ada?* Menguji ambang batas (*threshold 100 items*) Aggregator. Membuktikan bahwa tepat pada log ke-100, buffer RAM langsung dikosongkan dan di-*flush* ke PostgreSQL secara otomatis.
3. **🔥 High Load Burst (1.000 Logs):**
   * *Kenapa ada?* Menembakkan 1.000 paket dalam *microsecond loop* dari server untuk menguji throughput tinggi (>50.000 paket/detik).
4. **💥 Stress Blast (5.000 Logs):**
   * *Kenapa ada?* Menguji kapasitas buffer soket sistem operasi dan melihat bagaimana *double buffering* mengatasi banjir data ekstrem tanpa OOM (*Out of Memory*).

### Kelompok 2: Keandalan & Injeksi Kesalahan (Fault Injection)
5. **🎯 Simulasi Hilang 2 Paket (Zero-RTT) • *Method 3 Piggyback*:**
   * *Kenapa ada?* Mensimulasikan paket hilang skala kecil. Membuktikan bahwa paket hilang langsung dipulihkan seketika (0ms delay) menggunakan salinan redundan di punggung paket berikutnya.
6. **🔄 Simulasi Hilang 9 Paket (TCP NACK) • *Method 1 ARQ*:**
   * *Kenapa ada?* Mensimulasikan lonjakan paket hilang skala menengah. Membuktikan bahwa Aggregator secara otomatis mendeteksi celah urutan, menembak request TCP NACK ke *Ring Buffer*, dan memulihkan 9 paket sekaligus.
7. **🚨 Simulasi Error 500 (TCP Fallback) • *Method 2 Circuit*:**
   * *Kenapa ada?* Membuktikan bahwa pada saat terjadi kegagalan fatal (*Status 500*), sistem mem-bypass jalur UDP dan mengalirkan log melalui koneksi TCP langsung agar 100% anti-hilang.
8. **💓 Manual Heartbeat Ping • *Watchdog Reset*:**
   * *Kenapa ada?* Mengirim sinyal detak jantung manual ke Watchdog Aggregator untuk membuktikan mekanisme deteksi server mati/hidup.

### Kelompok 3: Autocannon & Komparasi Sinkron vs Asinkron
9. **⚡ Autocannon UDP Route (100 Conn, 10s):**
   * *Kenapa ada?* Pengujian beban resmi standar industri (*HTTP load test*) menggunakan 100 koneksi konkuren selama 10 detik ke rute UDP non-blocking. Menghasilkan throughput ribuan req/s dengan latensi p99 ultra-rendah (<3ms).
10. **🐢 Autocannon Sync DB (50 Conn, 5s):**
    * *Kenapa ada?* Menjalankan pengujian beban ke rute yang menulis langsung ke database secara sinkron. Menunjukkan penurunan throughput drastis dan peningkatan latensi akibat *database connection pool exhaustion*.
11. **⚡ Quick Autocannon Blitz (3s):**
    * *Kenapa ada?* Pengujian beban cepat 3 detik untuk demonstrasi singkat tanpa perlu menunggu 10 detik penuh.
12. **📋 Salin Perintah CLI:**
    * *Kenapa ada?* Menyalin perintah resmi `npx autocannon -c 100 -d 10 http://localhost:5000/api/benchmark/udp-log` ke clipboard agar penguji dapat mengeksekusinya langsung di terminal eksternal.
13. **⏳ Sync DB Logging (10 Logs):**
    * *Kenapa ada?* Menulis 10 log sinkron berurutan ke database untuk memperlihatkan latensi blocking database (~10–20 ms per log).
14. **⚠️ Sync DB Logging (50 Logs):**
    * *Kenapa ada?* Menulis 50 log sinkron berurutan untuk memperlihatkan efek *lock contention* dan penumpukan antrean query (~500–1.000 ms).
15. **🧹 Bersihkan Semua Log DB (Purge & Reset):**
    * *Kenapa ada?* Menghapus seluruh baris log dari database PostgreSQL serta mereset seluruh counter metrik (*Raw Drop*, *Recovered*, *Sequence ID*) kembali ke angka 0 agar Anda dapat memulai sesi pengujian baru yang bersih.
16. **🔄 Paksa Sinkronkan Metrik:**
    * *Kenapa ada?* Memaksa browser mengambil data metrik terbaru dari server seketika tanpa menunggu interval polling otomatis (1.5 detik).

> [!TIP]
> **Fitur Verifikasi Terminal Mandiri (Anti-Asal Claim):**  
> Setiap dari 16 tombol pengujian di atas kini dilengkapi dengan **blok perintah CLI / cURL terminal** di dalam tooltip tanda seru (`ⓘ`) lengkap dengan tombol interaktif **"📋 Salin"**.  
> Dosen penguji, reviewer, atau pengembang dapat menyalin perintah tersebut dan mengeksekusinya langsung di layar terminal (PowerShell, Command Prompt, atau Bash) di luar browser untuk membuktikan bahwa seluruh pengujian bekerja nyata pada level jaringan dan API server, bukan sekadar simulasi atau klaim antarmuka semata.

### 💡 Membaca Hasil Autocannon: Memahami Hubungan Latensi & Throughput

Saat menjalankan pengujian beban dengan Autocannon (baik melalui tombol UI di Studio maupun perintah terminal `npm run benchmark:udp`), dua metrik utama selalu disajikan dan dianalisis secara bersamaan:

1. **Latensi (*Response Time* - Satuan: ms):**
   * *Pertanyaan:* Berapa lama waktu yang dibutuhkan sejak request dikirim hingga respon diterima klien?
   * *Target:* **Semakin KECIL semakin baik.** Pada jalur UDP, latensi rata-rata berada pada kisaran `~1.2 ms` dengan p99 `< 5 ms`.
2. **Throughput (*Requests per Second* - Satuan: req/s):**
   * *Pertanyaan:* Berapa banyak transaksi yang sanggup diselesaikan server dalam tempo satu detik?
   * *Target:* **Semakin BESAR semakin baik.** Pada jalur UDP, throughput melonjak hingga `~4.750 req/s`.

> [!NOTE]
> **Hukum Antrean (*Little's Law*):**
> $$\text{Throughput} = \frac{\text{Jumlah Koneksi Konkuren}}{\text{Latensi Respons}}$$
> * **Pada Jalur Sinkron (Sync DB):** Kueri log audit menahan koneksi database selama 15–20 ms $\rightarrow$ Latensi melonjak $\rightarrow$ Throughput jatuh ke ~320 req/s.
> * **Pada Jalur Asinkron (Dual-Track UDP):** Logging diserahkan ke soket UDP dalam ~0.2 ms (*fire-and-forget*) $\rightarrow$ Latensi turun drastis $\rightarrow$ Throughput melompat 14x lipat!

---

## 7. Unified Log & Inspection Deck: Kenapa Ada 3 Tampilan Log?

Di bawah tombol aksi, terdapat dek inspeksi terpadu dengan 3 tab:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [📡 Visual Packet Sequence]    [📋 PostgreSQL Live Logs]    [📺 Audit Terminal Console] │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1) Tab 1: 📡 Visual Packet Sequence Inspector (Pembuktian Empiris)
* **Kenapa dibuat?** Menjawab keraguan: *"Mana buktinya kalau paket hilang dan pulih?"*.
* **Cara Membaca:**
  * Alur paket ditampilkan sebagai chip visual berurutan: `[Seq #1 ✓]` $\rightarrow$ `[Seq #2 ✓]` $\rightarrow$ `[Seq #3 ✓]`.
  * Saat tombol simulasi ditekan, paket yang hilang langsung muncul sebagai kotak merah putus-putus berkedip: `[Seq #4 ⚠️ Drop]`, `[Seq #5 ⚠️ Drop]`.
  * Begitu dipulihkan, dalam 300ms kotak tersebut berubah menjadi warna ungu menyala: `[Seq #4 🔄 Pulih]` dan `[Seq #5 🔄 Pulih]`.
* **Klik untuk Inspeksi:** Setiap chip dapat diklik untuk membuka rincian metadata JSON, stempel waktu milidetik, latensi, dan metode pemulihan yang digunakan di panel samping kanan.

### 2) Tab 2: 📋 PostgreSQL Live Logs Table (Log Database Riil)
* **Kenapa dibuat?** Menampilkan data nyata yang benar-benar tersimpan di tabel `telemetry_logs` database PostgreSQL, bukan sekadar memori sementara.
* **Fitur:** Dilengkapi tabel berkolom `ID`, `Seq #`, `Level`, `Method & Endpoint`, `Status Code`, `Latency (ms)`, `Timestamp`, tombol lihat raw JSON, dropdown filter level, dan kotak pencarian teks.

### 3) Tab 3: 📺 Audit Terminal Console
* **Kenapa dibuat?** Menyajikan stream log teknis server secara kronologis dengan stempel waktu presisi tinggi, tombol jeda (*pause*), tombol salin log, serta pemangkasan DOM otomatis (*DOM pruning*) agar browser tidak melambat meski menerima jutaan baris log.

---

## 8. Fitur-Fitur Produktivitas Lanjutan

1. **Cause & Effect Linking:**
   * Di Tab 2 (WMS REST API), ketika Anda mengeksekusi request (misal `POST /api/po`), request tersebut membawa *Correlation ID* (`X-Request-Id`).
   * Begitu berhasil, muncul toast: *"Lihat dampaknya di Telemetry →"*. Jika diklik, Studio langsung berpindah ke Tab 1 dan menyorot chip paket serta baris log terkait secara otomatis.
2. **Command Palette (`Ctrl + K` / `Cmd + K`):**
   * Antarmuka pencarian cepat keyboard-first untuk berpindah tab, memicu pengujian beban, mengganti tema, atau mencari dokumentasi tanpa menyentuh mouse.
3. **Interactive Guided Tour (Onboarding 4 Langkah):**
   * Menyambut pengguna baru saat pertama kali membuka halaman untuk memperkenalkan letak radar metrik, tombol testbed, Swagger API, dan diagram arsitektur.
4. **Dwibahasa (ID / EN):**
   * Tersedia toggle bahasa instan di header kanan atas yang menerjemahkan seluruh antarmuka secara dinamis tanpa me-reload halaman.
5. **Export Laporan Riset (Tab 3):**
   * Seluruh hasil eksekusi pengujian (Throughput, Req/s, Latensi p50/p99) dapat diekspor menjadi dokumen **Markdown (.md)**, **JSON (.json)**, atau **CSV (.csv)** untuk bahan laporan skripsi, tesis, atau evaluasi arsitektur tim.

---

## 9. Peta Lokasi Kode Sumber (Source Code Map)

Seluruh logika sistem ini terorganisir rapi di berkas-berkas berikut:

| Kategori | Berkas | Deskripsi |
| :--- | :--- | :--- |
| **Frontend UI** | [`public/studio.html`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/public/studio.html) | Struktur HTML lengkap, radar metrik, tombol testbed, dan dek inspeksi log. |
| **Styling** | [`public/css/studio.css`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/public/css/studio.css) | Desain sistem tokens, tema dark/light mode, animasi SVG sparkline, dan layout responsif. |
| **Routing Studio** | [`public/js/studio.js`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/public/js/studio.js) | Routing tab tanpa reload berbasis URL hash (`#telemetry`, `#api`, `#architecture`). |
| **State Manager** | [`public/js/studio-state.js`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/public/js/studio-state.js) | Manajemen state reaktif, penyimpanan sesi JWT, dan bus event. |
| **Modul Telemetri** | [`public/js/studio-telemetry.js`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/public/js/studio-telemetry.js) | Handler 16 tombol aksi, visual packet sequence inspector, dan fetcher tabel Postgres. |
| **Modul API** | [`public/js/studio-api.js`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/public/js/studio-api.js) | Integrasi Swagger UI, tombol login akun demo, dan otentikasi Bearer persisten. |
| **Modul Arsitektur**| [`public/js/studio-architecture.js`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/public/js/studio-architecture.js)| Diagram alur sistem dan modul export laporan (Markdown/JSON/CSV). |
| **Command Palette**| [`public/js/studio-palette.js`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/public/js/studio-palette.js) | Modal pintasan keyboard (`Ctrl+K`) dan modul tur interaktif onboarding. |
| **Kamus Bahasa** | [`public/js/studio-i18n.js`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/public/js/studio-i18n.js) | Kamus terjemahan dwibahasa Indonesia & Inggris. |
| **Backend Entry** | [`src/index.ts`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/src/index.ts) | Entry point Express, auto-redirect URL lama, dan inisialisasi embedded daemon. |
| **API Benchmark** | [`src/routes/benchmarkRoutes.ts`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/src/routes/benchmarkRoutes.ts) | Endpoint pengujian, metrik live, Autocannon runner, dan query tabel log. |
| **UDP Aggregator** | [`src/aggregator/index.ts`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/src/aggregator/index.ts) | Server UDP daemon (:5001), gap detection, double buffering, dan bulk insert Postgres. |
| **Klien UDP Logger**| [`src/utils/udpLogger.ts`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/src/utils/udpLogger.ts) | Klien soket pengirim UDP, Circular Ring Buffer (3.000 log), dan penyisipan Piggyback. |
| **Database Model** | [`prisma/schema.prisma`](file:///c:/Users/User/Warehouse-Management-System-WMS-API/prisma/schema.prisma) | Definisi tabel PostgreSQL `telemetry_logs` (baris 251–267). |

---

*WMS Nexus • Engineered for High-Throughput & Zero-Loss Observability.*

