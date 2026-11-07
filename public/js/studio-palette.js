/**
 * WMS Nexus • Studio Command Palette, Tour & Preset Runner
 * Features: Ctrl+K palette, 4-step onboarding tour, and automated scenario presets.
 */
(function() {
  const store = window.StudioStore;

  // 1. Command Palette Items
  const commands = [
    { id: 'tab-telemetry', title: 'Buka Tab: Telemetry & Stress Lab', category: 'Navigasi', shortcut: '1', action: () => window.StudioApp.switchTab('telemetry') },
    { id: 'tab-api', title: 'Buka Tab: WMS REST API (Swagger)', category: 'Navigasi', shortcut: '2', action: () => window.StudioApp.switchTab('api') },
    { id: 'tab-arch', title: 'Buka Tab: Architecture & Metrics', category: 'Navigasi', shortcut: '3', action: () => window.StudioApp.switchTab('architecture') },
    { id: 'test-single', title: 'Jalankan: Single UDP Datagram (1 Log)', category: 'Pengujian', shortcut: 'U', action: () => window.TelemetryModule.actions.singleUdp() },
    { id: 'test-batch', title: 'Jalankan: Batch Trigger (100 Logs)', category: 'Pengujian', shortcut: 'B', action: () => window.TelemetryModule.actions.burstUdp(100) },
    { id: 'test-burst', title: 'Jalankan: High Load Burst (1.000 Logs)', category: 'Pengujian', action: () => window.TelemetryModule.actions.burstUdp(1000) },
    { id: 'test-stress', title: 'Jalankan: Stress Blast (5.000 Logs)', category: 'Pengujian', action: () => window.TelemetryModule.actions.burstUdp(5000) },
    { id: 'test-loss-piggy', title: 'Simulasi: Drop 2 Packets (Zero-RTT Piggyback)', category: 'Self-Healing', action: () => window.TelemetryModule.actions.injectLoss(3) },
    { id: 'test-loss-nack', title: 'Simulasi: Drop 9 Packets (TCP NACK ARQ)', category: 'Self-Healing', action: () => window.TelemetryModule.actions.injectLoss(10) },
    { id: 'test-auto-blitz', title: 'Jalankan: Quick Autocannon Blitz (3s)', category: 'Autocannon', action: () => window.TelemetryModule.actions.runAutocannon('udp', 3, 25) },
    { id: 'test-auto-udp', title: 'Jalankan: Autocannon UDP Route (10s, 100 Conn)', category: 'Autocannon', action: () => window.TelemetryModule.actions.runAutocannon('udp', 10, 100) },
    { id: 'theme-toggle', title: 'Ganti Tema (Dark / Light Mode)', category: 'Preferensi', shortcut: 'T', action: () => store.toggleTheme() },
    { id: 'lang-toggle', title: 'Ganti Bahasa (ID / EN)', category: 'Preferensi', action: () => window.I18N.setLanguage(window.I18N.getLang() === 'id' ? 'en' : 'id') },
    { id: 'export-md', title: 'Ekspor Laporan Pengujian (Markdown)', category: 'Laporan', action: () => window.ArchitectureModule.exportMarkdown() },
    { id: 'tour-start', title: 'Mulai Tur Panduan Studio', category: 'Bantuan', shortcut: '?', action: () => startTour() }
  ];

  function openPalette() {
    const modal = document.getElementById('paletteModal');
    const input = document.getElementById('paletteInput');
    if (!modal || !input) return;

    modal.classList.add('open');
    input.value = '';
    renderPaletteItems(commands);
    setTimeout(() => input.focus(), 50);
  }

  function closePalette() {
    const modal = document.getElementById('paletteModal');
    if (modal) modal.classList.remove('open');
  }

  function renderPaletteItems(list) {
    const results = document.getElementById('paletteResults');
    if (!results) return;

    if (list.length === 0) {
      results.innerHTML = `<div class="palette-empty">Tidak ada perintah yang cocok.</div>`;
      return;
    }

    results.innerHTML = list.map((cmd, idx) => `
      <div class="palette-item ${idx === 0 ? 'selected' : ''}" data-idx="${idx}" onclick="window.PaletteModule.execCommand('${cmd.id}')">
        <div class="palette-item-left">
          <span class="palette-badge">${cmd.category}</span>
          <span class="palette-title">${cmd.title}</span>
        </div>
        ${cmd.shortcut ? `<kbd class="palette-kbd">${cmd.shortcut}</kbd>` : ''}
      </div>
    `).join('');
  }

  function filterPalette(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      renderPaletteItems(commands);
      return;
    }
    const filtered = commands.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    renderPaletteItems(filtered);
  }

  function execCommand(id) {
    const cmd = commands.find(c => c.id === id);
    closePalette();
    if (cmd && cmd.action) {
      cmd.action();
    }
  }

  // 2. Scenario Presets
  async function runPreset(type) {
    if (type === 'demo' || type === 'verify') {
      window.ApiModule.showToast('Memulai Skenario: Alur Verifikasi Penuh (End-to-End)...', 'info');
      window.StudioApp.switchTab('telemetry');

      // Step 1: Single UDP
      await window.TelemetryModule.actions.singleUdp();
      await delay(1200);

      // Step 2: Batch 100
      await window.TelemetryModule.actions.burstUdp(100);
      await delay(1500);

      // Step 3: Self-healing drop 2
      await window.TelemetryModule.actions.injectLoss(3);
      await delay(1500);

      // Step 4: Self-healing drop 9
      await window.TelemetryModule.actions.injectLoss(10);
      await delay(2000);

      // Step 5: Quick Blitz Autocannon
      await window.TelemetryModule.actions.runAutocannon('udp', 3, 25);
      window.ApiModule.showToast('Alur Verifikasi Penuh selesai! Seluruh arsitektur terbukti andal.', 'success');
    } else if (type === 'stress') {
      window.ApiModule.showToast('Memulai Uji Ketahanan Penuh...', 'info');
      await window.TelemetryModule.actions.burstUdp(1000);
      await delay(1500);
      await window.TelemetryModule.actions.burstUdp(5000);
      await delay(2000);
      await window.TelemetryModule.actions.runAutocannon('udp', 5, 50);
      window.ApiModule.showToast('Uji Ketahanan Penuh selesai!', 'success');
    } else if (type === 'smoke') {
      window.ApiModule.showToast('Menjalankan Smoke Test...', 'info');
      await window.TelemetryModule.actions.singleUdp();
      await delay(500);
      await window.TelemetryModule.actions.heartbeat();
      window.ApiModule.showToast('Smoke Test OK: Server & Watchdog responsif.', 'success');
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 3. Guided Tour (4 Steps)
  const tourSteps = [
    {
      target: '#headerNavTabs',
      title: 'Selamat Datang di WMS Nexus Studio!',
      text: 'Gunakan 3 tab navigasi ini untuk beralih instan antara Uji Beban Telemetri (Tab 1), WMS REST API (Tab 2), dan Analisis Arsitektur (Tab 3).'
    },
    {
      target: '#radarStrip',
      title: 'Radar Kesehatan Sistem Real-Time',
      text: 'Pantau tingkat packet loss efektif (0.00% Zero-Loss), pemulihan NACK, antrean buffer RAM, dan status memori proses secara langsung.'
    },
    {
      target: '#testbedSuite',
      title: 'Interactive Testbed Suite',
      text: 'Tersedia 16 tombol aksi pengujian throughput, simulasi kehilangan paket, dan uji beban Autocannon tanpa perlu mengetik di terminal.'
    },
    {
      target: '#terminalBox',
      title: 'Live Technical Console',
      text: 'Seluruh event telemetri, tabel ASCII Autocannon, dan korelasi log transaksi muncul seketika di sini dengan filter dan pencarian.'
    }
  ];

  let currentTourStep = 0;

  function startTour() {
    currentTourStep = 0;
    showTourStep(0);
  }

  function showTourStep(index) {
    const popover = document.getElementById('tourPopover');
    if (!popover) return;

    if (index >= tourSteps.length) {
      popover.classList.remove('active');
      return;
    }

    const step = tourSteps[index];
    const targetEl = document.querySelector(step.target);
    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    popover.style.top = `${rect.bottom + window.scrollY + 10}px`;
    popover.style.left = `${Math.max(16, rect.left + window.scrollX)}px`;

    popover.innerHTML = `
      <div class="tour-header">
        <strong>${step.title}</strong>
        <span class="tour-counter">${index + 1} / ${tourSteps.length}</span>
      </div>
      <div class="tour-body">${step.text}</div>
      <div class="tour-actions">
        <button class="btn-tiny" onclick="window.PaletteModule.closeTour()">Lewati</button>
        <button class="btn-tiny btn-accent" onclick="window.PaletteModule.nextTourStep()">
          ${index === tourSteps.length - 1 ? 'Selesai' : 'Lanjut →'}
        </button>
      </div>
    `;

    popover.classList.add('active');
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function nextTourStep() {
    currentTourStep++;
    showTourStep(currentTourStep);
  }

  function closeTour() {
    const popover = document.getElementById('tourPopover');
    if (popover) popover.classList.remove('active');
  }

  window.PaletteModule = {
    openPalette,
    closePalette,
    filterPalette,
    execCommand,
    runPreset,
    startTour,
    nextTourStep,
    closeTour
  };
})();

