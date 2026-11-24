"""
Script to generate standalone high-resolution SVG diagram files for BAB III:
- Diagram 3.2: Sequence Diagram Arsitektur Baseline (Synchronous Blocking)
- Diagram 3.3: Sequence Diagram Arsitektur Usulan (Dual-Track Telemetry Decoupled)
- Diagram 3.4: Diagram Alir Logika Tri-Layer Self-Healing (Baku: Mulai -> Keputusan -> Selesai)
"""
import os

os.makedirs('docs/diagrams', exist_ok=True)

# -------------------------------------------------------------
# 1. DIAGRAM 3.2: SEQUENCE DIAGRAM ARSITEKTUR BASELINE
# -------------------------------------------------------------
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

  <!-- Header -->
  <text x="480" y="32" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Gambar 3.2 Diagram Sequence Arsitektur Baseline (Synchronous Blocking)</text>
  <text x="480" y="52" text-anchor="middle" font-size="11.5" fill="#64748b">Alur Sekuensial Sinkron: Klien menunggu transaksi stok DAN penulisan log audit selesai ke disk basis data</text>

  <!-- Lifeline Headers (Boxes) -->
  <!-- 1. Client -->
  <rect x="60" y="80" width="160" height="44" rx="6" fill="#f1f5f9" stroke="#334155" stroke-width="1.5"/>
  <text x="140" y="100" text-anchor="middle" font-size="11" font-weight="bold" fill="#0f172a">Klien Scanner (WMS)</text>
  <text x="140" y="115" text-anchor="middle" font-size="9.5" fill="#64748b">Pengguna / Autocannon</text>
  <line x1="140" y1="124" x2="140" y2="570" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>

  <!-- 2. Express Backend -->
  <rect x="300" y="80" width="180" height="44" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="390" y="100" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e40af">Node.js Express (:5000)</text>
  <text x="390" y="115" text-anchor="middle" font-size="9.5" fill="#3b82f6">Main Thread (Event Loop)</text>
  <line x1="390" y1="124" x2="390" y2="570" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>

  <!-- 3. Connection Pool -->
  <rect x="560" y="80" width="160" height="44" rx="6" fill="#fffbeb" stroke="#d97706" stroke-width="1.5"/>
  <text x="640" y="100" text-anchor="middle" font-size="11" font-weight="bold" fill="#92400e">pg.Pool (Maks 10)</text>
  <text x="640" y="115" text-anchor="middle" font-size="9.5" fill="#b45309">Shared Connection</text>
  <line x1="640" y1="124" x2="640" y2="570" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>

  <!-- 4. PostgreSQL Database -->
  <rect x="780" y="80" width="140" height="44" rx="6" fill="#f8fafc" stroke="#0284c7" stroke-width="1.5"/>
  <text x="850" y="100" text-anchor="middle" font-size="11" font-weight="bold" fill="#0369a1">PostgreSQL (:5432)</text>
  <text x="850" y="115" text-anchor="middle" font-size="9.5" fill="#0284c7">Disk Storage</text>
  <line x1="850" y1="124" x2="850" y2="570" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>

  <!-- Activation Bars -->
  <!-- Express Active Bar (Waiting the whole time) -->
  <rect x="384" y="150" width="12" height="370" fill="#bfdbfe" stroke="#2563eb" stroke-width="1"/>
  <!-- Pool Active Bar -->
  <rect x="634" y="180" width="12" height="110" fill="#fde68a" stroke="#d97706" stroke-width="1"/>
  <rect x="634" y="340" width="12" height="120" fill="#fecaca" stroke="#dc2626" stroke-width="1"/>

  <!-- STEP 1: HTTP Request -->
  <path d="M 140 150 L 384 150" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>
  <text x="250" y="142" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a">1. HTTP POST /api/items (Mutasi Stok)</text>

  <!-- Note 1: Transaksi Bisnis -->
  <rect x="396" y="165" width="220" height="24" rx="4" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="506" y="181" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#1e40af">FASE 1: Kueri Transaksi Bisnis</text>

  <!-- STEP 2: Express -> Pool -->
  <path d="M 396 200 L 634 200" fill="none" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow-blue)"/>
  <text x="510" y="195" text-anchor="middle" font-size="9" font-weight="bold" fill="#2563eb">2. Ambil 1 Slot Koneksi Bisnis</text>

  <!-- STEP 3: Pool -> DB -->
  <path d="M 646 225 L 850 225" fill="none" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow-blue)"/>
  <text x="745" y="218" text-anchor="middle" font-size="9" fill="#1e40af">3. UPDATE items SET stock</text>

  <!-- STEP 4: DB -> Pool -->
  <path d="M 850 260 L 646 260" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow-blue)"/>
  <text x="745" y="253" text-anchor="middle" font-size="9" fill="#1e40af">4. Commit Berhasil</text>

  <!-- STEP 5: Pool -> Express -->
  <path d="M 634 285 L 396 285" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow-blue)"/>
  <text x="510" y="278" text-anchor="middle" font-size="9" fill="#2563eb">5. Koneksi Bisnis Dilepas</text>

  <!-- Note 2: BOTTLENECK BLOCKING -->
  <rect x="396" y="315" width="235" height="26" rx="4" fill="#fef2f2" stroke="#fca5a5" stroke-width="1"/>
  <text x="513" y="332" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#b91c1c">⚠️ FASE 2: BOTTLENECK LOGGING SINKRON</text>

  <!-- STEP 6: Express -> Pool (Audit Log) -->
  <path d="M 396 360 L 634 360" fill="none" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arrow-red)"/>
  <text x="510" y="353" text-anchor="middle" font-size="9" font-weight="bold" fill="#dc2626">6. Ambil Koneksi Lagi (Berebut Pool)</text>

  <!-- Blocking Callout Box -->
  <rect x="230" y="375" width="145" height="60" rx="6" fill="#fff1f2" stroke="#f43f5e" stroke-width="1"/>
  <text x="302" y="393" text-anchor="middle" font-size="9" font-weight="bold" fill="#9f1239">⛔ THREAD TERTAHAN</text>
  <text x="302" y="408" text-anchor="middle" font-size="8" fill="#881337">Event loop menunggu I/O</text>
  <text x="302" y="422" text-anchor="middle" font-size="8" fill="#881337">disk basis data selesai</text>

  <!-- STEP 7: Pool -> DB (Insert Log) -->
  <path d="M 646 385 L 850 385" fill="none" stroke="#dc2626" stroke-width="1.5" marker-end="url(#arrow-red)"/>
  <text x="745" y="378" text-anchor="middle" font-size="9" fill="#dc2626">7. INSERT INTO audit_logs</text>

  <!-- STEP 8: DB -> Pool -->
  <path d="M 850 425 L 646 425" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow-red)"/>
  <text x="745" y="418" text-anchor="middle" font-size="9" fill="#7f1d1d">8. Penulisan Log Selesai</text>

  <!-- STEP 9: Pool -> Express -->
  <path d="M 634 455 L 396 455" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow-red)"/>
  <text x="510" y="448" text-anchor="middle" font-size="9" fill="#dc2626">9. Koneksi Log Dilepas</text>

  <!-- STEP 10: Express -> Client (Late Response) -->
  <path d="M 384 520 L 140 520" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 3" marker-end="url(#arrow-red)"/>
  <text x="250" y="512" text-anchor="middle" font-size="10" font-weight="bold" fill="#dc2626">10. HTTP 200 OK Tertunda (Latensi Tinggi: ~18-50 ms)</text>
</svg>"""

with open('docs/diagrams/diagram_3_2_baseline.svg', 'w', encoding='utf-8') as f:
    f.write(svg_3_2)

# -------------------------------------------------------------
# 2. DIAGRAM 3.3: SEQUENCE DIAGRAM ARSITEKTUR DUAL-TRACK (USULAN)
# -------------------------------------------------------------
svg_3_3 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620" width="100%" height="100%" style="background-color:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#1e293b"/>
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#16a34a"/>
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb"/>
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#9333ea"/>
    </marker>
  </defs>

  <!-- Header -->
  <text x="480" y="32" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Gambar 3.3 Diagram Sequence Arsitektur Usulan (Dual-Track Telemetry)</text>
  <text x="480" y="52" text-anchor="middle" font-size="11.5" fill="#64748b">Alur Paralel Non-Blocking: Klien langsung menerima respon HTTP 200 OK (~2 ms), telemetri dikirim via UDP ke Aggregator</text>

  <!-- Lifeline Headers (Boxes) -->
  <!-- 1. Client -->
  <rect x="30" y="80" width="140" height="44" rx="6" fill="#f1f5f9" stroke="#334155" stroke-width="1.5"/>
  <text x="100" y="100" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0f172a">Klien Scanner</text>
  <text x="100" y="115" text-anchor="middle" font-size="9" fill="#64748b">WMS Barcode / User</text>
  <line x1="100" y1="124" x2="100" y2="570" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>

  <!-- 2. Express Backend -->
  <rect x="200" y="80" width="160" height="44" rx="6" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="280" y="100" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">Express Core (:5000)</text>
  <text x="280" y="115" text-anchor="middle" font-size="9" fill="#3b82f6">Jalur Transaksi Utama</text>
  <line x1="280" y1="124" x2="280" y2="570" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>

  <!-- 3. Connection Pool -->
  <rect x="390" y="80" width="130" height="44" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="455" y="100" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e3a8a">pg.Pool (Bisnis)</text>
  <text x="455" y="115" text-anchor="middle" font-size="9" fill="#2563eb">Maks 10 Koneksi</text>
  <line x1="455" y1="124" x2="455" y2="570" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>

  <!-- 4. PostgreSQL Database -->
  <rect x="550" y="80" width="140" height="44" rx="6" fill="#f8fafc" stroke="#0284c7" stroke-width="1.5"/>
  <text x="620" y="100" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#0369a1">PostgreSQL (:5432)</text>
  <text x="620" y="115" text-anchor="middle" font-size="9" fill="#0284c7">Disk Database</text>
  <line x1="620" y1="124" x2="620" y2="570" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>

  <!-- 5. UDP Log Aggregator -->
  <rect x="720" y="80" width="150" height="44" rx="6" fill="#faf5ff" stroke="#9333ea" stroke-width="1.5"/>
  <text x="795" y="100" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#6b21a8">UDP Aggregator (:5001)</text>
  <text x="795" y="115" text-anchor="middle" font-size="9" fill="#9333ea">RAM Double Buffer</text>
  <line x1="795" y1="124" x2="795" y2="570" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 4"/>

  <!-- Express Active Bar (Very Short: finishes quickly) -->
  <rect x="274" y="150" width="12" height="150" fill="#bbf7d0" stroke="#16a34a" stroke-width="1"/>
  <!-- Pool Active Bar (Short) -->
  <rect x="449" y="170" width="12" height="85" fill="#bfdbfe" stroke="#2563eb" stroke-width="1"/>
  <!-- Aggregator Active Bar -->
  <rect x="789" y="325" width="12" height="210" fill="#e9d5ff" stroke="#9333ea" stroke-width="1"/>

  <!-- STEP 1: HTTP Request -->
  <path d="M 100 150 L 274 150" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>
  <text x="187" y="142" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#0f172a">1. HTTP POST /items</text>

  <!-- Note 1: Transaksi Bisnis Cepat -->
  <rect x="286" y="155" width="155" height="20" rx="4" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <text x="363" y="169" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#1e40af">TRACK 1: TRANSAKSI BISNIS</text>

  <!-- STEP 2: Express -> Pool -->
  <path d="M 286 185 L 449 185" fill="none" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow-blue)"/>
  <text x="365" y="179" text-anchor="middle" font-size="8.5" fill="#2563eb">2. Ambil Slot Pool</text>

  <!-- STEP 3: Pool -> DB -->
  <path d="M 461 205 L 620 205" fill="none" stroke="#2563eb" stroke-width="1.5" marker-end="url(#arrow-blue)"/>
  <text x="540" y="198" text-anchor="middle" font-size="8.5" fill="#1e40af">3. UPDATE items SET stock</text>

  <!-- STEP 4: DB -> Pool -->
  <path d="M 620 230 L 461 230" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow-blue)"/>
  <text x="540" y="223" text-anchor="middle" font-size="8.5" fill="#1e40af">4. Commit Berhasil</text>

  <!-- STEP 5: Pool -> Express -->
  <path d="M 449 250 L 286 250" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow-blue)"/>
  <text x="365" y="244" text-anchor="middle" font-size="8.5" fill="#2563eb">5. Lepas Slot Pool</text>

  <!-- STEP 6: FAST HTTP 200 OK (IMMEDIATE) -->
  <path d="M 274 290 L 100 290" fill="none" stroke="#16a34a" stroke-width="2.5" marker-end="url(#arrow-green)"/>
  <text x="187" y="282" text-anchor="middle" font-size="10" font-weight="bold" fill="#16a34a">6. ⚡ Respon Kilat 200 OK (~2 ms)</text>

  <!-- Visual Break / Decoupled Marker -->
  <line x1="80" y1="315" x2="880" y2="315" stroke="#9333ea" stroke-width="1.5" stroke-dasharray="6 4"/>
  <text x="480" y="311" text-anchor="middle" font-size="9" font-weight="bold" fill="#7e22ce">--- PEMISAHAN ALUR: THREAD UTAMA BEBAS, LOGGING BERJALAN ASINKRON ---</text>

  <!-- STEP 7: UDP Fire and forget -->
  <path d="M 280 345 L 789 345" fill="none" stroke="#9333ea" stroke-width="2" marker-end="url(#arrow-purple)"/>
  <text x="535" y="338" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#7e22ce">7. TRACK 2: Datagram UDP Socket :5001 (Fire-and-Forget, ~0.2 ms)</text>

  <!-- Internal Aggregator Actions -->
  <rect x="735" y="365" width="200" height="42" rx="4" fill="#faf5ff" stroke="#d8b4fe" stroke-width="1"/>
  <text x="835" y="382" text-anchor="middle" font-size="8.5" font-weight="bold" fill="#6b21a8">8. Deteksi Gap &amp; Simpan ke RAM</text>
  <text x="835" y="396" text-anchor="middle" font-size="8" fill="#7e22ce">Ambang: 100 log / 2.000 ms</text>

  <!-- Loop Block for Bulk Flush -->
  <rect x="580" y="430" width="310" height="95" rx="6" fill="#f0fdf4" stroke="#86efac" stroke-width="1.2"/>
  <text x="640" y="448" font-size="9" font-weight="bold" fill="#166534">9. BULK INSERT TERJADWAL</text>

  <!-- Bulk Insert Path -->
  <path d="M 789 470 L 620 470" fill="none" stroke="#16a34a" stroke-width="2" marker-end="url(#arrow-green)"/>
  <text x="705" y="463" text-anchor="middle" font-size="9" font-weight="bold" fill="#15803d">Bulk INSERT (100 log borongan)</text>

  <!-- Bulk Commit Return -->
  <path d="M 620 500 L 789 500" fill="none" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow-green)"/>
  <text x="705" y="493" text-anchor="middle" font-size="8.5" fill="#15803d">10. Data Terarsip Tanpa Bebani Pool Utama</text>
</svg>"""

with open('docs/diagrams/diagram_3_3_dual_track.svg', 'w', encoding='utf-8') as f:
    f.write(svg_3_3)

# -------------------------------------------------------------
# 3. DIAGRAM 3.4: LOGIKA TRI-LAYER SELF-HEALING (FLOWCHART RESMI)
# -------------------------------------------------------------
svg_3_4 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 760" width="100%" height="100%" style="background-color:#ffffff; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;">
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
  <text x="480" y="32" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Gambar 3.4 Diagram Alir Logika Tri-Layer Self-Healing</text>
  <text x="480" y="52" text-anchor="middle" font-size="11.5" fill="#64748b">Alur Keputusan Bertingkat: Deteksi Celah Nomor Urut (Gap) hingga Pemulihan Mandiri Tanpa Kehilangan Data (Zero-Loss)</text>

  <!-- START TERMINAL OVAL -->
  <rect x="360" y="75" width="240" height="38" rx="19" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
  <text x="480" y="99" text-anchor="middle" font-size="11.5" font-weight="bold" fill="#ffffff">([ MULAI: Paket Tiba di Port 5001 ])</text>

  <!-- Arrow Start -> Decision 1 -->
  <path d="M 480 113 L 480 145" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- DECISION 1: Is Sequence Normal? -->
  <polygon points="480,145 610,185 480,225 350,185" fill="#eff6ff" stroke="#2563eb" stroke-width="1.8"/>
  <text x="480" y="180" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#1e40af">Apakah Nomor Urut Sesuai?</text>
  <text x="480" y="196" text-anchor="middle" font-size="9" fill="#3b82f6">(seqId == lastSeqId + 1)</text>

  <!-- Branch Normal (Right) -> Direct RAM Buffer -->
  <path d="M 610 185 L 750 185" fill="none" stroke="#16a34a" stroke-width="2" marker-end="url(#arrow-green)"/>
  <text x="660" y="177" text-anchor="middle" font-size="10" font-weight="bold" fill="#16a34a">Ya (Urut / Normal)</text>

  <!-- Buffer RAM Box (Right) -->
  <rect x="750" y="160" width="170" height="50" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.8"/>
  <text x="835" y="182" text-anchor="middle" font-size="10" font-weight="bold" fill="#14532d">Simpan ke Buffer RAM</text>
  <text x="835" y="198" text-anchor="middle" font-size="8.5" fill="#166534">Aggregator Memory</text>

  <!-- Branch Gap Detected (Down) -->
  <path d="M 480 225 L 480 260" fill="none" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arrow-red)"/>
  <text x="545" y="245" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#dc2626">Tidak (Gap Terdeteksi)</text>

  <!-- Process Box: Calculate Gap -->
  <rect x="360" y="260" width="240" height="42" rx="4" fill="#fef2f2" stroke="#f87171" stroke-width="1.5"/>
  <text x="480" y="278" text-anchor="middle" font-size="10" font-weight="bold" fill="#991b1b">Hitung Jumlah Celah Paket:</text>
  <text x="480" y="293" text-anchor="middle" font-size="9" fill="#b91c1c">gap = seqId - (lastSeqId + 1)</text>

  <!-- Arrow to Decision 2 -->
  <path d="M 480 302 L 480 335" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- DECISION 2: Evaluate Gap Size -->
  <polygon points="480,335 600,375 480,415 360,375" fill="#fefce8" stroke="#ca8a04" stroke-width="1.8"/>
  <text x="480" y="370" text-anchor="middle" font-size="10.5" font-weight="bold" fill="#854d0e">Berapa Besar Gap?</text>
  <text x="480" y="386" text-anchor="middle" font-size="9" fill="#a16207">(Jumlah Paket Hilang)</text>

  <!-- Branch Minor Gap (Left) -> LAYER 1 -->
  <path d="M 360 375 L 220 375" fill="none" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arrow-green)"/>
  <text x="290" y="367" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#16a34a">gap &lt;= 2 (Minor)</text>

  <rect x="40" y="348" width="180" height="54" rx="6" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.5"/>
  <text x="130" y="368" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#15803d">LAPISAN 1: PIGGYBACKING</text>
  <text x="130" y="383" text-anchor="middle" font-size="8.5" fill="#166534">Ekstrak log dari payload</text>
  <text x="130" y="395" text-anchor="middle" font-size="8.5" fill="#166534">paket saat ini (Zero-RTT)</text>

  <!-- Arrow Layer 1 -> RAM Buffer (loops across) -->
  <path d="M 130 402 C 130 460 780 460 810 210" fill="none" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrow-green)"/>

  <!-- Branch Mayor Gap (Down) -> LAYER 2 -->
  <path d="M 480 415 L 480 455" fill="none" stroke="#d97706" stroke-width="1.8" marker-end="url(#arrow)"/>
  <text x="545" y="438" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#b45309">gap &gt; 2 (Mayor)</text>

  <!-- Process Box: NACK ARQ -->
  <rect x="360" y="455" width="240" height="45" rx="6" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="480" y="473" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#92400e">LAPISAN 2: NACK ARQ VIA RAM</text>
  <text x="480" y="489" text-anchor="middle" font-size="8.5" fill="#b45309">Aggregator kirim NACK HTTP POST ke Express</text>

  <!-- Arrow to Decision 3 -->
  <path d="M 480 500 L 480 530" fill="none" stroke="#1e293b" stroke-width="1.8" marker-end="url(#arrow)"/>

  <!-- DECISION 3: Is in 3.000 RAM Ring Buffer? -->
  <polygon points="480,530 590,565 480,600 370,565" fill="#faf5ff" stroke="#9333ea" stroke-width="1.8"/>
  <text x="480" y="560" text-anchor="middle" font-size="9.5" font-weight="bold" fill="#6b21a8">Ditemukan di RAM Buffer?</text>
  <text x="480" y="575" text-anchor="middle" font-size="8.5" fill="#7e22ce">(3.000 Log Terakhir)</text>

  <!-- Branch Found in RAM (Right) -> Retransmit -> RAM Buffer -->
  <path d="M 590 565 L 750 565" fill="none" stroke="#16a34a" stroke-width="1.8" marker-end="url(#arrow-green)"/>
  <text x="670" y="557" text-anchor="middle" font-size="9" font-weight="bold" fill="#16a34a">Ditemukan (&lt;0.1 ms)</text>

  <rect x="750" y="542" width="170" height="46" rx="6" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.5"/>
  <text x="835" y="562" text-anchor="middle" font-size="9" font-weight="bold" fill="#15803d">Retransmisi dari RAM</text>
  <text x="835" y="576" text-anchor="middle" font-size="8" fill="#166534">Kirim ulang ke Aggregator</text>
  <path d="M 835 542 L 835 210" fill="none" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4 3"/>

  <!-- Branch Not Found in RAM (Down) -> Check Critical -->
  <path d="M 480 600 L 480 635" fill="none" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arrow-red)"/>
  <text x="545" y="620" text-anchor="middle" font-size="9" font-weight="bold" fill="#dc2626">Tertimpa / Gagal</text>

  <!-- DECISION 4: Is Critical Error? -->
  <polygon points="480,635 580,665 480,695 380,665" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
  <text x="480" y="662" text-anchor="middle" font-size="9" font-weight="bold" fill="#991b1b">Kategori Kritis?</text>
  <text x="480" y="675" text-anchor="middle" font-size="8" fill="#b91c1c">(HTTP Status 500)</text>

  <!-- Branch Critical (Left) -> LAYER 3 TCP FALLBACK -->
  <path d="M 380 665 L 220 665" fill="none" stroke="#dc2626" stroke-width="1.8" marker-end="url(#arrow-red)"/>
  <text x="300" y="657" text-anchor="middle" font-size="9" font-weight="bold" fill="#dc2626">Ya (Log Kritis)</text>

  <rect x="40" y="642" width="180" height="46" rx="6" fill="#fff1f2" stroke="#e11d48" stroke-width="1.5"/>
  <text x="130" y="662" text-anchor="middle" font-size="9" font-weight="bold" fill="#9f1239">LAPISAN 3: TCP FALLBACK</text>
  <text x="130" y="676" text-anchor="middle" font-size="8" fill="#be123c">Koneksi darurat HTTP Ingest</text>

  <!-- Branch Non-Critical (Down) -> Unrecoverable Loss -->
  <path d="M 480 695 L 480 725" fill="none" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="535" y="712" text-anchor="middle" font-size="8.5" fill="#64748b">Tidak (Info / Debug)</text>

  <!-- FINAL END TERMINAL OVAL -->
  <rect x="400" y="725" width="160" height="28" rx="14" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
  <text x="480" y="743" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">([ SELESAI ])</text>
</svg>"""

with open('docs/diagrams/diagram_3_4_self_healing.svg', 'w', encoding='utf-8') as f:
    f.write(svg_3_4)

print("All 3 SVGs generated successfully with unified notation and clear start/end!")
