/**
 * WMS Nexus • Studio Internationalization Dictionary (ID & EN)
 */
const translations = {
  id: {
    // Header
    brandTitle: "WMS Nexus",
    brandSubtitle: "Unified Developer & Testing Hub",
    watchdogOk: "Watchdog: OK",
    watchdogAlert: "Watchdog: Alert",
    watchdogOffline: "Server: Offline",
    uptime: "Uptime",
    tabTelemetry: "Telemetry & Stress Lab",
    tabApi: "WMS REST API",
    tabArchitecture: "Architecture & Metrics",
    searchPlaceholder: "Cari perintah... (Ctrl+K)",
    themeDark: "Tema Gelap",
    themeLight: "Tema Terang",
    tour: "Tur Panduan",
    tourHelp: "Bantuan",

    // Radar Metrics
    radarTitle: "Radar Kesehatan Sistem Real-Time",
    effectiveLossRate: "Tingkat Kehilangan Efektif",
    zeroLoss: "Zero-Loss",
    lossDetected: "Paket Hilang",
    rawDropVsRecovered: "Raw Drop: {raw} ({pct}) • Terpulihkan: {rec}",
    totalRecovered: "Total Paket Dipulihkan",
    nackAndSeq: "NACK: {nack} • Seq Terakhir: #{seq}",
    dbPersisted: "Tersimpan di PostgreSQL",
    tableTarget: "Tabel: telemetry_logs",
    aggregatorBuffer: "Antrean Buffer RAM",
    flushRule: "Flush Ambang: 100 log / 2.000 ms",
    processMemory: "Memori Proses (RSS)",
    ringBufferCount: "Kapasitas Ring Buffer: {count}",

    // Suite Titles
    suite1Title: "1. Uji Throughput UDP (Non-blocking)",
    suite2Title: "2. Keandalan & Injeksi Kesalahan",
    suite3Title: "3. Uji Beban Autocannon & Baseline DB",

    // Actions
    btnSingleUdp: "Single UDP Datagram (1 Log)",
    btnBatchUdp: "Batch Trigger (100 Logs)",
    btnBurst1k: "High Load Burst (1.000 Logs)",
    btnStress5k: "Stress Blast (5.000 Logs)",
    btnDrop2: "Simulasi Hilang 2 Paket (Zero-RTT)",
    btnDrop9: "Simulasi Hilang 9 Paket (TCP NACK)",
    btnError500: "Simulasi Error 500 (TCP Fallback)",
    btnHeartbeat: "Manual Heartbeat Ping",
    btnAutoUdp: "Autocannon UDP Route (10s)",
    btnAutoSync: "Autocannon Sync DB (5s)",
    btnAutoBlitz: "Quick Autocannon Blitz (3s)",
    btnCopyCli: "Salin Perintah CLI",
    btnSync10: "Sync DB Logging (10 Logs)",
    btnSync50: "Sync DB Logging (50 Logs)",
    btnPurgeDb: "Bersihkan Semua Log DB",
    btnRefresh: "Paksa Sinkronkan Metrik",

    // Terminal
    terminalTitle: "telemetry-studio-audit.log",
    filterAll: "Semua",
    searchLogs: "Cari log...",
    pause: "Jeda",
    resume: "Lanjut",
    autoscroll: "Auto-Scroll",
    copyLogs: "Salin Log",
    clear: "Bersihkan",

    // Quickstart
    quickstartTitle: "Quick Start: Uji Alur WMS dalam 3 Langkah",
    quickstartStep1: "1. Login Akun Demo (bapak_manager)",
    quickstartStep2: "2. Kunci Akses JWT Otomatis Aktif",
    quickstartStep3: "3. Eksekusi Transaksi & Pantau Efeknya",
    btnAutoLogin: "Isi Otomatis Akun Demo",
    btnTriggerPo: "Buat Purchase Order Uji Coba",

    // Architecture
    archTitle: "Arsitektur Telemetri Dual-Track & Tri-Method Reliability",
    archDesc: "Aliran data dari Event Loop Express menuju soket UDP lokal (:5001) dan proses Aggregator asinkron.",
    metricsDictTitle: "Kamus Metrik & Formulasi Teknis",
    historyTitle: "Riwayat Sesi Uji & Ekspor Laporan",
    exportMd: "Ekspor Markdown (.md)",
    exportCsv: "Ekspor CSV",
    exportJson: "Ekspor JSON",

    // Presets
    presetDemo: "Alur Verifikasi Penuh",
    presetStress: "Uji Ketahanan Penuh",
    presetSmoke: "Smoke Test Cepat",

    // Toasts
    causeEffectToast: "⚡ [Cause & Effect] Request {method} {url} tercatat di telemetri ({latency}ms). Klik untuk menyorot di Lab →",
    copiedToast: "Tersalin ke clipboard!",
    autocannonRunning: "Sedang menjalankan uji beban Autocannon... Harap tunggu.",
    autocannonDone: "Autocannon selesai! Hasil dicetak ke konsol terminal.",
  },

  en: {
    // Header
    brandTitle: "WMS Nexus",
    brandSubtitle: "Unified Developer & Testing Hub",
    watchdogOk: "Watchdog: OK",
    watchdogAlert: "Watchdog: Alert",
    watchdogOffline: "Server: Offline",
    uptime: "Uptime",
    tabTelemetry: "Telemetry & Stress Lab",
    tabApi: "WMS REST API",
    tabArchitecture: "Architecture & Metrics",
    searchPlaceholder: "Type a command... (Ctrl+K)",
    themeDark: "Dark Theme",
    themeLight: "Light Theme",
    tour: "Guided Tour",
    tourHelp: "Help",

    // Radar Metrics
    radarTitle: "Real-Time System Health Radar",
    effectiveLossRate: "Effective Loss Rate",
    zeroLoss: "Zero-Loss",
    lossDetected: "Packet Loss",
    rawDropVsRecovered: "Raw Drop: {raw} ({pct}) • Recovered: {rec}",
    totalRecovered: "Total Recovered Packets",
    nackAndSeq: "NACK: {nack} • Last Seq: #{seq}",
    dbPersisted: "Persisted in PostgreSQL",
    tableTarget: "Table: telemetry_logs",
    aggregatorBuffer: "RAM Buffer Queue",
    flushRule: "Flush Threshold: 100 logs / 2,000 ms",
    processMemory: "Process Memory (RSS)",
    ringBufferCount: "Ring Buffer Capacity: {count}",

    // Suite Titles
    suite1Title: "1. UDP Throughput Testing (Non-blocking)",
    suite2Title: "2. Reliability & Fault Injection",
    suite3Title: "3. Autocannon Benchmark & DB Baseline",

    // Actions
    btnSingleUdp: "Single UDP Datagram (1 Log)",
    btnBatchUdp: "Batch Trigger (100 Logs)",
    btnBurst1k: "High Load Burst (1,000 Logs)",
    btnStress5k: "Stress Blast (5,000 Logs)",
    btnDrop2: "Simulate Drop 2 Packets (Zero-RTT)",
    btnDrop9: "Simulate Drop 9 Packets (TCP NACK)",
    btnError500: "Simulate Error 500 (TCP Fallback)",
    btnHeartbeat: "Manual Heartbeat Ping",
    btnAutoUdp: "Autocannon UDP Route (10s)",
    btnAutoSync: "Autocannon Sync DB (5s)",
    btnAutoBlitz: "Quick Autocannon Blitz (3s)",
    btnCopyCli: "Copy CLI Command",
    btnSync10: "Sync DB Logging (10 Logs)",
    btnSync50: "Sync DB Logging (50 Logs)",
    btnPurgeDb: "Purge All Persisted Logs",
    btnRefresh: "Force Refresh Metrics",

    // Terminal
    terminalTitle: "telemetry-studio-audit.log",
    filterAll: "All",
    searchLogs: "Search logs...",
    pause: "Pause",
    resume: "Resume",
    autoscroll: "Auto-Scroll",
    copyLogs: "Copy Logs",
    clear: "Clear",

    // Quickstart
    quickstartTitle: "Quick Start: Test WMS Flow in 3 Steps",
    quickstartStep1: "1. Login Demo Account (bapak_manager)",
    quickstartStep2: "2. JWT Authorization Token Auto-Applied",
    quickstartStep3: "3. Execute Transaction & Observe Telemetry",
    btnAutoLogin: "Auto-Fill Demo Account",
    btnTriggerPo: "Create Sample Purchase Order",

    // Architecture
    archTitle: "Dual-Track Telemetry & Tri-Method Reliability Architecture",
    archDesc: "Data flow from Express Event Loop to local UDP socket (:5001) and asynchronous Aggregator worker.",
    metricsDictTitle: "Technical Metrics Dictionary & Formulas",
    historyTitle: "Test Run History & Report Export",
    exportMd: "Export Markdown (.md)",
    exportCsv: "Export CSV",
    exportJson: "Export JSON",

    // Presets
    presetDemo: "Full Verification Flow",
    presetStress: "Full Stress Test",
    presetSmoke: "Quick Smoke Test",

    // Toasts
    causeEffectToast: "⚡ [Cause & Effect] Request {method} {url} captured in telemetry ({latency}ms). Click to view in Lab →",
    copiedToast: "Copied to clipboard!",
    autocannonRunning: "Running Autocannon load benchmark... Please wait.",
    autocannonDone: "Autocannon benchmark completed! Results rendered in terminal console.",
  }
};

let currentLang = localStorage.getItem('nexus_studio_lang') || 'id';

function t(key, params = {}) {
  const dict = translations[currentLang] || translations.id;
  let text = dict[key] || translations.id[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('nexus_studio_lang', lang);
    applyTranslations();
  }
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerText = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.setAttribute('title', t(key));
  });
  const langBtn = document.getElementById('btnLangToggle');
  if (langBtn) {
    langBtn.innerText = currentLang === 'id' ? 'EN' : 'ID';
  }
}

window.I18N = { t, setLanguage, applyTranslations, getLang: () => currentLang };

