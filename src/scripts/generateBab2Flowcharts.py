"""
Script to generate standalone high-resolution SVG flowcharts for BAB II:
- flowchart_bab2_tanpa_udp.svg: Alur Pemrosesan Transaksi Tanpa UDP (Synchronous Logging)
- flowchart_bab2_dengan_udp.svg: Alur Pemrosesan Transaksi Dengan UDP (Dual-Track Telemetry)
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

# -------------------------------------------------------------
# 2. FLOWCHART DENGAN UDP (DUAL-TRACK TELEMETRY)
# -------------------------------------------------------------
svg_dengan_udp = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 720" width="100%" height="100%" style="background-color:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
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
  </defs>

  <!-- Title Header -->
  <text x="430" y="32" text-anchor="middle" font-size="15" font-weight="bold" fill="#0f172a">Alur Pemrosesan Transaksi dengan UDP (Dual-Track Telemetry Asinkron)</text>
  <text x="430" y="50" text-anchor="middle" font-size="11" fill="#64748b">Karakteristik: Decoupled, Non-Blocking, Respon Kilat ke Klien, dan Bulk Logging Terjadwal</text>

  <!-- 1. START TERMINAL -->
  <rect x="320" y="75" width="220" height="38" rx="19" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
  <text x="430" y="99" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">([ MULAI ])</text>

  <!-- Arrow 1 -> 2 -->
  <path d="M 430 113 L 430 145" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 2. INPUT: Request HTTP -->
  <polygon points="300,145 580,145 560,190 280,190" fill="#f1f5f9" stroke="#475569" stroke-width="1.5"/>
  <text x="430" y="166" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0f172a">Terima Request HTTP Transaksi</text>
  <text x="430" y="181" text-anchor="middle" font-size="9" fill="#64748b">(POST /api/items dari Klien Scanner)</text>

  <!-- Arrow 2 -> 3 -->
  <path d="M 430 190 L 430 220" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 3. PROCESS: Eksekusi Bisnis -->
  <rect x="290" y="220" width="280" height="48" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="430" y="241" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">Eksekusi Logika Bisnis Mutasi Stok</text>
  <text x="430" y="256" text-anchor="middle" font-size="9" fill="#3b82f6">(Validasi payload, hitung kuantitas stok)</text>

  <!-- Arrow 3 -> 4 -->
  <path d="M 430 268 L 430 298" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 4. PROCESS: Kueri Stok DB (Eksklusif) -->
  <rect x="290" y="298" width="280" height="52" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="430" y="318" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">Kueri Update Stok ke Basis Data</text>
  <text x="430" y="334" text-anchor="middle" font-size="9" fill="#3b82f6">Ambil 1 slot pg.Pool (Eksklusif Bisnis)</text>

  <!-- Arrow 4 -> 5 -->
  <path d="M 430 350 L 430 380" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- 5. PROCESS: Commit Berhasil -->
  <rect x="290" y="380" width="280" height="44" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="430" y="400" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#334155">Commit Transaksi Stok Berhasil</text>
  <text x="430" y="414" text-anchor="middle" font-size="9" fill="#64748b">Slot koneksi basis data langsung dilepas</text>

  <!-- FORK / DECOUPLING SPLIT INTO 2 PATHWAYS -->
  <!-- Split bar -->
  <line x1="220" y1="440" x2="640" y2="440" stroke="#0f172a" stroke-width="3"/>
  <path d="M 430 424 L 430 440" stroke="#0f172a" stroke-width="2"/>

  <!-- LEFT BRANCH: TRACK 1 - RESPON KLIEN -->
  <path d="M 220 440 L 220 475" fill="none" stroke="#16a34a" stroke-width="2" marker-end="url(#arrow-green)"/>
  <text x="220" y="460" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#16a34a">JALUR 1: TRANSAKSI BISNIS</text>

  <polygon points="90,475 350,475 330,520 70,520" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.8"/>
  <text x="210" y="496" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#14532d">Kirim Respon HTTP 200 OK</text>
  <text x="210" y="511" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#16a34a">⚡ Kilat (~2 ms) Tanpa Menunggu Log</text>

  <!-- Left End Terminal -->
  <path d="M 210 520 L 210 560" fill="none" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arrow-green)"/>
  <rect x="110" y="560" width="200" height="36" rx="18" fill="#14532d" stroke="#166534" stroke-width="1.5"/>
  <text x="210" y="583" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#ffffff">([ TRANSAKSI SELESAI ])</text>

  <!-- RIGHT BRANCH: TRACK 2 - TELEMETRI UDP -->
  <path d="M 640 440 L 640 475" fill="none" stroke="#9333ea" stroke-width="2" marker-end="url(#arrow-purple)"/>
  <text x="640" y="460" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#7e22ce">JALUR 2: TELEMETRI UDP</text>

  <!-- Process: UDP Fire and forget -->
  <rect x="500" y="475" width="280" height="48" rx="6" fill="#faf5ff" stroke="#9333ea" stroke-width="1.5"/>
  <text x="640" y="495" text-anchor="middle" font-size="10" font-weight="bold" fill="#6b21a8">Pancarkan Datagram via Soket UDP</text>
  <text x="640" y="510" text-anchor="middle" font-size="8.5" fill="#7e22ce">Fire-and-Forget ke Port 5001 (~0.2 ms)</text>

  <!-- Arrow to Aggregator -->
  <path d="M 640 523 L 640 545" fill="none" stroke="#9333ea" stroke-width="1.8" marker-end="url(#arrow-purple)"/>

  <!-- Process: Aggregator Buffer in RAM -->
  <rect x="500" y="545" width="280" height="44" rx="6" fill="#faf5ff" stroke="#c084fc" stroke-width="1.2"/>
  <text x="640" y="564" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#6b21a8">Diterima UDP Log Aggregator</text>
  <text x="640" y="578" text-anchor="middle" font-size="8.5" fill="#7e22ce">Deteksi Gap &amp; Simpan ke Buffer RAM</text>

  <!-- Arrow to Bulk Flush -->
  <path d="M 640 589 L 640 612" fill="none" stroke="#9333ea" stroke-width="1.8" marker-end="url(#arrow-purple)"/>

  <!-- Process: Bulk Insert -->
  <rect x="500" y="612" width="280" height="44" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
  <text x="640" y="630" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#15803d">Bulk INSERT Terjadwal ke PostgreSQL</text>
  <text x="640" y="644" text-anchor="middle" font-size="8.5" fill="#166534">Tiap 2 detik / 100 log (Koneksi Terpisah)</text>

  <!-- Right End Terminal -->
  <path d="M 640 656 L 640 675" fill="none" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arrow-green)"/>
  <rect x="540" y="675" width="200" height="32" rx="16" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
  <text x="640" y="696" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">([ LOG TERARSIP ])</text>
</svg>"""

with open('docs/diagrams/flowchart_bab2_tanpa_udp.svg', 'w', encoding='utf-8') as f:
    f.write(svg_tanpa_udp)

print("Both BAB II Flowcharts generated successfully!")
