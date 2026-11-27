"""
Script to generate standalone high-resolution SVG flowcharts for BAB II:
- flowchart_bab2_tanpa_udp.svg: Alur Pemrosesan Transaksi Tanpa UDP (Synchronous Logging)
- flowchart_bab2_dengan_udp.svg: Alur Pemrosesan Transaksi Dengan UDP (Dual-Track Telemetry + Tri-Layer Self-Healing)
"""
import os

os.makedirs('docs/diagrams', exist_ok=True)

# -------------------------------------------------------------
# 1. FLOWCHART TANPA UDP (KONVENSIONAL SINKRON)
# -------------------------------------------------------------
svg_tanpa_udp = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 720" width="100%" height="100%" style="background-color:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b"/>
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626"/>
    </marker>
  </defs>

  <!-- Title Header -->
  <text x="340" y="32" text-anchor="middle" font-size="15" font-weight="bold" fill="#0f172a">Alur Pemrosesan Transaksi Konvensional Tanpa UDP (Synchronous Logging)</text>
  <text x="340" y="50" text-anchor="middle" font-size="11" fill="#64748b">Karakteristik: Serial, Monolitik, Blocking I/O, dan Connection Pool Contention</text>

  <!-- 1. START TERMINAL -->
  <rect x="230" y="75" width="220" height="38" rx="19" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
  <text x="340" y="99" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">([ MULAI ])</text>

  <!-- Arrow 1 -> 2 -->
  <path d="M 340 113 L 340 145" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 2. INPUT: Request HTTP -->
  <polygon points="210,145 470,145 450,190 190,190" fill="#f1f5f9" stroke="#475569" stroke-width="1.5"/>
  <text x="330" y="166" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0f172a">Terima Request HTTP Transaksi</text>
  <text x="330" y="181" text-anchor="middle" font-size="9" fill="#64748b">(POST /api/items dari Klien Scanner)</text>

  <!-- Arrow 2 -> 3 -->
  <path d="M 330 190 L 330 220" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 3. PROCESS: Eksekusi Bisnis -->
  <rect x="190" y="220" width="280" height="48" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="330" y="241" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">Eksekusi Logika Bisnis Mutasi Stok</text>
  <text x="330" y="256" text-anchor="middle" font-size="9" fill="#3b82f6">(Validasi payload, hitung kuantitas stok)</text>

  <!-- Arrow 3 -> 4 -->
  <path d="M 330 268 L 330 298" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 4. PROCESS: Kueri Stok DB -->
  <rect x="190" y="298" width="280" height="52" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="330" y="318" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">Kueri Update Stok ke Basis Data</text>
  <text x="330" y="334" text-anchor="middle" font-size="9" fill="#3b82f6">Ambil 1 slot pg.Pool (UPDATE items SET stock)</text>

  <!-- Arrow 4 -> 5 -->
  <path d="M 330 350 L 330 380" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 5. PROCESS: Tunggu Commit Stok -->
  <rect x="190" y="380" width="280" height="46" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="330" y="401" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#334155">Tunggu Commit Transaksi Stok</text>
  <text x="330" y="415" text-anchor="middle" font-size="9" fill="#64748b">Disk I/O PostgreSQL berhasil (~2-4 ms)</text>

  <!-- Arrow 5 -> 6 (ENTERING BOTTLENECK) -->
  <path d="M 330 426 L 330 460" fill="none" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow-red)"/>

  <!-- 6. PROCESS: BOTTLENECK SYNC LOGGING -->
  <rect x="160" y="460" width="340" height="65" rx="8" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="330" y="483" text-anchor="middle" font-size="11" font-weight="bold" fill="#b91c1c">⚠️ PENULISAN LOG AUDIT SINKRON</text>
  <text x="330" y="500" text-anchor="middle" font-size="9.5" fill="#7f1d1d">await db.telemetryLog.create() (Kueri INSERT)</text>
  <text x="330" y="515" text-anchor="middle" font-size="9" font-weight="bold" fill="#dc2626">⛔ Perebutan Slot Connection Pool &amp; Blocking I/O</text>

  <!-- Callout box explaining blocking -->
  <rect x="520" y="462" width="145" height="60" rx="6" fill="#fff1f2" stroke="#f43f5e" stroke-width="1.2"/>
  <text x="592" y="480" text-anchor="middle" font-size="9" font-weight="bold" fill="#9f1239">EVENT LOOP TERTAHAN</text>
  <text x="592" y="495" text-anchor="middle" font-size="8" fill="#881337">Thread utama Node.js</text>
  <text x="592" y="507" text-anchor="middle" font-size="8" fill="#881337">menunggu penulisan log</text>
  <text x="592" y="519" text-anchor="middle" font-size="8" fill="#881337">selesai ke harddisk</text>
  <path d="M 500 492 L 520 492" stroke="#f43f5e" stroke-width="1.2" stroke-dasharray="3 2"/>

  <!-- Arrow 6 -> 7 -->
  <path d="M 330 525 L 330 555" fill="none" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arrow-red)"/>

  <!-- 7. OUTPUT: Response Delayed -->
  <polygon points="180,555 500,555 480,600 160,600" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
  <text x="330" y="576" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#991b1b">Kirim Respon HTTP 200 OK ke Klien</text>
  <text x="330" y="591" text-anchor="middle" font-size="9" fill="#b91c1c">⚠️ Waktu Respon Tertunda Lama (~18 - 50 ms)</text>

  <!-- Arrow 7 -> 8 -->
  <path d="M 330 600 L 330 635" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 8. END TERMINAL -->
  <rect x="230" y="635" width="220" height="38" rx="19" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
  <text x="340" y="659" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">([ SELESAI ])</text>
</svg>"""

with open('docs/diagrams/flowchart_bab2_tanpa_udp.svg', 'w', encoding='utf-8') as f:
    f.write(svg_tanpa_udp)

# -----------------------------------------------------------------------------------------
# 2. FLOWCHART DENGAN UDP (DUAL-TRACK TELEMETRY LENGKAP DENGAN TRI-LAYER SELF-HEALING)
# -----------------------------------------------------------------------------------------
svg_dengan_udp = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 920" width="100%" height="100%" style="background-color:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b"/>
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#16a34a"/>
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#9333ea"/>
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706"/>
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626"/>
    </marker>
  </defs>

  <!-- Title Header -->
  <text x="490" y="32" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Alur Pemrosesan Transaksi dengan UDP (Dual-Track Telemetry &amp; Tri-Layer Self-Healing)</text>
  <text x="490" y="50" text-anchor="middle" font-size="11.5" fill="#64748b">Integrasi Jalur Transaksi Bisnis Kilat dan Jalur Telemetri Asinkron dengan Pemulihan Mandiri Berlapis (Zero-Loss)</text>

  <!-- 1. START TERMINAL -->
  <rect x="380" y="70" width="220" height="38" rx="19" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
  <text x="490" y="94" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">([ MULAI ])</text>

  <!-- Arrow 1 -> 2 -->
  <path d="M 490 108 L 490 138" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 2. INPUT: Request HTTP -->
  <polygon points="360,138 640,138 620,180 340,180" fill="#f1f5f9" stroke="#475569" stroke-width="1.5"/>
  <text x="490" y="157" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0f172a">Terima Request HTTP Transaksi</text>
  <text x="490" y="172" text-anchor="middle" font-size="9" fill="#64748b">(POST /api/items dari Klien Scanner)</text>

  <!-- Arrow 2 -> 3 -->
  <path d="M 490 180 L 490 208" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 3. PROCESS: Eksekusi Bisnis -->
  <rect x="350" y="208" width="280" height="44" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="490" y="227" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">Eksekusi Logika Bisnis Mutasi Stok</text>
  <text x="490" y="241" text-anchor="middle" font-size="8.5" fill="#3b82f6">Validasi payload dan kuantitas barang</text>

  <!-- Arrow 3 -> 4 -->
  <path d="M 490 252 L 490 278" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 4. PROCESS: Kueri Stok DB (Eksklusif Bisnis) -->
  <rect x="350" y="278" width="280" height="46" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="490" y="297" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">Kueri Update Stok ke Basis Data</text>
  <text x="490" y="312" text-anchor="middle" font-size="8.5" fill="#3b82f6">1 slot pg.Pool (UPDATE items SET stock) &amp; Commit</text>

  <!-- FORK / DECOUPLING SPLIT INTO 2 PATHWAYS -->
  <!-- Split bar -->
  <line x1="220" y1="345" x2="740" y2="345" stroke="#0f172a" stroke-width="3"/>
  <path d="M 490 324 L 490 345" stroke="#0f172a" stroke-width="2"/>

  <!-- ==================== LEFT BRANCH: JALUR 1 (TRANSAKSI BISNIS) ==================== -->
  <path d="M 220 345 L 220 375" fill="none" stroke="#16a34a" stroke-width="2" marker-end="url(#arrow-green)"/>
  <text x="220" y="365" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#16a34a">JALUR 1: TRANSAKSI BISNIS</text>

  <polygon points="90,375 350,375 330,422 70,422" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.8"/>
  <text x="210" y="396" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#14532d">Kirim Respon HTTP 200 OK</text>
  <text x="210" y="411" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#16a34a">⚡ Kilat (~2 ms) Tanpa Menunggu Log</text>

  <!-- Left End Terminal -->
  <path d="M 210 422 L 210 460" fill="none" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arrow-green)"/>
  <rect x="100" y="460" width="220" height="36" rx="18" fill="#14532d" stroke="#166534" stroke-width="1.5"/>
  <text x="210" y="483" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#ffffff">([ TRANSAKSI SELESAI ])</text>

  <!-- ==================== RIGHT BRANCH: JALUR 2 (TELEMETRI & TRI-LAYER) ==================== -->
  <path d="M 740 345 L 740 375" fill="none" stroke="#9333ea" stroke-width="2" marker-end="url(#arrow-purple)"/>
  <text x="740" y="365" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#7e22ce">JALUR 2: TELEMETRI UDP &amp; TRI-LAYER</text>

  <!-- Process: UDP Fire and forget -->
  <rect x="580" y="375" width="320" height="46" rx="6" fill="#faf5ff" stroke="#9333ea" stroke-width="1.5"/>
  <text x="740" y="394" text-anchor="middle" font-size="10" font-weight="bold" fill="#6b21a8">Pancarkan Datagram via Soket UDP (:5001)</text>
  <text x="740" y="409" text-anchor="middle" font-size="8.5" fill="#7e22ce">Fire-and-Forget + Payload Ringkas 2 Log Terakhir</text>

  <!-- Arrow to Aggregator -->
  <path d="M 740 421 L 740 445" fill="none" stroke="#9333ea" stroke-width="1.8" marker-end="url(#arrow-purple)"/>

  <!-- Process: Aggregator Received -->
  <rect x="580" y="445" width="320" height="40" rx="6" fill="#faf5ff" stroke="#c084fc" stroke-width="1.2"/>
  <text x="740" y="465" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#6b21a8">Diterima UDP Log Aggregator Daemon</text>
  <text x="740" y="478" text-anchor="middle" font-size="8.5" fill="#7e22ce">Periksa kontinuitas Sequence ID</text>

  <!-- Arrow to Decision 1: Gap Evaluation -->
  <path d="M 740 485 L 740 510" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- Decision: Gap check -->
  <polygon points="740,510 860,545 740,580 620,545" fill="#fefce8" stroke="#ca8a04" stroke-width="1.8"/>
  <text x="740" y="541" text-anchor="middle" font-size="10" font-weight="bold" fill="#854d0e">Apakah Ada Paket Hilang?</text>
  <text x="740" y="555" text-anchor="middle" font-size="8.5" fill="#a16207">(Cek Diskontinuitas seqId)</text>

  <!-- SUB-BRANCHES OF TRI-LAYER SELF-HEALING -->
  <!-- Branch 1: Normal (Gap = 0) -->
  <path d="M 860 545 L 910 545 L 910 755 L 780 755" fill="none" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arrow-green)"/>
  <text x="915" y="640" font-size="9" font-weight="bold" fill="#16a34a">Tidak Ada (Normal)</text>

  <!-- Branch 2: Minor Gap (Gap <= 2) -> LAYER 1 -->
  <path d="M 620 545 L 480 545 L 480 575" fill="none" stroke="#2563eb" stroke-width="1.8" marker-end="url(#arrow-blue)"/>
  <text x="545" y="538" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#2563eb">Gap &lt;= 2 Paket</text>

  <rect x="380" y="575" width="200" height="42" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="480" y="593" text-anchor="middle" font-size="9" font-weight="bold" fill="#1e40af">LAPISAN 1: PIGGYBACKING</text>
  <text x="480" y="607" text-anchor="middle" font-size="8" fill="#2563eb">Ekstrak dari payload duplikat (Zero-RTT)</text>
  <path d="M 480 617 L 480 755 L 600 755" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="3 2" marker-end="url(#arrow-blue)"/>

  <!-- Branch 3: Mayor Gap (Gap >= 3) -> LAYER 2 -->
  <path d="M 740 580 L 740 615" fill="none" stroke="#d97706" stroke-width="1.8" marker-end="url(#arrow-amber)"/>
  <text x="785" y="600" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#d97706">Gap &gt;= 3 Paket</text>

  <rect x="640" y="615" width="200" height="44" rx="4" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.2"/>
  <text x="740" y="633" text-anchor="middle" font-size="9" font-weight="bold" fill="#92400e">LAPISAN 2: NACK ARQ RAM</text>
  <text x="740" y="647" text-anchor="middle" font-size="8" fill="#b45309">Ambil ulang dari 3.000 RAM Ring Buffer</text>
  <path d="M 740 659 L 740 735" fill="none" stroke="#d97706" stroke-width="1.5" marker-end="url(#arrow-amber)"/>

  <!-- Branch 4: Critical Error 500 -> LAYER 3 -->
  <rect x="400" y="660" width="180" height="44" rx="4" fill="#fef2f2" stroke="#dc2626" stroke-width="1.2"/>
  <text x="490" y="678" text-anchor="middle" font-size="9" font-weight="bold" fill="#991b1b">LAPISAN 3: TCP FALLBACK</text>
  <text x="490" y="692" text-anchor="middle" font-size="8" fill="#b91c1c">Jalur darurat HTTP Ingest (Error 500)</text>
  <path d="M 490 704 L 490 755 L 600 755" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="3 2" marker-end="url(#arrow-red)"/>

  <!-- CONVERGENCE: SIMPAN KE BUFFER RAM -->
  <rect x="600" y="735" width="180" height="42" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.8"/>
  <text x="690" y="753" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#14532d">Simpan ke Buffer RAM</text>
  <text x="690" y="767" text-anchor="middle" font-size="8.5" fill="#166534">Data Utuh &amp; Urut (Zero-Loss)</text>

  <!-- Arrow to Bulk Flush -->
  <path d="M 690 777 L 690 802" fill="none" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arrow-green)"/>

  <!-- Bulk Insert -->
  <rect x="560" y="802" width="260" height="44" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
  <text x="690" y="821" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#15803d">Bulk INSERT Terjadwal ke PostgreSQL</text>
  <text x="690" y="835" text-anchor="middle" font-size="8" fill="#166534">Tiap 2 detik / 100 log (Koneksi Terpisah)</text>

  <!-- Right End Terminal -->
  <path d="M 690 846 L 690 870" fill="none" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arrow-green)"/>
  <rect x="590" y="870" width="200" height="32" rx="16" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
  <text x="690" y="891" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">([ LOG TERARSIP ])</text>
</svg>"""

with open('docs/diagrams/flowchart_bab2_dengan_udp.svg', 'w', encoding='utf-8') as f:
    f.write(svg_dengan_udp)

print("BAB II Flowcharts updated with Tri-Layer Self-Healing successfully!")
