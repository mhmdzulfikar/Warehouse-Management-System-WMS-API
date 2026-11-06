# 🛡️ Security Policy & UDP Threat Model

Dokumen ini menjelaskan kebijakan keamanan (*Security Policy*) untuk **Warehouse Management System (WMS) & Dual-Track Telemetry Ecosystem**, serta analisis mendalam mengenai **risiko keamanan protokol UDP**, kelemahan arsitektur *connectionless*, dan **solusi mitigasi konkret** yang diterapkan dalam sistem ini.

---

## 📋 Kebijakan Pelaporan Kerentanan (Reporting a Vulnerability)

Keamanan data operasional gudang dan integritas transaksi adalah prioritas utama. Jika Anda menemukan celah keamanan (*vulnerability*) pada sistem ini:
1. **Jangan membuat Public Issue di GitHub.**
2. Kirimkan laporan detail secara privat melalui email ke: `security@wms-nexus.io` atau hubungi tim pengembang via GitHub Security Advisory.
3. Cantumkan:
   - Deskripsi kerentanan dan potensi dampak.
   - Langkah reproduksi (*proof-of-concept* / PoC).
   - Saran perbaikan jika ada.
4. Tim kami akan merespons dalam kurun waktu **1x24 jam** dan memberikan update penanganan secara berkala.

---

## ⚠️ Analisis Risiko Keamanan UDP vs TCP

Pada arsitektur **Dual-Track Telemetry**, jalur status log menggunakan protokol **UDP (Port 5001)** demi mencapai throughput tinggi dan latensi rendah (~0.3 ms). 

Namun, secara fundamental protokol UDP memiliki karakteristik tanpa koneksi (*connectionless*), tanpa *handshake*, dan tanpa *flow control*. Hal ini membuka celah keamanan spesifik jika tidak dipagari dengan proteksi ketat.

Berikut adalah 5 kelemahan utama UDP beserta **solusi mitigasi konkret** yang diterapkan di proyek ini:

---

### 1. Ancaman: Pemalsuan Alamat IP (*IP Spoofing & Log Injection*)

* **Kelemahan UDP:**
  Karena tidak ada proses *3-Way Handshake* (SYN -> SYN-ACK -> ACK seperti pada TCP), penyerang dapat memalsukan *header* IP pengirim (*spoofed IP*). Pihak luar bisa menembakkan datagram palsu ke port 5001 seolah-olah log tersebut berasal dari server internal.
* **Dampak:**
  Pencemaran data telemetri (*log poisoning*), manipulasi audit trail, atau pemicuan alarm palsu (*false alert*).
* **Solusi & Mitigasi yang Diterapkan:**
  1. **Network Boundary Isolation (Zero Public Exposure):**
     * Di lingkungan *production*, port UDP 5001 **TIDAK PERNAH diekspos ke internet publik**.
     * Pada Docker Compose (`docker-compose.yml`), UDP listener hanya terikat pada jaringan internal Docker bridge (`UDP_HOST: udp-aggregator`), sehingga hanya kontainer `wms-api` yang memiliki rute jaringan ke sana.
     * Pada instalasi lokal, port UDP hanya di-bind ke loopback interface `127.0.0.1` (bukan `0.0.0.0`).
  2. **Shared Secret / HMAC Payload Signature (Opsional/Enterprise):**
     * Sistem mendukung penyisipan token hash internal / signature rahasia pada field payload. Datagram yang tidak memiliki hash valid akan di-*drop* seketika sebelum diproses oleh Aggregator.

---

### 2. Ancaman: Serangan Banjir Paket & Kehabisan RAM (*UDP Flood DoS & OOM*)

* **Kelemahan UDP:**
  UDP tidak memiliki *congestion control* atau *backpressure*. Penyerang dapat membanjiri (*blast*) port 5001 dengan jutaan datagram per detik, yang berpotensi menghabiskan memori RAM Node.js (*Heap Out-of-Memory / OOM Crash*) atau membebani CPU database.
* **Dampak:**
  Server Aggregator crash atau kehabisan memori, menyebabkan pemantauan sistem lumpuh.
* **Solusi & Mitigasi yang Diterapkan:**
  1. **OOM Hard Protection Cap:**
     Di [src/aggregator/index.ts](file:///c:/Users/User/Warehouse-Management-System-WMS-API/src/aggregator/index.ts), buffer RAM dibatasi secara ketat pada batas maksimal (`MAX_BUFFER_LIMIT = 50.000` log). Jika buffer mencapai batas kritis akibat lonjakan mendadak, sistem otomatis memicu *Emergency Flush* langsung ke database dan membuang kelebihan paket agar proses Node.js tidak pernah mati (Crash-Free).
  2. **Sliding Window Eviction di API:**
     Pada pengirim [src/utils/udpLogger.ts](file:///c:/Users/User/Warehouse-Management-System-WMS-API/src/utils/udpLogger.ts), *Ring Buffer* memori dibatasi maksimal 3.000 log terakhir (`RING_BUFFER_MAX_SIZE = 3000`). Entri terlama otomatis di-evict (dihapus) secara FIFO sehingga pemakaian RAM API stabil di bawah 30 MB.
  3. **Kernel Socket Drop:**
     Jika socket buffer OS penuh, OS Linux/Windows akan langsung membuang paket UDP di level kernel tanpa membebani Event Loop aplikasi Node.js.

---

### 3. Ancaman: Penyadapan Data Sensitif (*Plaintext Sniffing & Eavesdropping*)

* **Kelemahan UDP:**
  Datagram UDP standar dikirim dalam bentuk teks mentah tanpa enkripsi (*cleartext JSON*). Jika lalu lintas jaringan disadap menggunakan tools seperti Wireshark atau `tcpdump`, penyerang di satu jaringan lokal bisa membaca isi log.
* **Dampak:**
  Kebocoran data sensitif seperti kredensial login, kata sandi, token JWT, atau informasi rahasia pesanan gudang.
* **Solusi & Mitigasi yang Diterapkan:**
  1. **Automated Data Masking & Sanitization:**
     Di [src/utils/udpLogger.ts](file:///c:/Users/User/Warehouse-Management-System-WMS-API/src/utils/udpLogger.ts), setiap log yang akan dikirim otomatis dipindai oleh fungsi `maskSensitiveData()`. Seluruh field sensitif seperti `password`, `token`, `authorization`, `secret`, `apiKey`, dan `access_token` otomatis disensor menjadi `***` sebelum masuk ke payload jaringan.
  2. **Private Network Encrypted Tunnel:**
     Untuk komunikasi antar-server jarak jauh (multi-data center), paket UDP wajib dilewatkan melalui VPN terenkripsi (WireGuard / IPSec) atau menggunakan **DTLS** (*Datagram Transport Layer Security*).

---

### 4. Ancaman: Penyalahgunaan Refleksi (*UDP Amplification & Reflection Attack*)

* **Kelemahan UDP:**
  Banyak layanan UDP publik (seperti DNS, NTP, Memcached) sering disalahgunakan untuk serangan DDoS Refleksi, di mana penyerang mengirim request kecil dengan IP korban yang dipalsukan, lalu server membalas dengan respon raksasa ke korban.
* **Dampak:**
  Server Anda dijadikan alat perantara (*amplifier*) untuk melumpuhkan server korban lain.
* **Solusi & Mitigasi yang Diterapkan:**
  1. **Unidirectional Ingest-Only (Tanpa Respon Balik):**
     Arsitektur `udp-aggregator` pada sistem ini bersifat **murni penerima satu arah (*One-Way Ingest*)**. Socket UDP server **TIDAK PERNAH mengirim paket balasan** apa pun ke IP pengirim melalui socket UDP.
  2. **Zero Amplification Factor:**
     Karena rasio pengiriman balik adalah 0 byte (faktor amplifikasi = 0x), server ini secara matematis dan arsitektural **kebal total** terhadap eksploitasi serangan refleksi / amplifikasi.

---

### 5. Ancaman: Kerusakan Payload & Crash Parser (*Malformed Packet / JSON Crash*)

* **Kelemahan UDP:**
  Paket UDP dapat terpotong (*fragmentation*), korup saat transmisi, atau sengaja dikirimi data acak (*fuzzing*) oleh peretas untuk merusak *deserializer*.
* **Dampak:**
  Eksepsi tak tertangani (`SyntaxError: Unexpected token in JSON`) yang dapat merobohkan proses Node.js.
* **Solusi & Mitigasi yang Diterapkan:**
  1. **Isolated Try-Catch Block:**
     Di [src/aggregator/index.ts](file:///c:/Users/User/Warehouse-Management-System-WMS-API/src/aggregator/index.ts), seluruh proses pembacaan `JSON.parse(msg)` dibungkus di dalam blok `try/catch` terlindung. Jika ada paket rusak atau terpotong, paket tersebut langsung diabaikan tanpa pernah menghentikan server.
  2. **Type & Schema Validation:**
     Hanya field yang valid secara tipe data (`seqId` bertipe number, `message` bertipe string) yang dimasukkan ke antrean database, mencegah injeksi SQL atau malformed data.

---

## 📊 Matriks Ringkasan Ancaman & Solusi (Threat Modeling Matrix)

| Vektor Serangan | Karakteristik Kelemahan UDP | Tingkat Risiko | Solusi & Mitigasi di Sistem Ini |
| :--- | :--- | :---: | :--- |
| **IP Spoofing** | Tanpa TCP 3-way handshake | 🟡 Sedang | Bind `127.0.0.1` / Isolated Docker network, opsional HMAC token |
| **UDP Flood (DoS/OOM)** | Tanpa flow control & backpressure | 🔴 Tinggi | OOM Hard Cap (50.000 log buffer), Ring Buffer FIFO (3.000 entri) |
| **Cleartext Sniffing** | Payload tidak terenkripsi bawaan | 🔴 Tinggi | Sensor otomatis data sensitif (`password`, `token` -> `***`), isolasi VPC |
| **Reflection / Amplification** | Alamat asal bisa dipalsukan | 🟢 Rendah (Aman) | **Kebal Total**: Arsitektur Ingest-Only (server tidak pernah membalas via UDP) |
| **Malformed JSON Crash** | Kemungkinan paket korup / terpotong | 🟡 Sedang | Safe parsing dengan `try/catch` isolasi & validasi tipe schema |

---

## 🛡️ Rekomendasi Hardening untuk Production

1. **Firewall Rule (iptables / UFW / Cloud Security Groups):**
   Pastikan port `5001/udp` hanya mengizinkan *inbound traffic* dari IP internal host/kontainer backend API:
   ```bash
   # Contoh UFW (Hanya izinkan dari subnet internal Docker / VPC)
   sudo ufw allow from 172.18.0.0/16 to any port 5001 proto udp
   ```
2. **Jalankan sebagai Non-Root User:**
   Pada Dockerfile produksi, seluruh proses dijalankan menggunakan user tanpa privilese (`USER node`).
3. **Audit Log Rutin:**
   Pantau metrik packet loss dan retransmisi secara berkala via endpoint monitoring `/api/benchmark/metrics`.

