"""
Script to generate standalone high-resolution SVG diagram files for BAB III:
- Diagram 3.2: Arsitektur Baseline (Konvensional Synchronous Monolithic Logging)
- Diagram 3.3: Arsitektur Usulan (Dual-Track Telemetry berbasis UDP Sockets)
- Diagram 3.4: Diagram Alir Logika Tri-Layer Self-Healing
"""
import os

os.makedirs('docs/diagrams', exist_ok=True)

# 1. DIAGRAM 3.2: BASELINE SYNCHRONOUS
svg_3_2 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620" width="100%" height="100%" style="background-color:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b"/>
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626"/>
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb"/>
    </marker>
  </defs>

  <!-- Title Header -->
  <text x="480" y="32" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Gambar 3.2 Arsitektur Baseline (Konvensional Synchronous Monolithic Logging)</text>
  <text x="480" y="52" text-anchor="middle" font-size="11.5" fill="#64748b">Bottleneck: Transaksi bisnis tertahan oleh proses penulisan log audit sinkron pada connection pool yang sama</text>

  <!-- Node 1: Client Scanner -->
  <rect x="370" y="80" width="220" height="75" rx="8" fill="#f8fafc" stroke="#334155" stroke-width="1.8"/>
  <rect x="370" y="80" width="220" height="24" rx="8" fill="#334155"/>
  <text x="480" y="97" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">1. Klien Pengguna Gudang</text>
  <text x="480" y="122" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">Barcode Scanner / Web WMS</text>
  <text x="480" y="139" text-anchor="middle" font-size="10" fill="#64748b">Protokol: HTTP/TCP (Port 5000)</text>

  <!-- Node 2: Node.js Backend Container -->
  <rect x="270" y="200" width="420" height="170" rx="10" fill="#f8fafc" stroke="#64748b" stroke-width="1.8" stroke-dasharray="6 4"/>
  <text x="290" y="222" font-size="12" font-weight="bold" fill="#334155">2. Backend Server (Node.js Express API)</text>

  <!-- Sub-block 2A: Business Handler -->
  <rect x="290" y="238" width="180" height="115" rx="6" fill="#ffffff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="380" y="260" text-anchor="middle" font-size="11" font-weight="bold" fill="#1d4ed8">Handler Transaksi Bisnis</text>
  <text x="380" y="278" text-anchor="middle" font-size="10" fill="#475569">(Inbound / Outbound)</text>
  <line x1="300" y1="288" x2="460" y2="288" stroke="#e2e8f0" stroke-width="1"/>
  <text x="380" y="310" text-anchor="middle" font-size="9.5" fill="#dc2626">⛔ Menunggu penulisan</text>
  <text x="380" y="325" text-anchor="middle" font-size="9.5" fill="#dc2626">log audit selesai</text>

  <!-- Sub-block 2B: Sync Logger -->
  <rect x="490" y="238" width="180" height="115" rx="6" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
  <text x="580" y="260" text-anchor="middle" font-size="11" font-weight="bold" fill="#b91c1c">Logging Sinkron (AWAIT)</text>
  <text x="580" y="278" text-anchor="middle" font-size="10" fill="#7f1d1d">await db.telemetryLog.create()</text>
  <line x1="500" y1="288" x2="660" y2="288" stroke="#fecaca" stroke-width="1"/>
  <text x="580" y="310" text-anchor="middle" font-size="9.5" fill="#991b1b">⚠️ Menahan Event Loop</text>
  <text x="580" y="325" text-anchor="middle" font-size="9.5" fill="#991b1b">dan alur respon klien</text>

  <!-- Arrow Client -> Express -->
  <path d="M 480 155 L 480 200" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>
  <text x="490" y="180" font-size="10" font-weight="bold" fill="#1e293b">1. Request Transaksi</text>

  <!-- Arrow Express -> Client (Delayed Response) -->
  <path d="M 340 238 C 340 180 375 168 405 160" fill="none" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="4 3" marker-end="url(#arrow-red)"/>
  <text x="245" y="175" font-size="10" font-weight="bold" fill="#dc2626">4. Respon 200 OK Tertunda (~18-50ms)</text>

  <!-- Internal Arrow in Node.js -->
  <path d="M 470 295 L 490 295" fill="none" stroke="#dc2626" stroke-width="1.5" marker-end="url(#arrow-red)"/>

  <!-- Node 3: Shared Connection Pool -->
  <rect x="320" y="415" width="320" height="68" rx="8" fill="#fffbeb" stroke="#d97706" stroke-width="1.8"/>
  <text x="480" y="437" text-anchor="middle" font-size="11" font-weight="bold" fill="#92400e">3. Shared Connection Pool (pg.Pool)</text>
  <text x="480" y="454" text-anchor="middle" font-size="10" fill="#b45309">Kapasitas Terbatas: Maksimum 10 Koneksi Bersama</text>
  <text x="480" y="470" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#dc2626">⚠️ Titik Perebutan Slot (Connection Contention &amp; Exhaustion)</text>

  <!-- Arrows from Express to Connection Pool -->
  <path d="M 380 353 L 380 415" fill="none" stroke="#2563eb" stroke-width="1.8" marker-end="url(#arrow-blue)"/>
  <text x="315" y="388" font-size="9.5" font-weight="bold" fill="#2563eb">2A. Kueri Stok</text>

  <path d="M 580 353 L 580 415" fill="none" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arrow-red)"/>
  <text x="590" y="388" font-size="9.5" font-weight="bold" fill="#dc2626">2B. Kueri Log Audit</text>

  <!-- Node 4: PostgreSQL Database -->
  <rect x="290" y="520" width="380" height="75" rx="8" fill="#f8fafc" stroke="#0284c7" stroke-width="1.8"/>
  <rect x="290" y="520" width="380" height="24" rx="8" fill="#0284c7"/>
  <text x="480" y="537" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">4. Basis Data PostgreSQL (:5432) - Harddisk I/O</text>

  <rect x="310" y="552" width="160" height="32" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>
  <text x="390" y="572" text-anchor="middle" font-size="10" font-weight="bold" fill="#334155">Tabel Bisnis (items)</text>

  <rect x="490" y="552" width="160" height="32" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>
  <text x="570" y="572" text-anchor="middle" font-size="10" font-weight="bold" fill="#334155">Tabel telemetry_logs</text>

  <!-- Arrows Pool -> Database -->
  <path d="M 400 483 L 390 520" fill="none" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow-blue)"/>
  <path d="M 560 483 L 570 520" fill="none" stroke="#dc2626" stroke-width="1.5" marker-end="url(#arrow-red)"/>

  <!-- Left Callout: Dampak Masalah -->
  <rect x="20" y="240" width="220" height="205" rx="6" fill="#fff1f2" stroke="#f43f5e" stroke-width="1.2"/>
  <text x="130" y="262" text-anchor="middle" font-size=\"11\" font-weight="bold" fill="#9f1239">⚠️ IDENTIFIKASI MASALAH</text>
  <line x1="30" y1="270" x2="230" y2="270" stroke="#fecdd3" stroke-width="1"/>
  
  <text x="30" y="288" font-size="9.5" font-weight="bold" fill="#881337">1. Connection Contention:</text>
  <text x="30" y="303" font-size="9" fill="#9f1239">Kueri log berebut slot koneksi</text>
  <text x="30" y="316" font-size="9" fill="#9f1239">dengan kueri transaksi barang.</text>

  <text x="30" y="338" font-size="9.5" font-weight="bold" fill="#881337">2. Pool Exhaustion:</text>
  <text x="30" y="353" font-size="9" fill="#9f1239">10 koneksi cepat habis saat</text>
  <text x="30" y="366" font-size="9" fill="#9f1239">terjadi lonjakan transaksi.</text>

  <text x="30" y="388" font-size="9.5" font-weight="bold" fill="#881337">3. Latensi Membengkak:</text>
  <text x="30" y="403" font-size="9" fill="#9f1239">Scanner menunggu kueri log</text>
  <text x="30" y="416" font-size="9" fill="#9f1239">selesai ditulis ke piringan disk.</text>

  <!-- Right Callout: Karakteristik -->
  <rect x="720" y="240" width="220" height="205" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2"/>
  <text x="830" y="262" text-anchor="middle" font-size="11" font-weight="bold" fill="#334155">📊 KARAKTERISTIK BASELINE</text>
  <line x1="730" y1="270" x2="930" y2="270" stroke="#e2e8f0" stroke-width="1"/>
  
  <text x="730" y="290" font-size="9.5" font-weight="bold" fill="#1e293b">• Eksekusi: Serial / Sinkron</text>
  <text x="730" y="305" font-size="9" fill="#64748b">Thread menunggu I/O disk.</text>

  <text x="730" y="330" font-size="9.5" font-weight="bold" fill="#1e293b">• Throughput: Rendah (~540 req/s)</text>
  <text x="730" y="345" font-size="9" fill="#64748b">Drop hingga -84.5% saat beban.</text>

  <text x="730" y="370" font-size="9.5" font-weight="bold" fill="#1e293b">• P99 Latency: ~18-50 ms</text>
  <text x="730" y="385" font-size="9" fill="#64748b">Operator gudang mengalami jeda.</text>

  <text x="730" y="410" font-size="9.5" font-weight="bold" fill="#1e293b">• Ketahanan: Rawan Cascading</text>
  <text x="730" y="425" font-size="9" fill="#64748b">Tabel log macet = transaksi mati.</text>
</svg>"""

with open('docs/diagrams/diagram_3_2_baseline.svg', 'w', encoding='utf-8') as f:
    f.write(svg_3_2)

# 2. DIAGRAM 3.3: DUAL-TRACK ARCHITECTURE (USULAN)
svg_3_3 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 640" width="100%" height="100%" style="background-color:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
  <defs>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#16a34a"/>
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#9333ea"/>
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706"/>
    </marker>
  </defs>

  <!-- Title Header -->
  <text x="500" y="32" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Gambar 3.3 Arsitektur Usulan (Dual-Track Telemetry berbasis UDP Sockets)</text>
  <text x="500" y="52" text-anchor="middle" font-size="11.5" fill="#64748b">Pemisahan Aliran Data: Transaksi Bisnis (HTTP/TCP Strict ACID) dan Telemetri Asinkron (UDP Fire-and-Forget)</text>

  <!-- Node 1: Client Scanner -->
  <rect x="40" y="235" width="200" height="90" rx="8" fill="#f8fafc" stroke="#334155" stroke-width="1.8"/>
  <rect x="40" y="235" width="200" height="24" rx="8" fill="#334155"/>
  <text x="140" y="252" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">1. Klien Pengguna Gudang</text>
  <text x="140" y="278" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">Barcode Scanner / Web</text>
  <text x="140" y="295" text-anchor="middle" font-size="9.5" fill="#64748b">IP: 192.168.1.50</text>
  <text x="140" y="312" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#16a34a">⚡ Respon Kilat: 2.1 ms</text>

  <!-- Arrow Client -> Express -->
  <path d="M 240 265 L 340 265" fill="none" stroke="#2563eb" stroke-width="2" marker-end="url(#arrow-blue)"/>
  <text x="290" y="255" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#2563eb">1. POST /items</text>

  <!-- Arrow Express -> Client (Fast 200 OK) -->
  <path d="M 340 295 L 240 295" fill="none" stroke="#16a34a" stroke-width="2.5" marker-end="url(#arrow-green)"/>
  <text x="290" y="315" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#16a34a">⚡ 200 OK (2.1ms)</text>

  <!-- Main Container: Node.js Core API -->
  <rect x="340" y="160" width="280" height="240" rx="10" fill="#f8fafc" stroke="#2563eb" stroke-width="2"/>
  <rect x="340" y="160" width="280" height="28" rx="10" fill="#2563eb"/>
  <text x="480" y="179" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#ffffff">Node.js Express API Core (:5000)</text>

  <rect x="360" y="205" width="240" height="55" rx="6" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.2"/>
  <text x="480" y="226" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e40af">Handler Transaksi Bisnis</text>
  <text x="480" y="244" text-anchor="middle" font-size="9.5" fill="#3b82f6">Kueri Mutasi Stok (Strict ACID)</text>

  <rect x="360" y="275" width="240" height="55" rx="6" fill="#f5f3ff" stroke="#c4b5fd" stroke-width="1.2"/>
  <text x="480" y="296" text-anchor="middle" font-size="11" font-weight="bold" fill="#6b21a8">Telemetry Middleware (dgram)</text>
  <text x="480" y="314" text-anchor="middle" font-size="9.5" fill="#7c3aed">socket.send() Fire-and-Forget (~0.2ms)</text>

  <rect x="360" y="345" width="240" height="40" rx="6" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>
  <text x="480" y="369" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#475569">RAM Ring Buffer (Kapasitas: 3.000 log)</text>

  <!-- TRACK 1: Database Business Transaction -->
  <path d="M 620 230 L 760 230" fill="none" stroke="#2563eb" stroke-width="2" marker-end="url(#arrow-blue)"/>
  <text x="690" y="220" text-anchor="middle" font-size="10" font-weight="bold" fill="#2563eb">TRACK 1: HTTP/TCP</text>
  <text x="690" y="245" text-anchor="middle" font-size="9" fill="#1e40af">pg.Pool (1 slot)</text>

  <!-- Database Node (Right) -->
  <rect x="760" y="180" width="200" height="230" rx="8" fill="#f8fafc" stroke="#0284c7" stroke-width="1.8"/>
  <rect x="760" y="180" width="200" height="26" rx="8" fill="#0284c7"/>
  <text x="860" y="198" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">PostgreSQL (:5432)</text>

  <rect x="775" y="220" width="170" height="50" rx="4" fill="#eff6ff" stroke="#93c5fd" stroke-width="1.2"/>
  <text x="860" y="242" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">Tabel items (Bisnis)</text>
  <text x="860" y="258" text-anchor="middle" font-size="9" fill="#2563eb">Konsistensi Stok Terjamin</text>

  <rect x="775" y="330" width="170" height="55" rx="4" fill="#f0fdf4" stroke="#86efac" stroke-width="1.2"/>
  <text x="860" y="352" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#166534">Tabel telemetry_logs</text>
  <text x="860" y="368" text-anchor="middle" font-size="9" fill="#15803d">Bulk Insert (100 log/2s)</text>

  <!-- TRACK 2: UDP Telemetry Upwards -->
  <path d="M 480 160 L 480 100" fill="none" stroke="#9333ea" stroke-width="2.5" marker-end="url(#arrow-purple)"/>
  <text x="490" y="130" font-size="10" font-weight="bold" fill="#9333ea">TRACK 2: UDP Datagram :5001 (~0.2ms)</text>

  <!-- UDP Aggregator Node (Top) -->
  <rect x="340" y="420" width="280" height="150" rx="8" fill="#faf5ff" stroke="#9333ea" stroke-width="2"/>
  <rect x="340" y="420" width="280" height="26" rx="8" fill="#9333ea"/>
  <text x="480" y="438" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#ffffff">UDP Log Aggregator Daemon (:5001)</text>

  <rect x="360" y="458" width="240" height="42" rx="4" fill="#ffffff" stroke="#c4b5fd" stroke-width="1.2"/>
  <text x="480" y="476" text-anchor="middle" font-size="10" font-weight="bold" fill="#6b21a8">Double Buffering di RAM</text>
  <text x="480" y="492" text-anchor="middle" font-size="9" fill="#7c3aed">Ambang Flush: 100 log / 2.000 ms</text>

  <rect x="360" y="510" width="240" height="42" rx="4" fill="#ffffff" stroke="#c4b5fd" stroke-width="1.2"/>
  <text x="480" y="528" text-anchor="middle" font-size="10" font-weight="bold" fill="#6b21a8">Sequence Tracker &amp; NACK Engine</text>
  <text x="480" y="544" text-anchor="middle" font-size="9" fill="#7c3aed">Deteksi Gap urutan log secara realtime</text>

  <!-- Bulk Insert Path from Aggregator to DB -->
  <path d="M 620 500 C 720 500 740 400 760 360" fill="none" stroke="#16a34a" stroke-width="2.2" marker-end="url(#arrow-green)"/>
  <text x="710" y="480" text-anchor="middle" font-size="10" font-weight="bold" fill="#16a34a">Bulk INSERT (Koneksi Terpisah)</text>
  <text x="710" y="495" text-anchor="middle" font-size="8.5" fill="#15803d">Zero Pool Contention</text>

  <!-- RETRANSMISSION ARQ LOOP (Curved Path) -->
  <path d="M 340 520 C 260 520 260 370 340 370" fill="none" stroke="#d97706" stroke-width="2" stroke-dasharray="4 3" marker-end="url(#arrow-amber)"/>
  <text x="210" y="445" text-anchor="middle" font-size="10" font-weight="bold" fill="#d97706">JALUR MELENGKUNG ARQ</text>
  <text x="210" y="460" text-anchor="middle" font-size="8.5" fill="#b45309">TCP NACK /telemetry-resend</text>
  <text x="210" y="475" text-anchor="middle" font-size="8.5" fill="#b45309">Ambil paket hilang dari RAM</text>
</svg>"""

with open('docs/diagrams/diagram_3_3_dual_track.svg', 'w', encoding='utf-8') as f:
    f.write(svg_3_3)

# 3. DIAGRAM 3.4: LOGIKA TRI-LAYER SELF-HEALING (FLOWCHART)
svg_3_4 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 720" width="100%" height="100%" style="background-color:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b"/>
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#16a34a"/>
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#dc2626"/>
    </marker>
  </defs>

  <!-- Title Header -->
  <text x="460" y="32" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Gambar 3.4 Diagram Alir Logika Tri-Layer Self-Healing</text>
  <text x="460" y="52" text-anchor="middle" font-size="11.5" fill="#64748b">Mekanisme Bertingkat untuk Menjamin Keandalan Pengiriman Log UDP (Zero-Loss 100%)</text>

  <!-- Start Node -->
  <rect x="340" y="80" width="240" height="45" rx="22" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.8"/>
  <text x="460" y="107" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#1d4ed8">Datagram UDP Tiba di Port 5001</text>

  <!-- Arrow 1 -->
  <path d="M 460 125 L 460 160" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- Decision 1: Sequence Check -->
  <polygon points="460,160 590,205 460,250 330,205" fill="#fffbeb" stroke="#d97706" stroke-width="1.8"/>
  <text x="460" y="200" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#92400e">Apakah seqId ==</text>
  <text x="460" y="215" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#92400e">lastSeqId + 1 ?</text>

  <!-- Normal Path (Right -> Down) -->
  <path d="M 590 205 L 750 205 L 750 490 L 590 490" fill="none" stroke="#16a34a" stroke-width="2" marker-end="url(#arrow-green)"/>
  <text x="650" y="195" font-size="10.5" font-weight="bold" fill="#16a34a">Ya (Urutan Normal)</text>

  <!-- Gap Detected Path (Down) -->
  <path d="M 460 250 L 460 290" fill="none" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow-red)"/>
  <text x="470" y="275" font-size="10.5" font-weight="bold" fill="#dc2626">Tidak (Gap Terdeteksi!)</text>

  <!-- Step: Calculate Gap -->
  <rect x="330" y="290" width="260" height="45" rx="6" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/>
  <text x="460" y="310" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#b91c1c">Hitung Celah Paket Hilang</text>
  <text x="460" y="325" text-anchor="middle" font-size="9.5" fill="#7f1d1d">gap = incomingSeq - (lastSeqId + 1)</text>

  <!-- Arrow -->
  <path d="M 460 335 L 460 365" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- Decision 2: Gap Size Branch -->
  <polygon points="460,365 590,410 460,455 330,410" fill="#fdf4ff" stroke="#a855f7" stroke-width="1.8"/>
  <text x="460" y="405" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#7e22ce">Berapa Besar</text>
  <text x="460" y="420" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#7e22ce">Nilai Gap?</text>

  <!-- Branch Left: Minor Gap (Piggybacking) -->
  <path d="M 330 410 L 190 410 L 190 460" fill="none" stroke="#7e22ce" stroke-width="1.8" marker-end="url(#arrow)"/>
  <text x="240" y="400" text-anchor="middle" font-size="10" font-weight="bold" fill="#7e22ce">gap &lt;= 2 (Minor)</text>

  <rect x="70" y="460" width="240" height="65" rx="6" fill="#faf5ff" stroke="#c084fc" stroke-width="1.5"/>
  <text x="190" y="482" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#6b21a8">LAPISAN 1: PIGGYBACKING</text>
  <text x="190" y="498" text-anchor="middle" font-size="9" fill="#581c87">Ekstrak paket hilang langsung dari</text>
  <text x="190" y="512" text-anchor="middle" font-size="9" fill="#581c87">payload paket saat ini (Zero-RTT)</text>

  <!-- Branch Down: Major Gap (NACK ARQ) -->
  <path d="M 460 455 L 460 520" fill="none" stroke="#7e22ce" stroke-width="1.8" marker-end="url(#arrow)"/>
  <text x="470" y="480" font-size="10" font-weight="bold" fill="#7e22ce">gap &gt; 2 (Mayor)</text>

  <rect x="340" y="520" width="240" height="75" rx="6" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="460" y="542" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#92400e">LAPISAN 2: TCP NACK ARQ</text>
  <text x="460" y="558" text-anchor="middle" font-size="9" fill="#78350f">Tembak POST /telemetry-resend</text>
  <text x="460" y="572" text-anchor="middle" font-size="9" fill="#78350f">Ambil paket hilang dari 3.000 log</text>
  <text x="460" y="586" text-anchor="middle" font-size="9" fill="#78350f">Circular Ring Buffer di RAM pengirim</text>

  <!-- Converge to Buffer Node -->
  <path d="M 190 525 L 190 560 L 340 560" fill="none" stroke="#1e293b" stroke-width="1.5"/>
  <path d="M 460 595 L 460 620" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- Buffer & Bulk Insert Node -->
  <rect x="320" y="620" width="280" height="75" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="460" y="642" text-anchor="middle" font-size="11" font-weight="bold" fill="#15803d">Akumulasi Double Buffering di RAM</text>
  <text x="460" y="660" text-anchor="middle" font-size="9.5" fill="#166534">Ambang Tercapai: 100 Log ATAU 2 Detik</text>
  <line x1="330" y1="668" x2="590" y2="668" stroke="#86efac" stroke-width="1"/>
  <text x="460" y="684" text-anchor="middle" font-size="10" font-weight="bold" fill="#15803d">⚡ Bulk INSERT ke PostgreSQL (Zero-Loss 100%)</text>
</svg>"""

with open('docs/diagrams/diagram_3_4_self_healing.svg', 'w', encoding='utf-8') as f:
    f.write(svg_3_4)

print('All 3 diagram SVG files generated successfully in docs/diagrams/ !')
