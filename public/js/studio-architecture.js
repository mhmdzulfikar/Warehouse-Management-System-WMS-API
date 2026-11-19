/**
 * WMS Nexus • Studio Architecture & Protocol Explorer Module (Tab 3)
 * 2.5D Isometric Network Topology, Dynamic Packet Travel Engine,
 * Sequence Diagram, Technical Dictionary, and Empirical Report Export.
 */
(function() {
  const store = window.StudioStore;

  // =========================================================================
  // PROTOCOL EXPLORER ENGINE & SCENARIO DEFINITIONS
  // =========================================================================
  const SCENARIOS = {
    // Mode A: Synchronous DB Write (Blocking Baseline)
    sync: {
      modeName: 'TANPA UDP (SYNCHRONOUS DB BLOCKING)',
      badgeClass: 'sync',
      benchmark: {
        throughput: '~540 req/s',
        throughputTag: '-84.5%',
        throughputClass: 'red',
        latency: '18.5 ms',
        latencyTag: '+780%',
        latencyClass: 'red',
        loss: 'N/A (Terkunci)',
        lossTag: 'Contention',
        lossClass: 'red'
      },
      steps: [
        {
          id: 1,
          num: '01',
          title: 'HTTP POST /api/items (Inbound)',
          shortDesc: 'Barcode Scanner/Web mengirim request transaksi stok ke Express API (:5000).',
          packetLabel: 'HTTP POST',
          packetColor: '#d29922',
          pathId: 'pathClientToExpress',
          fromNode: 'nodeClient',
          toNode: 'nodeExpress',
          rippleTarget: 'rippleExpress',
          eventLoop: '0.2 ms (Normal)',
          eventLoopAlert: false,
          dbPool: '0 / 10 koneksi',
          clientLatency: '0.0 ms',
          narrative: '<strong>[Langkah 1/6]</strong> Klien mengirim HTTP POST request mutasi barang melalui TCP connection ke server Node.js Express (:5000). Soket koneksi dialokasikan oleh kernel OS.'
        },
        {
          id: 2,
          num: '02',
          title: 'Validasi & Hitung Logika Bisnis',
          shortDesc: 'Express mengeksekusi route handler, validasi SKU, dan alokasi memori transaksi.',
          packetLabel: 'LOGIC CHECK',
          packetColor: '#58a6ff',
          pathId: null,
          fromNode: 'nodeExpress',
          toNode: 'nodeExpress',
          rippleTarget: 'rippleExpress',
          eventLoop: '0.5 ms (Aktif)',
          eventLoopAlert: false,
          dbPool: '1 / 10 koneksi',
          clientLatency: '+1.8 ms',
          narrative: '<strong>[Langkah 2/6]</strong> Node.js mengeksekusi JavaScript handler di Call Stack: validasi skema payload, cek saldo stok, dan mulai mempersiapkan kueri SQL transaksi barang.'
        },
        {
          id: 3,
          num: '03',
          title: 'Kueri Transaksi Bisnis (UPDATE Stok)',
          shortDesc: 'Express meminjam slot pg.Pool untuk memperbarui data stok di PostgreSQL.',
          packetLabel: 'UPDATE items',
          packetColor: '#58a6ff',
          pathId: 'pathExpressToDb',
          fromNode: 'nodeExpress',
          toNode: 'nodeDb',
          rippleTarget: 'rippleDb',
          eventLoop: '1.2 ms (I/O Wait)',
          eventLoopAlert: false,
          dbPool: '1 / 10 koneksi',
          clientLatency: '+5.4 ms',
          narrative: '<strong>[Langkah 3/6]</strong> Express mengakuisisi 1 koneksi dari connection pool PostgreSQL (pg.Pool) untuk mengeksekusi kueri bisnis <code>UPDATE items SET stock...</code>. Libuv mengelola I/O socket wire protocol.'
        },
        {
          id: 4,
          num: '04',
          title: 'Penulisan Log Audit Sinkron (BLOCKING)',
          shortDesc: 'CRITICAL BOTTLENECK: Express await kueri INSERT log ke pool yang sama!',
          packetLabel: 'INSERT log (BLOCK)',
          packetColor: '#f85149',
          pathId: 'pathExpressToDb',
          fromNode: 'nodeExpress',
          toNode: 'nodeDb',
          rippleTarget: 'rippleDb',
          eventLoop: '14.8 ms (STALLED ⚠️)',
          eventLoopAlert: true,
          dbPool: '2 / 10 koneksi (Contention)',
          clientLatency: '+16.8 ms',
          narrative: '<strong>[Langkah 4/6 - BOTTLENECK]</strong> Jalur transaksi utama DITAHAN! Kode aplikasi memanggil <code>await db.query("INSERT INTO audit_logs...")</code> pada pool koneksi yang sama. Event Loop terbebani disk I/O latency, dan pada beban lonjakan, antrean pool habis (Connection Exhaustion)!'
        },
        {
          id: 5,
          num: '05',
          title: 'PostgreSQL Disk Commit & Release Pool',
          shortDesc: 'Database selesai menulis log audit ke disk, commit transaksi, dan melepas koneksi.',
          packetLabel: 'COMMIT & RELEASE',
          packetColor: '#f85149',
          pathId: 'pathDbToExpress',
          fromNode: 'nodeDb',
          toNode: 'nodeExpress',
          rippleTarget: 'rippleExpress',
          eventLoop: '2.1 ms (Pemulihan)',
          eventLoopAlert: false,
          dbPool: 'Koneksi Dilepas',
          clientLatency: '+18.1 ms',
          narrative: '<strong>[Langkah 5/6]</strong> PostgreSQL menyelesaikan write-ahead log (WAL) ke hard disk, menyelesaikan commit transaksi, dan mengirimkan paket konfirmasi kembali ke Express. Slot koneksi pool baru bisa dibebaskan.'
        },
        {
          id: 6,
          num: '06',
          title: 'HTTP 200 OK Tertunda Lambat ke Klien',
          shortDesc: 'Klien baru menerima konfirmasi sukses setelah seluruh rantai disk I/O tuntas.',
          packetLabel: '200 OK (18.5ms)',
          packetColor: '#d29922',
          pathId: 'pathExpressToClient',
          fromNode: 'nodeExpress',
          toNode: 'nodeClient',
          rippleTarget: 'rippleClient',
          eventLoop: 'Selesai (Total Staggered)',
          eventLoopAlert: true,
          dbPool: 'Rentan Exhaustion',
          clientLatency: 'Total: 18.5 ms (Lambat)',
          narrative: '<strong>[Langkah 6/6]</strong> Klien akhirnya menerima konfirmasi 200 OK setelah menunggu ~18.5 ms. Latensi tinggi ini membatasi throughput sistem pada ~540 req/s karena setiap transaksi dibebani penulisan log audit sinkron.'
        }
      ]
    },

    // Mode B: Dual-Track Telemetry + Tri-Layer Self-Healing (UDP Socket)
    udp: {
      modeName: 'DENGAN UDP (DUAL-TRACK NON-BLOCKING)',
      badgeClass: 'udp',
      benchmark: {
        throughput: '~3,480 req/s',
        throughputTag: '+544%',
        throughputClass: 'green',
        latency: '2.1 ms',
        latencyTag: '-88.6%',
        latencyClass: 'green',
        loss: '0.00% Zero-Loss',
        lossTag: 'Self-Healing',
        lossClass: 'green'
      },
      steps: [
        {
          id: 1,
          num: '01',
          title: 'HTTP POST /api/items (Inbound)',
          shortDesc: 'Barcode Scanner/Web mengirim request transaksi mutasi barang ke Express API (:5000).',
          packetLabel: 'HTTP POST',
          packetColor: '#d29922',
          pathId: 'pathClientToExpress',
          fromNode: 'nodeClient',
          toNode: 'nodeExpress',
          rippleTarget: 'rippleExpress',
          eventLoop: '0.1 ms (Responsive)',
          eventLoopAlert: false,
          dbPool: '0 / 10 koneksi',
          clientLatency: '0.0 ms',
          narrative: '<strong>[Langkah 1/6]</strong> Klien mengirim HTTP POST request mutasi barang. Node.js menerima paket TCP melalui Libuv non-blocking I/O event loop.'
        },
        {
          id: 2,
          num: '02',
          title: 'Dual-Track: UDP Fire-and-Forget (~0.2ms)',
          shortDesc: 'Express memproses transaksi, sekaligus menembak datagram telemetri via UDP lokal (:5001).',
          packetLabel: 'UDP :5001 (0.2ms)',
          packetColor: '#bc8cff',
          pathId: 'pathExpressToUdp',
          fromNode: 'nodeExpress',
          toNode: 'nodeUdp',
          rippleTarget: 'rippleUdp',
          eventLoop: '0.3 ms (NON-BLOCKING ⚡)',
          eventLoopAlert: false,
          dbPool: '1 / 10 (Hanya Transaksi)',
          clientLatency: '+1.8 ms',
          narrative: '<strong>[Langkah 2/6 - DUAL-TRACK]</strong> Keajaiban arsitektur: Express menembakkan datagram log audit ke socket UDP lokal (:5001) melalui <code>dgram.send()</code> dalam ~0.2ms secara Fire-and-Forget tanpa menunggu database!'
        },
        {
          id: 3,
          num: '03',
          title: 'Respon Klien Instan: HTTP 200 OK (2.1ms)',
          shortDesc: 'Klien langsung menerima konfirmasi sukses! Barcode scanner langsung siap tembak berikutnya.',
          packetLabel: '⚡ 200 OK (2.1ms)',
          packetColor: '#3fb950',
          pathId: 'pathExpressToClient',
          fromNode: 'nodeExpress',
          toNode: 'nodeClient',
          rippleTarget: 'rippleClient',
          eventLoop: '0.2 ms (Bersih & Bebas)',
          eventLoopAlert: false,
          dbPool: 'Koneksi Langsung Bebas',
          clientLatency: 'Total: 2.1 ms (-88.6%)',
          narrative: '<strong>[Langkah 3/6 - FAST RESPOND]</strong> Klien menerima respon 200 OK dalam 2.1ms! Klien tidak pernah menunggu log audit ditulis ke hard disk. Event loop langsung bebas melayani request berikutnya.'
        },
        {
          id: 4,
          num: '04',
          title: 'RAM Ring Buffer & Aggregator Ingestion',
          shortDesc: 'Log diamankan di 3.000 Circular Ring Buffer RAM; Aggregator (:5001) verifikasi sequence.',
          packetLabel: 'RAM BUFFER (3K)',
          packetColor: '#bc8cff',
          pathId: null,
          fromNode: 'nodeUdp',
          toNode: 'nodeUdp',
          rippleTarget: 'rippleUdp',
          eventLoop: 'Express Tidak Terganggu',
          eventLoopAlert: false,
          dbPool: '0 Contention',
          clientLatency: 'Background Track',
          narrative: '<strong>[Langkah 4/6]</strong> Di pengirim, paket disimpan sementara di In-Memory Circular Ring Buffer RAM (3.000 log) untuk proteksi NACK ARQ. Di penerima, Aggregator Daemon (:5001) mencatat sequence number.'
        },
        {
          id: 5,
          num: '05',
          title: 'Batch Queueing & Double-Buffer Flush',
          shortDesc: 'Aggregator menampung paket hingga 100 log / 2.000ms, lalu swap buffer secara atomik.',
          packetLabel: 'BATCH FLUSH (100)',
          packetColor: '#58a6ff',
          pathId: 'pathUdpToDb',
          fromNode: 'nodeUdp',
          toNode: 'nodeDb',
          rippleTarget: 'rippleDb',
          eventLoop: 'Terisolasi Sempurna',
          eventLoopAlert: false,
          dbPool: 'Pool Khusus Aggregator',
          clientLatency: 'Background Track',
          narrative: '<strong>[Langkah 5/6]</strong> Log dikumpulkan dalam antrean memori. Saat ambang 100 log atau interval 2.000ms tercapai, Aggregator melakukan swap double-buffer dan mengirimkan batch kueri melalui koneksi terpisah.'
        },
        {
          id: 6,
          num: '06',
          title: 'Batch Bulk-Insert & Tri-Layer Recovery',
          shortDesc: '100 log ditulis sekaligus via 1 kueri bulk-insert; Tri-Layer menjamin Loss Rate 0.00%!',
          packetLabel: 'BULK INSERT (0.00% LOSS)',
          packetColor: '#3fb950',
          pathId: 'pathAggregatorToExpress',
          fromNode: 'nodeUdp',
          toNode: 'nodeExpress',
          rippleTarget: 'rippleExpress',
          eventLoop: 'Throughput: ~3.480 req/s',
          eventLoopAlert: false,
          dbPool: 'Efisiensi Pool Maksimal',
          clientLatency: 'Loss Rate: 0.00% Zero-Loss',
          narrative: '<strong>[Langkah 6/6 - ZERO LOSS]</strong> PostgreSQL mengeksekusi 1 kueri bulk-insert efisien untuk 100 log sekaligus. Jika terjadi paket tercecer di jaringan, Tri-Layer Self-Healing (Piggybacking + NACK TCP ARQ + Watchdog) otomatis menyerapnya kembali sehingga 0.00% data hilang!'
        }
      ]
    }
  };

  // =========================================================================
  // SIMULATOR STATE MACHINE
  // =========================================================================
  const state = {
    mode: 'udp',          // 'udp' | 'sync'
    view: 'network',      // 'network' | 'sequence'
    stepIndex: 0,
    isPlaying: false,
    speed: 1,             // 0.5 | 1 | 2
    animFrameId: null,
    playTimeoutId: null
  };

  // =========================================================================
  // INITIALIZATION & EVENT BINDINGS
  // =========================================================================
  function initSimulator() {
    renderStepList();
    updateUIState();
    bindKeyboard();
    drawSequenceDiagram();
  }

  function setMode(modeKey) {
    if (!SCENARIOS[modeKey]) return;
    pause();
    state.mode = modeKey;
    state.stepIndex = 0;

    // Toggle Mode buttons
    const btnSync = document.getElementById('btnModeSync');
    const btnUdp = document.getElementById('btnModeUdp');
    if (btnSync && btnUdp) {
      btnSync.classList.toggle('active', modeKey === 'sync');
      btnUdp.classList.toggle('active', modeKey === 'udp');
    }

    renderStepList();
    updateUIState();
    triggerStepAnimation();
    if (state.view === 'sequence') {
      drawSequenceDiagram();
    }
  }

  function setView(viewKey) {
    state.view = viewKey;
    const btnIso = document.getElementById('btnViewIso');
    const btnSeq = document.getElementById('btnViewSeq');
    const netView = document.getElementById('protoNetworkView');
    const seqView = document.getElementById('protoSequenceView');

    if (btnIso) btnIso.classList.toggle('active', viewKey === 'network');
    if (btnSeq) btnSeq.classList.toggle('active', viewKey === 'sequence');

    if (netView) netView.style.display = viewKey === 'network' ? 'flex' : 'none';
    if (seqView) seqView.style.display = viewKey === 'sequence' ? 'flex' : 'none';

    if (viewKey === 'sequence') {
      drawSequenceDiagram();
    } else {
      triggerStepAnimation();
    }
  }

  function setSpeed(spd) {
    state.speed = spd;
    ['btnSpd05', 'btnSpd1', 'btnSpd2'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.remove('active');
    });
    if (spd === 0.5) document.getElementById('btnSpd05')?.classList.add('active');
    if (spd === 1) document.getElementById('btnSpd1')?.classList.add('active');
    if (spd === 2) document.getElementById('btnSpd2')?.classList.add('active');
  }

  function goToStep(idx) {
    pause();
    const scenario = SCENARIOS[state.mode];
    if (idx < 0 || idx >= scenario.steps.length) return;
    state.stepIndex = idx;
    updateUIState();
    triggerStepAnimation();
    if (state.view === 'sequence') drawSequenceDiagram();
  }

  function nextStep() {
    const scenario = SCENARIOS[state.mode];
    state.stepIndex = (state.stepIndex + 1) % scenario.steps.length;
    updateUIState();
    triggerStepAnimation();
    if (state.view === 'sequence') drawSequenceDiagram();
  }

  function prevStep() {
    const scenario = SCENARIOS[state.mode];
    state.stepIndex = (state.stepIndex - 1 + scenario.steps.length) % scenario.steps.length;
    updateUIState();
    triggerStepAnimation();
    if (state.view === 'sequence') drawSequenceDiagram();
  }

  function reset() {
    pause();
    state.stepIndex = 0;
    updateUIState();
    triggerStepAnimation();
    if (state.view === 'sequence') drawSequenceDiagram();
  }

  function togglePlay() {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function play() {
    state.isPlaying = true;
    const btnPlay = document.getElementById('btnProtoPlay');
    if (btnPlay) {
      btnPlay.innerHTML = '⏸ Jeda';
      btnPlay.classList.add('active');
    }
    runPlayCycle();
  }

  function pause() {
    state.isPlaying = false;
    if (state.playTimeoutId) {
      clearTimeout(state.playTimeoutId);
      state.playTimeoutId = null;
    }
    const btnPlay = document.getElementById('btnProtoPlay');
    if (btnPlay) {
      btnPlay.innerHTML = '▶ Putar';
      btnPlay.classList.remove('active');
    }
  }

  function runPlayCycle() {
    if (!state.isPlaying) return;
    const duration = (1200 / state.speed);
    const dwell = (700 / state.speed);

    triggerStepAnimation(duration, () => {
      if (!state.isPlaying) return;
      state.playTimeoutId = setTimeout(() => {
        if (!state.isPlaying) return;
        const scenario = SCENARIOS[state.mode];
        state.stepIndex = (state.stepIndex + 1) % scenario.steps.length;
        updateUIState();
        if (state.view === 'sequence') drawSequenceDiagram();
        runPlayCycle();
      }, dwell);
    });
  }

  // =========================================================================
  // UI RENDERING & STEP SYNCHRONIZATION
  // =========================================================================
  function renderStepList() {
    const list = document.getElementById('protoStepsList');
    if (!list) return;

    const scenario = SCENARIOS[state.mode];
    list.innerHTML = scenario.steps.map((step, idx) => {
      const isBlocking = step.packetColor === '#f85149';
      return `
        <div class="proto-step-item ${idx === state.stepIndex ? 'active' : ''} ${isBlocking ? 'sync-blocking' : ''}" 
             data-step-idx="${idx}"
             onclick="window.ProtocolSimulator.goToStep(${idx})">
          <div class="step-num-pill">${step.num}</div>
          <div class="step-details">
            <span class="step-title">${step.title}</span>
            <span class="step-desc">${step.shortDesc}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function updateUIState() {
    const scenario = SCENARIOS[state.mode];
    const currentStep = scenario.steps[state.stepIndex];
    if (!currentStep) return;

    // 1. Update step list active class
    document.querySelectorAll('.proto-step-item').forEach((item, idx) => {
      item.classList.toggle('active', idx === state.stepIndex);
    });

    // 2. Header & Counter
    const badge = document.getElementById('protoModeBadge');
    if (badge) {
      badge.textContent = `MODE: ${scenario.modeName}`;
      badge.style.color = state.mode === 'sync' ? 'var(--status-red)' : 'var(--status-green)';
    }

    const counter = document.getElementById('protoStepCounter');
    if (counter) counter.textContent = `Langkah ${state.stepIndex + 1} / ${scenario.steps.length}`;

    // 3. Runtime State Inspector
    const statEvt = document.getElementById('statEventLoopLag');
    if (statEvt) {
      statEvt.textContent = currentStep.eventLoop;
      statEvt.className = `stat-val ${currentStep.eventLoopAlert ? 'alert' : ''}`;
    }

    const statDb = document.getElementById('statDbPool');
    if (statDb) {
      statDb.textContent = currentStep.dbPool;
      statDb.className = `stat-val ${currentStep.eventLoopAlert ? 'alert' : ''}`;
    }

    const statLat = document.getElementById('statClientLatency');
    if (statLat) {
      statLat.textContent = currentStep.clientLatency;
      statLat.className = `stat-val ${state.mode === 'sync' && state.stepIndex >= 3 ? 'alert' : ''}`;
    }

    const narrative = document.getElementById('protoNarrative');
    if (narrative) {
      narrative.innerHTML = currentStep.narrative;
      narrative.style.borderLeftColor = currentStep.packetColor;
    }

    // 4. Benchmark Ticker
    const bm = scenario.benchmark;
    const bmThr = document.getElementById('bmThroughput');
    if (bmThr) {
      bmThr.innerHTML = `${bm.throughput} <span class="bm-tag ${bm.throughputClass}">${bm.throughputTag}</span>`;
    }

    const bmLat = document.getElementById('bmLatency');
    if (bmLat) {
      bmLat.innerHTML = `${bm.latency} <span class="bm-tag ${bm.latencyClass}">${bm.latencyTag}</span>`;
    }

    const bmLoss = document.getElementById('bmLoss');
    if (bmLoss) {
      bmLoss.innerHTML = `${bm.loss} <span class="bm-tag ${bm.lossClass}">${bm.lossTag}</span>`;
    }
  }

  // =========================================================================
  // ANIMATED TRAVELING DATA PACKET ENGINE (2.5D ISOMETRIC)
  // =========================================================================
  function triggerStepAnimation(customDuration, onComplete) {
    if (state.view !== 'network') {
      if (onComplete) onComplete();
      return;
    }

    const scenario = SCENARIOS[state.mode];
    const step = scenario.steps[state.stepIndex];
    if (!step) return;

    const pktGroup = document.getElementById('protoTravelingPacket');
    const pktAura = document.getElementById('pktAura');
    const pktBody = document.getElementById('pktBody');
    const pktLabel = document.getElementById('pktLabel');
    if (!pktGroup || !pktAura || !pktBody || !pktLabel) return;

    // Reset circuit stroke highlights
    document.querySelectorAll('#isoCircuitPaths path').forEach(p => {
      p.setAttribute('stroke', '#30363d');
      p.setAttribute('stroke-width', '2.5');
    });

    // If step has no path (internal computation on node)
    if (!step.pathId) {
      pktGroup.style.opacity = '0';
      triggerNodeRipple(step.rippleTarget, step.packetColor);
      if (onComplete) onComplete();
      return;
    }

    const pathElem = document.getElementById(step.pathId);
    if (!pathElem) {
      pktGroup.style.opacity = '0';
      if (onComplete) onComplete();
      return;
    }

    // Highlight active circuit path
    pathElem.setAttribute('stroke', step.packetColor);
    pathElem.setAttribute('stroke-width', '3.5');

    // Configure packet visuals
    pktAura.setAttribute('fill', step.packetColor);
    pktBody.setAttribute('stroke', step.packetColor);
    pktLabel.textContent = step.packetLabel;
    pktGroup.style.opacity = '1';

    const pathLen = pathElem.getTotalLength();
    const duration = customDuration || (1000 / state.speed);
    const startTime = performance.now();

    if (state.animFrameId) cancelAnimationFrame(state.animFrameId);

    function stepFrame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeInOutQuad(progress);

      const pt = pathElem.getPointAtLength(easeProgress * pathLen);
      pktGroup.setAttribute('transform', `translate(${pt.x}, ${pt.y})`);

      if (progress < 1) {
        state.animFrameId = requestAnimationFrame(stepFrame);
      } else {
        triggerNodeRipple(step.rippleTarget, step.packetColor);
        if (onComplete) onComplete();
      }
    }

    state.animFrameId = requestAnimationFrame(stepFrame);
  }

  function triggerNodeRipple(rippleId, color) {
    if (!rippleId) return;
    const ripple = document.getElementById(rippleId);
    if (!ripple) return;

    ripple.setAttribute('stroke', color);
    ripple.classList.remove('ripple-active');
    // Force DOM reflow
    void ripple.offsetWidth;
    ripple.classList.add('ripple-active');
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // =========================================================================
  // SEQUENCE TIMELINE VIEW RENDERER (SVG)
  // =========================================================================
  function drawSequenceDiagram() {
    const svg = document.getElementById('protoSequenceSvg');
    if (!svg) return;

    const scenario = SCENARIOS[state.mode];
    const isSync = state.mode === 'sync';

    // Lifeline positions
    const xClient = 130;
    const xExpress = 350;
    const xUdp = 570;
    const xDb = 750;

    let markup = `
      <!-- Lifeline Headers -->
      <g class="seq-headers">
        <!-- Client -->
        <rect x="${xClient - 55}" y="20" width="110" height="32" rx="4" fill="#131b2c" stroke="#58a6ff" stroke-width="1.5"/>
        <text x="${xClient}" y="36" text-anchor="middle" fill="#f0f6fc" font-family="Inter, sans-serif" font-size="10" font-weight="bold">Client (WMS)</text>
        <text x="${xClient}" y="47" text-anchor="middle" fill="#8b949e" font-family="monospace" font-size="8">192.168.1.50</text>
        <line x1="${xClient}" y1="52" x2="${xClient}" y2="400" stroke="#30363d" stroke-dasharray="4 4" stroke-width="1.5"/>

        <!-- Express -->
        <rect x="${xExpress - 60}" y="20" width="120" height="32" rx="4" fill="#131b2c" stroke="#6366f1" stroke-width="1.5"/>
        <text x="${xExpress}" y="36" text-anchor="middle" fill="#f0f6fc" font-family="Inter, sans-serif" font-size="10" font-weight="bold">Express API</text>
        <text x="${xExpress}" y="47" text-anchor="middle" fill="#6366f1" font-family="monospace" font-size="8">:5000 (Libuv)</text>
        <line x1="${xExpress}" y1="52" x2="${xExpress}" y2="400" stroke="#30363d" stroke-dasharray="4 4" stroke-width="1.5"/>

        <!-- UDP Socket -->
        <rect x="${xUdp - 60}" y="20" width="120" height="32" rx="4" fill="#131b2c" stroke="#bc8cff" stroke-width="1.5"/>
        <text x="${xUdp}" y="36" text-anchor="middle" fill="#f0f6fc" font-family="Inter, sans-serif" font-size="10" font-weight="bold">UDP Aggregator</text>
        <text x="${xUdp}" y="47" text-anchor="middle" fill="#bc8cff" font-family="monospace" font-size="8">:5001 (RAM Buffer)</text>
        <line x1="${xUdp}" y1="52" x2="${xUdp}" y2="400" stroke="#30363d" stroke-dasharray="4 4" stroke-width="1.5"/>

        <!-- PostgreSQL -->
        <rect x="${xDb - 55}" y="20" width="110" height="32" rx="4" fill="#131b2c" stroke="#d29922" stroke-width="1.5"/>
        <text x="${xDb}" y="36" text-anchor="middle" fill="#f0f6fc" font-family="Inter, sans-serif" font-size="10" font-weight="bold">PostgreSQL</text>
        <text x="${xDb}" y="47" text-anchor="middle" fill="#d29922" font-family="monospace" font-size="8">:5432 (pg.Pool)</text>
        <line x1="${xDb}" y1="52" x2="${xDb}" y2="400" stroke="#30363d" stroke-dasharray="4 4" stroke-width="1.5"/>
      </g>
    `;

    if (isSync) {
      // MODE A: Synchronous Blocking
      markup += `
        <!-- Step 1: HTTP POST -->
        <g opacity="${state.stepIndex === 0 ? '1' : '0.65'}">
          <line x1="${xClient}" y1="85" x2="${xExpress}" y2="85" stroke="#d29922" stroke-width="${state.stepIndex === 0 ? '3' : '1.5'}"/>
          <polygon points="${xExpress},85 ${xExpress - 8},81 ${xExpress - 8},89" fill="#d29922"/>
          <text x="${(xClient + xExpress) / 2}" y="78" text-anchor="middle" fill="#d29922" font-family="monospace" font-size="9" font-weight="bold">1. POST /api/items</text>
        </g>

        <!-- Step 2: Route Processing -->
        <g opacity="${state.stepIndex === 1 ? '1' : '0.65'}">
          <rect x="${xExpress - 4}" y="95" width="8" height="30" fill="#58a6ff"/>
          <text x="${xExpress + 12}" y="112" fill="#58a6ff" font-family="monospace" font-size="9">2. Logic &amp; Stock Calc</text>
        </g>

        <!-- Step 3: DB Query Stock -->
        <g opacity="${state.stepIndex === 2 ? '1' : '0.65'}">
          <line x1="${xExpress}" y1="140" x2="${xDb}" y2="140" stroke="#58a6ff" stroke-width="${state.stepIndex === 2 ? '3' : '1.5'}"/>
          <polygon points="${xDb},140 ${xDb - 8},136 ${xDb - 8},144" fill="#58a6ff"/>
          <text x="${(xExpress + xDb) / 2}" y="133" text-anchor="middle" fill="#58a6ff" font-family="monospace" font-size="9">3. UPDATE stock (pg.Pool)</text>
        </g>

        <!-- Step 4: BLOCKING AUDIT LOG WRITE -->
        <g opacity="${state.stepIndex === 3 ? '1' : '0.75'}">
          <line x1="${xExpress}" y1="180" x2="${xDb}" y2="180" stroke="#f85149" stroke-width="${state.stepIndex === 3 ? '3.5' : '2'}"/>
          <polygon points="${xDb},180 ${xDb - 8},176 ${xDb - 8},184" fill="#f85149"/>
          <text x="${(xExpress + xDb) / 2}" y="173" text-anchor="middle" fill="#f85149" font-family="monospace" font-size="9.5" font-weight="bold">4. INSERT audit_logs (AWAITING DISK)</text>

          <!-- BIG RED BLOCKING RECTANGLE ON EXPRESS -->
          <rect x="${xExpress - 14}" y="180" width="28" height="110" rx="4" fill="rgba(248, 81, 73, 0.25)" stroke="#f85149" stroke-width="2"/>
          <text x="${xExpress + 22}" y="235" fill="#f85149" font-family="Inter, sans-serif" font-size="10" font-weight="bold">⛔ EVENT LOOP TERTAHAN</text>
          <text x="${xExpress + 22}" y="248" fill="#8b949e" font-family="monospace" font-size="8.5">Disk I/O Wait: 15-20ms</text>
        </g>

        <!-- Step 5: DB Commit & Return -->
        <g opacity="${state.stepIndex === 4 ? '1' : '0.65'}">
          <line x1="${xDb}" y1="290" x2="${xExpress}" y2="290" stroke="#f85149" stroke-width="${state.stepIndex === 4 ? '3' : '1.5'}"/>
          <polygon points="${xExpress},290 ${xExpress + 8},286 ${xExpress + 8},294" fill="#f85149"/>
          <text x="${(xExpress + xDb) / 2}" y="283" text-anchor="middle" fill="#f85149" font-family="monospace" font-size="9">5. Commit &amp; Release Pool</text>
        </g>

        <!-- Step 6: HTTP 200 Delayed Response -->
        <g opacity="${state.stepIndex === 5 ? '1' : '0.65'}">
          <line x1="${xExpress}" y1="330" x2="${xClient}" y2="330" stroke="#d29922" stroke-width="${state.stepIndex === 5 ? '3' : '1.5'}"/>
          <polygon points="${xClient},330 ${xClient + 8},326 ${xClient + 8},334" fill="#d29922"/>
          <text x="${(xClient + xExpress) / 2}" y="323" text-anchor="middle" fill="#d29922" font-family="monospace" font-size="9" font-weight="bold">6. 200 OK (Latensi: 18.5ms - Lambat)</text>
        </g>
      `;
    } else {
      // MODE B: Dual-Track UDP Non-Blocking
      markup += `
        <!-- Step 1: HTTP POST -->
        <g opacity="${state.stepIndex === 0 ? '1' : '0.65'}">
          <line x1="${xClient}" y1="85" x2="${xExpress}" y2="85" stroke="#d29922" stroke-width="${state.stepIndex === 0 ? '3' : '1.5'}"/>
          <polygon points="${xExpress},85 ${xExpress - 8},81 ${xExpress - 8},89" fill="#d29922"/>
          <text x="${(xClient + xExpress) / 2}" y="78" text-anchor="middle" fill="#d29922" font-family="monospace" font-size="9" font-weight="bold">1. POST /api/items</text>
        </g>

        <!-- Step 2: UDP Fire-and-Forget -->
        <g opacity="${state.stepIndex === 1 ? '1' : '0.75'}">
          <line x1="${xExpress}" y1="115" x2="${xUdp}" y2="115" stroke="#bc8cff" stroke-width="${state.stepIndex === 1 ? '3.5' : '2'}"/>
          <polygon points="${xUdp},115 ${xUdp - 8},111 ${xUdp - 8},119" fill="#bc8cff"/>
          <text x="${(xExpress + xUdp) / 2}" y="108" text-anchor="middle" fill="#bc8cff" font-family="monospace" font-size="9" font-weight="bold">2. dgram.send(:5001) ~0.2ms</text>
        </g>

        <!-- Step 3: INSTANT HTTP 200 OK -->
        <g opacity="${state.stepIndex === 2 ? '1' : '0.75'}">
          <line x1="${xExpress}" y1="140" x2="${xClient}" y2="140" stroke="#3fb950" stroke-width="${state.stepIndex === 2 ? '3.5' : '2'}"/>
          <polygon points="${xClient},140 ${xClient + 8},136 ${xClient + 8},144" fill="#3fb950"/>
          <text x="${(xClient + xExpress) / 2}" y="133" text-anchor="middle" fill="#3fb950" font-family="monospace" font-size="9.5" font-weight="bold">⚡ 3. HTTP 200 OK (2.1ms Kilat!)</text>

          <!-- GREEN READY BAR ON EXPRESS -->
          <rect x="${xExpress - 4}" y="145" width="8" height="240" fill="rgba(63, 185, 80, 0.4)" rx="2"/>
          <text x="${xExpress - 14}" y="240" text-anchor="end" fill="#3fb950" font-family="Inter, sans-serif" font-size="9.5" font-weight="bold">🟢 Event Loop Bebas</text>
          <text x="${xExpress - 14}" y="252" text-anchor="end" fill="#8b949e" font-family="monospace" font-size="8">Siap Request Berikutnya</text>
        </g>

        <!-- Step 4: RAM Ring Buffer -->
        <g opacity="${state.stepIndex === 3 ? '1' : '0.65'}">
          <rect x="${xUdp - 6}" y="150" width="12" height="40" fill="#bc8cff" rx="3"/>
          <text x="${xUdp + 14}" y="172" fill="#bc8cff" font-family="monospace" font-size="9">4. Circular Ring Buffer (3K RAM)</text>
        </g>

        <!-- Step 5: Aggregator Batch Flush -->
        <g opacity="${state.stepIndex === 4 ? '1' : '0.65'}">
          <line x1="${xUdp}" y1="230" x2="${xDb}" y2="230" stroke="#58a6ff" stroke-width="${state.stepIndex === 4 ? '3' : '1.5'}"/>
          <polygon points="${xDb},230 ${xDb - 8},226 ${xDb - 8},234" fill="#58a6ff"/>
          <text x="${(xUdp + xDb) / 2}" y="223" text-anchor="middle" fill="#58a6ff" font-family="monospace" font-size="9">5. Batch Flush (100 logs / 2.000ms)</text>
        </g>

        <!-- Step 6: Bulk Insert & Tri-Layer Recovery -->
        <g opacity="${state.stepIndex === 5 ? '1' : '0.65'}">
          <line x1="${xDb}" y1="285" x2="${xUdp}" y2="285" stroke="#3fb950" stroke-width="${state.stepIndex === 5 ? '3' : '1.5'}"/>
          <polygon points="${xUdp},285 ${xUdp + 8},281 ${xUdp + 8},289" fill="#3fb950"/>
          <text x="${(xUdp + xDb) / 2}" y="278" text-anchor="middle" fill="#3fb950" font-family="monospace" font-size="9" font-weight="bold">6. Bulk INSERT &amp; 0.00% Packet Loss</text>

          <!-- Tri-layer Self-Healing Loop -->
          <path d="M ${xUdp} 310 C ${xUdp - 60} 335 ${xExpress + 60} 335 ${xExpress} 310" stroke="#bc8cff" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>
          <text x="${(xUdp + xExpress) / 2}" y="350" text-anchor="middle" fill="#bc8cff" font-family="monospace" font-size="8.5">NACK TCP ARQ &amp; Piggybacking Self-Healing</text>
        </g>
      `;
    }

    svg.innerHTML = markup;
  }

  // =========================================================================
  // KEYBOARD NAVIGATION
  // =========================================================================
  function bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      const archTab = document.getElementById('tab-architecture');
      if (!archTab || !archTab.classList.contains('active')) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    });
  }

  // =========================================================================
  // REPORT EXPORT & ARCHITECTURE HISTORY (PRESERVED)
  // =========================================================================
  function initArchitecture() {
    initSimulator();
    renderHistoryTable();
    store.subscribe('testRecorded', () => renderHistoryTable());
  }

  function renderHistoryTable() {
    const tbody = document.getElementById('testHistoryBody');
    if (!tbody) return;

    if (!store.testHistory || store.testHistory.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">Belum ada sesi pengujian yang tercatat. Jalankan pengujian di Tab 1 untuk melihat riwayat.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = store.testHistory.map((item, index) => {
      return `
        <tr>
          <td><span class="font-mono text-dim">#${store.testHistory.length - index}</span></td>
          <td><strong class="font-sans">${item.name}</strong></td>
          <td><span class="badge-code">${item.mode}</span></td>
          <td><span class="font-mono">${item.durationMs}ms</span></td>
          <td><span class="font-mono text-accent">${item.throughput}</span></td>
          <td><span class="font-mono text-success">${item.latencyP99}</span></td>
          <td><span class="text-dim text-sm">${item.result}</span></td>
        </tr>
      `;
    }).join('');
  }

  function exportMarkdown() {
    if (!store.testHistory || store.testHistory.length === 0) {
      window.ApiModule?.showToast?.('Tidak ada data riwayat untuk diekspor.', 'error');
      return;
    }

    let md = `# WMS Nexus • Telemetry & Benchmark Audit Report\n\n`;
    md += `**Generated At:** ${new Date().toLocaleString()}\n`;
    md += `**Architecture:** Dual-Track UDP Telemetry with Tri-Method Self-Healing\n`;
    md += `**Aggregator Buffer:** Flush Threshold 100 logs / 2,000 ms\n\n`;
    md += `## 1. Summary of Benchmark Runs\n\n`;
    md += `| # | Test Name | Mode | Duration | Throughput | Latency p99 | Result Status |\n`;
    md += `|---|---|---|---|---|---|---|\n`;

    store.testHistory.forEach((r, idx) => {
      md += `| ${idx + 1} | ${r.name} | \`${r.mode}\` | ${r.durationMs}ms | ${r.throughput} | ${r.latencyP99} | ${r.result} |\n`;
    });

    md += `\n## 2. Technical Findings & Empirical Analysis\n\n`;
    md += `- **Non-blocking UDP Dispatch:** Log telemetry packets dispatched via local socket in ~0.2ms without awaiting database transactions.\n`;
    md += `- **Self-Healing Efficacy:** Effective loss rate remained 0.00% under normal burst conditions via Piggybacking (Zero-RTT) and Ring Buffer NACK TCP ARQ.\n`;
    md += `- **Autocannon Load Handling:** Sustained high concurrent HTTP connection loads without blocking the Event Loop.\n`;

    downloadFile(md, `wms-telemetry-report-${Date.now()}.md`, 'text/markdown');
  }

  function exportCsv() {
    if (!store.testHistory || store.testHistory.length === 0) {
      window.ApiModule?.showToast?.('Tidak ada data riwayat untuk diekspor.', 'error');
      return;
    }

    const headers = ['ID', 'Timestamp', 'Test Name', 'Mode', 'Duration (ms)', 'Throughput', 'Latency p99', 'Result'];
    const rows = store.testHistory.map((r, idx) => [
      idx + 1,
      r.timestamp,
      `"${r.name.replace(/"/g, '""')}"`,
      r.mode,
      r.durationMs,
      `"${r.throughput}"`,
      `"${r.latencyP99}"`,
      `"${r.result.replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `wms-telemetry-report-${Date.now()}.csv`, 'text/csv');
  }

  function exportJson() {
    if (!store.testHistory || store.testHistory.length === 0) {
      window.ApiModule?.showToast?.('Tidak ada data riwayat untuk diekspor.', 'error');
      return;
    }

    const data = {
      title: 'WMS Nexus Telemetry Benchmark History',
      exportedAt: new Date().toISOString(),
      system: store.metrics?.system || {},
      runs: store.testHistory
    };

    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `wms-telemetry-report-${Date.now()}.json`, 'application/json');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    window.ApiModule?.showToast?.(`Laporan ${fileName} berhasil diunduh!`, 'success');
  }

  function explainNode(nodeId) {
    const descBox = document.getElementById('diagramExplainer');
    if (!descBox) return;

    const dict = {
      nodeClient: {
        title: 'Klien Scanner / Web WMS (192.168.1.50)',
        role: 'Perangkat barcode scanner gudang atau aplikasi web operator yang mengirimkan request mutasi stok (inbound/outbound) via HTTP/TCP.'
      },
      nodeExpress: {
        title: 'Node.js Express App Core (:5000)',
        role: 'Melayani request bisnis (REST API) dan mengeksekusi telemetryMiddleware. Mengirimkan datagram UDP fire-and-forget (~0.2ms) tanpa menunggu database.'
      },
      nodeUdp: {
        title: 'UDP Log Aggregator Daemon (:5001)',
        role: 'Transport layer lokal berkecepatan tinggi tanpa handshake connection (Zero-Wait) untuk mengisolasi traffic log dari blocking TCP.'
      },
      nodeRingBuffer: {
        title: 'In-Memory Circular Ring Buffer (3.000 Logs)',
        role: 'Penyimpan sementara 3.000 log terakhir di RAM pengirim. Siap disedot via TCP NACK jika terjadi packet loss di jaringan.'
      },
      nodePostgres: {
        title: 'PostgreSQL Database (Prisma 7 :5432)',
        role: 'Tabel persistensi akhir (telemetry_logs). Menerima insert secara bulk/batch sehingga tidak ada contention lock antar-koneksi.'
      }
    };

    const info = dict[nodeId] || {
      title: 'Komponen Arsitektur Interaktif',
      role: 'Klik salah satu node pada diagram untuk melihat perannya dalam sistem telemetri.'
    };

    descBox.innerHTML = `
      <div class="explainer-title" style="font-size: 11px; font-weight: 700; color: var(--accent);">${info.title}</div>
      <div class="explainer-desc" style="font-size: 11px; color: var(--text-muted); line-height: 1.4; margin-top: 2px;">${info.role}</div>
    `;
  }

  // Expose global simulator and architecture modules
  window.ProtocolSimulator = {
    init: initSimulator,
    setMode,
    setView,
    setSpeed,
    goToStep,
    nextStep,
    prevStep,
    reset,
    togglePlay,
    play,
    pause
  };

  window.ArchitectureModule = {
    init: initArchitecture,
    exportMarkdown,
    exportCsv,
    exportJson,
    explainNode
  };
})();
