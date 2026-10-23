# Warehouse Management System (WMS) & Dual-Track Telemetry Ecosystem

Sistem Manajemen Pergudangan modern (*Enterprise Warehouse Management System*) terintegrasi dengan **Dual-Track Telemetry (UDP Log Aggregator)**, arsitektur microservices berbasis **Docker Compose**, dan antarmuka manajemen stok & outbound berbasis **React 19 + TypeScript**.

---

## 🏗️ Arsitektur Sistem

Ekosistem WMS dirancang untuk throughput tinggi, efisiensi alur data (*data flow efficiency*), dan latensi ultra-rendah:

1. **`wms-api` (Port 5000/tcp)**:
   - Backend Express.js & TypeScript dengan Prisma 7 ORM.
   - Menyajikan REST API untuk Master Data (Products, Suppliers, Customers, Warehouses), Inbound PO, Mutasi/Transfer Stok, Opname, dan Outbound (Sales Order & Delivery Order).
   - Menyajikan Frontend Dashboard React 19 (Anti-slop Clean Light Enterprise Theme) di `/dashboard`.
   - Dokumentasi Swagger OpenAPI interaktif di `/api-docs`.
   - Mengirim log telemetri asinkron via UDP datagram tanpa membebani request-response cycle HTTP (latensi ~0.3ms).

2. **`udp-aggregator` (Port 5001/udp)**:
   - UDP Log Aggregator Server berbasis `dgram`.
   - Pelacakan `seq_id` kontinu untuk mendeteksi *packet loss*.
   - Proteksi OOM dengan batasan buffer RAM (10.000 entri) dan *Hybrid Flush* (batch 100 entri atau timeout 2.000ms).
   - *Watchdog Timer* (15 detik) untuk deteksi otomatis gangguan pengiriman dari worker.

3. **`postgres` (Port 5432/tcp)**:
   - PostgreSQL 16 Alpine dengan kernel tuning throughput tinggi:
     - `max_connections=500`
     - `shared_buffers=256MB`
     - `effective_cache_size=1GB`
     - `synchronous_commit=off`
     - `wal_buffers=16MB`

---

## 🚀 Menjalankan dengan Docker Compose

### 1. Prasyarat
- Docker Engine & Docker Compose terpasang di sistem.

### 2. Jalankan Seluruh Ekosistem
```bash
docker compose up -d
```

Docker Compose akan otomatis:
1. Membangun image multi-stage Node.js 20 Alpine.
2. Menjalankan PostgreSQL dengan tuning performa tinggi.
3. Menjalankan UDP Log Aggregator di port `5001/udp`.
4. Menjalankan WMS Backend & Web App di port `5000`.
5. Melakukan migrasi skema database (`prisma db push`) dan seeding data awal secara otomatis dan idempoten.

### 3. Akses Layanan
- **Web Dashboard**: [http://localhost:5000/dashboard](http://localhost:5000/dashboard) (atau [http://localhost:5000](http://localhost:5000))
- **Swagger API Docs**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Telemetry Metrics**: [http://localhost:5000/api/benchmark/metrics](http://localhost:5000/api/benchmark/metrics)

---

## 👤 Kredensial Login Default

Semua akun default menggunakan password: `password123`

| Peran (Role) | Email | Username | Deskripsi Hak Akses |
|---|---|---|---|
| **Manager** | `manager@wms.com` | `bapak_manager` | Akses penuh laporan eksekutif, PO, dan approval |
| **Staff Gudang** | `gudang@wms.com` | `joko_gudang` | Mutasi stok, opname fisik, picking & delivery order |
| **Purchasing** | `purchasing@wms.com` | `andi_purchasing` | Pembuatan & pemrosesan Purchase Order ke supplier |
| **Admin** | `admin@wms.com` | `admin_master` | Manajemen master data pengguna dan konfigurasi |

---

## 🛠️ Pengembangan Lokal (Tanpa Docker)

```bash
# 1. Install dependencies
npm install
npm --prefix frontend install

# 2. Setup database schema & initial data
npx prisma db push
npm run seed

# 3. Jalankan UDP Log Aggregator
npm run aggregator:dev

# 4. Jalankan WMS Backend (Terminal Baru)
npm run dev

# 5. Jalankan Frontend Vite Dev (Terminal Baru)
npm run dev:fe
```

---

## 📊 Benchmark & Verifikasi Telemetri

Uji perbandingan latensi antara synchronous database logging vs asynchronous UDP log dispatcher:
```bash
# Benchmark Sync Log (menulis langsung ke DB per request): ~300ms
curl http://localhost:5000/api/benchmark/sync-log

# Benchmark UDP Log (kirim datagram fire-and-forget): ~0.3ms (1000x lebih cepat)
curl http://localhost:5000/api/benchmark/udp-log

# Pantau metrik agregator real-time
curl http://localhost:5000/api/benchmark/metrics
```
