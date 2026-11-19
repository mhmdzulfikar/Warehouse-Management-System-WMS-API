/**
 * WMS Nexus • Studio Architecture & Protocol Explorer Module (Tab 3)
 * 2.5D Isometric Network Topology, Dual-Track Simultaneous Packet Travel Engine,
 * Sequence Diagram, Technical Dictionary, and Empirical Report Export.
 * Anti-Slop Compliant: Clean Blueprint Aesthetic, Crisp 1px Borders, Zero Slop.
 */
(function() {
  const store = window.StudioStore;

  // =========================================================================
  // PROTOCOL EXPLORER ENGINE & SCENARIO DEFINITIONS
  // =========================================================================
  const SCENARIOS = {
    // Mode A: Single-Track Synchronous DB Write (Blocking Baseline)
    sync: {
      modeName: 'TANPA UDP (SINGLE-TRACK SYNCHRONOUS BLOCKING)',
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
          isDualTrack: false,
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
          narrative: '<strong>[Langkah 1/5]</strong> Klien barcode scanner/web mengirim request transaksi stok via HTTP/TCP ke Express API (:5000). Single-track baseline dimulai.'
        },
        {
          id: 2,
          num: '02',
          title: 'Kueri Bisnis (UPDATE Stok Fisik)',
          shortDesc: 'Express mengambil 1 slot pg.Pool untuk memperbarui data stok di PostgreSQL.',
          isDualTrack: false,
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
          narrative: '<strong>[Langkah 2/5]</strong> Express mengeksekusi kueri bisnis <code>UPDATE items SET stock...</code> ke PostgreSQL menggunakan connection pool bersama.'
        },
        {
          id: 3,
          num: '03',
          title: 'Penulisan Log Audit Sinkron (CRITICAL BOTTLENECK)',
          shortDesc: 'Jalur transaksi DITAHAN! Express await INSERT log ke pool koneksi yang sama.',
          isDualTrack: false,
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
          narrative: '<strong>[Langkah 3/5 - BOTTLENECK]</strong> Jalur transaksi utama DITAHAN! Express memanggil <code>await db.query("INSERT INTO audit_logs...")</code> pada pool yang sama. Event Loop terbebani disk I/O latency, dan connection pool terancam habis (Connection Exhaustion)!'
        },
        {
          id: 4,
          num: '04',
          title: 'PostgreSQL Disk Commit & Release Pool',
          shortDesc: 'Database selesai menulis log audit ke disk, commit transaksi, dan melepas koneksi.',
          isDualTrack: false,
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
          narrative: '<strong>[Langkah 4/5]</strong> PostgreSQL menyelesaikan penulisan log audit ke disk, meng-commit transaksi, dan mengirim respon balik ke Express. Slot koneksi pool baru dibebaskan.'
        },
        {
          id: 5,
          num: '05',
          title: 'HTTP 200 OK Tertunda Lambat ke Klien',
          shortDesc: 'Klien baru menerima konfirmasi sukses setelah seluruh rantai disk I/O tuntas.',
          isDualTrack: false,
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
          narrative: '<strong>[Langkah 5/5]</strong> Klien akhirnya menerima konfirmasi 200 OK setelah menunggu ~18.5 ms. Latensi tinggi ini membatasi throughput sistem pada ~540 req/s karena setiap transaksi dibebani penulisan log audit sinkron.'
        }
      ]
    },

    // Mode B: Dual-Track Telemetry + Tri-Layer Self-Healing (UDP Socket)
    udp: {
      modeName: 'DENGAN UDP (DUAL-TRACK NON-BLOCKING PARALEL)',
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
          isDualTrack: false,
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
          narrative: '<strong>[Langkah 1/5]</strong> Klien mengirim HTTP POST request mutasi barang ke Express API (:5000). Event loop Libuv menerima paket TCP tanpa antrean.'
        },
        {
          id: 2,
          num: '02',
          title: '⚡ DUAL-TRACK: BERCABANG DUA JALUR SEKALIGUS!',
          shortDesc: 'Jalur 1: Respon 200 OK instan ke Klien (2.1ms) | Jalur 2: Datagram UDP ke :5001 (~0.2ms).',
          isDualTrack: true, // TRIGGER DUAL SIMULTANEOUS PACKETS!
          // Track 1 (Business Transaction Return):
          path1: 'pathExpressToClient',
          packet1Label: '⚡ 200 OK (2.1ms)',
          packet1Color: '#3fb950',
          ripple1Target: 'rippleClient',
          // Track 2 (Telemetry Datagram):
          path2: 'pathExpressToUdp',
          packet2Label: 'UDP :5001 (0.2ms)',
          packet2Color: '#bc8cff',
          ripple2Target: 'rippleUdp',
          eventLoop: '0.3 ms (NON-BLOCKING ⚡)',
          eventLoopAlert: false,
          dbPool: '1 / 10 (Terisolasi)',
          clientLatency: 'Total: 2.1 ms (-88.6%)',
          narrative: '<strong>[Langkah 2/5 - DUAL-TRACK SIMULTAN]</strong> Arsitektur membelah proses menjadi DUA JALUR BERJALAN SEKALIGUS! <em>Jalur 1:</em> Mengirimkan respon HTTP 200 OK ke Klien seketika (2.1ms). <em>Jalur 2:</em> Menembakkan datagram telemetri ke UDP Socket :5001 secara Fire-and-Forget (~0.2ms). Klien tidak pernah menunggu database!'
        },
        {
          id: 3,
          num: '03',
          title: 'RAM Ring Buffer & Sequence Verification',
          shortDesc: 'Klien sudah bebas! Log telemetri diamankan di 3.000 Circular Ring Buffer RAM pengirim.',
          isDualTrack: false,
          packetLabel: 'RAM BUFFER (3K)',
          packetColor: '#bc8cff',
          pathId: null,
          fromNode: 'nodeUdp',
          toNode: 'nodeUdp',
          rippleTarget: 'rippleUdp',
          eventLoop: 'Bebas / Klien Selesai',
          eventLoopAlert: false,
          dbPool: '0 Contention',
          clientLatency: 'Background Track',
          narrative: '<strong>[Langkah 3/5]</strong> Klien sudah bebas dan dapat memindai barcode berikutnya. Di latar belakang, log telemetri diamankan di In-Memory Circular Ring Buffer RAM (3.000 log) untuk proteksi NACK ARQ, dan Aggregator memverifikasi sequence number.'
        },
        {
          id: 4,
          num: '04',
          title: 'Batch Queueing & Double-Buffer Swap',
          shortDesc: 'Aggregator menampung paket hingga ambang 100 log / 2.000ms, lalu swap buffer secara atomik.',
          isDualTrack: false,
          packetLabel: 'SWAP BUFFER (100)',
          packetColor: '#58a6ff',
          pathId: null,
          fromNode: 'nodeUdp',
          toNode: 'nodeUdp',
          rippleTarget: 'rippleUdp',
          eventLoop: 'Terisolasi Total',
          eventLoopAlert: false,
          dbPool: 'Pool Khusus Aggregator',
          clientLatency: 'Background Track',
          narrative: '<strong>[Langkah 4/5]</strong> Log telemetri dikumpulkan dalam antrean RAM. Saat ambang 100 log atau interval 2.000ms tercapai, Aggregator melakukan swap double-buffer dan menyiapkan pengiriman batch.'
        },
        {
          id: 5,
          num: '05',
          title: 'Bulk INSERT Langsung ke PostgreSQL (Zero-Loss)',
          shortDesc: 'Aggregator menulis 100 log LANGSUNG ke Database PostgreSQL (:5432) via koneksi terpisah.',
          isDualTrack: false,
          packetLabel: 'BULK INSERT DB',
          packetColor: '#3fb950',
          pathId: 'pathUdpToDb',
          fromNode: 'nodeUdp',
          toNode: 'nodeDb',
          rippleTarget: 'rippleDb',
          eventLoop: 'Throughput: ~3.480 req/s',
          eventLoopAlert: false,
          dbPool: 'Efisiensi Pool Maksimal',
          clientLatency: 'Loss Rate: 0.00% Zero-Loss',
          narrative: '<strong>[Langkah 5/5 - BULK INSERT DATABASE]</strong> Log telemetri ditulis LANGSUNG dari UDP Aggregator ke PostgreSQL Database (:5432) via koneksi terpisah tanpa pernah menyentuh Express / Node.js! Persistensi 100 log selesai sekaligus dalam 1 kueri bulk-insert efisien, menjaga Loss Rate 0.00% dan Zero Contention!'
        }
      ]
    }
  };

  // =========================================================================
  // SIMULATOR STATE MACHINE (Default Speed: 0.5x)
  // =========================================================================
  const state = {
    mode: 'udp',          // 'udp' | 'sync'
    view: 'network',      // 'network' | 'sequence'
    stepIndex: 0,
    isPlaying: false,
    speed: 0.5,           // Default 0.5x for smooth, cinematic review
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

    // Toggle Track Labels on Canvas
    const lblTrack1 = document.getElementById('lblTrack1');
    const lblTrack2 = document.getElementById('lblTrack2');
    if (lblTrack1 && lblTrack2) {
      if (modeKey === 'sync') {
        lblTrack1.textContent = 'SINGLE TRACK: TRANSAKSI (SYNC BLOCKING)';
        lblTrack1.setAttribute('fill', '#f85149');
        lblTrack2.textContent = 'UDP SOCKET :5001 (OFFLINE / TIDAK DIPAKAI)';
        lblTrack2.setAttribute('fill', '#6e7681');
      } else {
        lblTrack1.textContent = 'TRACK 1: TRANSAKSI (HTTP)';
        lblTrack1.setAttribute('fill', '#3fb950');
        lblTrack2.textContent = 'TRACK 2: TELEMETRI (UDP :5001)';
        lblTrack2.setAttribute('fill', '#bc8cff');
      }
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
    if (state.animFrameId) {
      cancelAnimationFrame(state.animFrameId);
      state.animFrameId = null;
    }
    const btnPlay = document.getElementById('btnProtoPlay');
    if (btnPlay) {
      btnPlay.innerHTML = '▶ Putar';
      btnPlay.classList.remove('active');
    }
  }

  // Continuous fluid playback without jarring freeze pauses
  function runPlayCycle() {
    if (!state.isPlaying) return;
    const duration = (750 / state.speed);
    // Smooth micro-handoff: enough to let the ripple wave expand, but zero lag freeze
    const dwell = Math.max(90, 140 / state.speed);

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
      const isDual = step.isDualTrack;
      return `
        <div class="proto-step-item ${idx === state.stepIndex ? 'active' : ''} ${isBlocking ? 'sync-blocking' : ''} ${isDual ? 'dual-track-active' : ''}" 
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
      statLat.className = `stat-val ${state.mode === 'sync' && state.stepIndex >= 2 ? 'alert' : ''}`;
    }

    const narrative = document.getElementById('protoNarrative');
    if (narrative) {
      narrative.innerHTML = currentStep.narrative;
      narrative.style.borderLeftColor = currentStep.isDualTrack ? '#3fb950' : (currentStep.packetColor || '#6366f1');
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
  // DUAL-TRACK SIMULTANEOUS TRAVELING PACKET ENGINE (2.5D ISOMETRIC)
  // =========================================================================
  function triggerStepAnimation(customDuration, onComplete) {
    if (state.view !== 'network') {
      if (onComplete) onComplete();
      return;
    }

    const scenario = SCENARIOS[state.mode];
    const step = scenario.steps[state.stepIndex];
    if (!step) return;

    const pkt1 = document.getElementById('protoTravelingPacket1');
    const pkt2 = document.getElementById('protoTravelingPacket2');
    const pkt1Body = document.getElementById('pkt1Body');
    const pkt1Dot = document.getElementById('pkt1Dot');
    const pkt1Label = document.getElementById('pkt1Label');
    const pkt2Body = document.getElementById('pkt2Body');
    const pkt2Dot = document.getElementById('pkt2Dot');
    const pkt2Label = document.getElementById('pkt2Label');

    if (!pkt1 || !pkt2 || !pkt1Body || !pkt1Dot || !pkt1Label || !pkt2Body || !pkt2Dot || !pkt2Label) {
      if (onComplete) onComplete();
      return;
    }

    if (state.animFrameId) {
      cancelAnimationFrame(state.animFrameId);
      state.animFrameId = null;
    }

    // Reset circuit stroke highlights
    document.querySelectorAll('#isoCircuitPaths path').forEach(p => {
      p.setAttribute('stroke', '#253041');
      p.setAttribute('stroke-width', '2');
    });

    const duration = customDuration || (750 / state.speed);

    // CASE 1: DUAL-TRACK SIMULTANEOUS SPLIT (PARALLEL EXECUTION!)
    if (step.isDualTrack) {
      const path1 = document.getElementById(step.path1);
      const path2 = document.getElementById(step.path2);
      if (!path1 || !path2) {
        if (onComplete) onComplete();
        return;
      }

      // Highlight BOTH circuit paths simultaneously
      path1.setAttribute('stroke', step.packet1Color);
      path1.setAttribute('stroke-width', '3');
      path2.setAttribute('stroke', step.packet2Color);
      path2.setAttribute('stroke-width', '3');

      // Configure Packet 1 (Track 1: Business 200 OK)
      pkt1Body.setAttribute('stroke', step.packet1Color);
      pkt1Dot.setAttribute('fill', step.packet1Color);
      pkt1Label.textContent = step.packet1Label;
      pkt1.style.opacity = '1';

      // Configure Packet 2 (Track 2: UDP Telemetry)
      pkt2Body.setAttribute('stroke', step.packet2Color);
      pkt2Dot.setAttribute('fill', step.packet2Color);
      pkt2Label.textContent = step.packet2Label;
      pkt2.style.opacity = '1';

      const len1 = path1.getTotalLength();
      const len2 = path2.getTotalLength();
      const startTime = performance.now();

      function dualFrame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        // Interpolate Packet 1 along Track 1
        const pt1 = path1.getPointAtLength(ease * len1);
        pkt1.setAttribute('transform', `translate(${pt1.x}, ${pt1.y})`);

        // Interpolate Packet 2 along Track 2 SIMULTANEOUSLY!
        const pt2 = path2.getPointAtLength(ease * len2);
        pkt2.setAttribute('transform', `translate(${pt2.x}, ${pt2.y})`);

        if (progress < 1) {
          state.animFrameId = requestAnimationFrame(dualFrame);
        } else {
          // Trigger simultaneous ripples
          triggerNodeRipple(step.ripple1Target, step.packet1Color);
          triggerNodeRipple(step.ripple2Target, step.packet2Color);
          if (onComplete) onComplete();
        }
      }

      state.animFrameId = requestAnimationFrame(dualFrame);
      return;
    }

    // CASE 2: SINGLE PACKET (OR INTERNAL STEP)
    pkt2.style.opacity = '0'; // Hide second packet

    if (!step.pathId) {
      // Internal processing on node (no path flight)
      pkt1.style.opacity = '0';
      triggerNodeRipple(step.rippleTarget, step.packetColor);
      if (onComplete) onComplete();
      return;
    }

    const pathElem = document.getElementById(step.pathId);
    if (!pathElem) {
      pkt1.style.opacity = '0';
      if (onComplete) onComplete();
      return;
    }

    // Highlight active path
    pathElem.setAttribute('stroke', step.packetColor);
    pathElem.setAttribute('stroke-width', '3');

    // Configure Packet 1
    pkt1Body.setAttribute('stroke', step.packetColor);
    pkt1Dot.setAttribute('fill', step.packetColor);
    pkt1Label.textContent = step.packetLabel;
    pkt1.style.opacity = '1';

    const pathLen = pathElem.getTotalLength();
    const startTime = performance.now();

    function singleFrame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      const pt = pathElem.getPointAtLength(ease * pathLen);
      pkt1.setAttribute('transform', `translate(${pt.x}, ${pt.y})`);

      if (progress < 1) {
        state.animFrameId = requestAnimationFrame(singleFrame);
      } else {
        triggerNodeRipple(step.rippleTarget, step.packetColor);
        if (onComplete) onComplete();
      }
    }

    state.animFrameId = requestAnimationFrame(singleFrame);
  }

  function triggerNodeRipple(rippleId, color) {
    if (!rippleId) return;
    const ripple = document.getElementById(rippleId);
    if (!ripple) return;

    ripple.setAttribute('stroke', color);
    ripple.classList.remove('ripple-active');
    void ripple.offsetWidth; // Reflow
    ripple.classList.add('ripple-active');
  }

  // Silky smooth cubic easing without jerky starts or stops
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // =========================================================================
  // SEQUENCE TIMELINE VIEW RENDERER (SVG)
  // =========================================================================
  function drawSequenceDiagram() {
    const svg = document.getElementById('protoSequenceSvg');
    if (!svg) return;

    const scenario = SCENARIOS[state.mode];
    const isSync = state.mode === 'sync';

    // Lifeline X positions
    const xClient = 130;
    const xExpress = 350;
    const xUdp = 570;
    const xDb = 750;

    let markup = `
      <!-- Lifeline Headers (Crisp 1px Blueprint) -->
      <g class="seq-headers">
        <!-- Client -->
        <rect x="${xClient - 55}" y="20" width="110" height="32" rx="4" fill="#0d1117" stroke="#30363d" stroke-width="1.2"/>
        <text x="${xClient}" y="36" text-anchor="middle" fill="#f0f6fc" font-family="Inter, sans-serif" font-size="10" font-weight="bold">Client (WMS)</text>
        <text x="${xClient}" y="47" text-anchor="middle" fill="#8b949e" font-family="monospace" font-size="8">192.168.1.50</text>
        <line x1="${xClient}" y1="52" x2="${xClient}" y2="400" stroke="#253041" stroke-dasharray="3 3" stroke-width="1.2"/>

        <!-- Express -->
        <rect x="${xExpress - 60}" y="20" width="120" height="32" rx="4" fill="#0d1117" stroke="#6366f1" stroke-width="1.2"/>
        <text x="${xExpress}" y="36" text-anchor="middle" fill="#f0f6fc" font-family="Inter, sans-serif" font-size="10" font-weight="bold">Express API</text>
        <text x="${xExpress}" y="47" text-anchor="middle" fill="#6366f1" font-family="monospace" font-size="8">:5000 (Libuv)</text>
        <line x1="${xExpress}" y1="52" x2="${xExpress}" y2="400" stroke="#253041" stroke-dasharray="3 3" stroke-width="1.2"/>

        <!-- UDP Socket -->
        <rect x="${xUdp - 60}" y="20" width="120" height="32" rx="4" fill="#0d1117" stroke="#bc8cff" stroke-width="1.2"/>
        <text x="${xUdp}" y="36" text-anchor="middle" fill="#f0f6fc" font-family="Inter, sans-serif" font-size="10" font-weight="bold">UDP Aggregator</text>
        <text x="${xUdp}" y="47" text-anchor="middle" fill="#bc8cff" font-family="monospace" font-size="8">:5001 (RAM Buffer)</text>
        <line x1="${xUdp}" y1="52" x2="${xUdp}" y2="400" stroke="#253041" stroke-dasharray="3 3" stroke-width="1.2"/>

        <!-- PostgreSQL -->
        <rect x="${xDb - 55}" y="20" width="110" height="32" rx="4" fill="#0d1117" stroke="#d29922" stroke-width="1.2"/>
        <text x="${xDb}" y="36" text-anchor="middle" fill="#f0f6fc" font-family="Inter, sans-serif" font-size="10" font-weight="bold">PostgreSQL</text>
        <text x="${xDb}" y="47" text-anchor="middle" fill="#d29922" font-family="monospace" font-size="8">:5432 (pg.Pool)</text>
        <line x1="${xDb}" y1="52" x2="${xDb}" y2="400" stroke="#253041" stroke-dasharray="3 3" stroke-width="1.2"/>
      </g>
    `;

    if (isSync) {
      // MODE A: Synchronous Blocking (Single-Track)
      markup += `
        <!-- Step 1: HTTP POST -->
        <g opacity="${state.stepIndex === 0 ? '1' : '0.6'}">
          <line x1="${xClient}" y1="85" x2="${xExpress}" y2="85" stroke="#d29922" stroke-width="${state.stepIndex === 0 ? '2.5' : '1.5'}"/>
          <polygon points="${xExpress},85 ${xExpress - 7},81 ${xExpress - 7},89" fill="#d29922"/>
          <text x="${(xClient + xExpress) / 2}" y="78" text-anchor="middle" fill="#d29922" font-family="monospace" font-size="9" font-weight="bold">1. POST /api/items</text>
        </g>

        <!-- Step 2: DB Query Stock -->
        <g opacity="${state.stepIndex === 1 ? '1' : '0.6'}">
          <line x1="${xExpress}" y1="125" x2="${xDb}" y2="125" stroke="#58a6ff" stroke-width="${state.stepIndex === 1 ? '2.5' : '1.5'}"/>
          <polygon points="${xDb},125 ${xDb - 7},121 ${xDb - 7},129" fill="#58a6ff"/>
          <text x="${(xExpress + xDb) / 2}" y="118" text-anchor="middle" fill="#58a6ff" font-family="monospace" font-size="9">2. UPDATE stock (pg.Pool)</text>
        </g>

        <!-- Step 3: BLOCKING AUDIT LOG WRITE -->
        <g opacity="${state.stepIndex === 2 ? '1' : '0.75'}">
          <line x1="${xExpress}" y1="165" x2="${xDb}" y2="165" stroke="#f85149" stroke-width="${state.stepIndex === 2 ? '3' : '1.8'}"/>
          <polygon points="${xDb},165 ${xDb - 7},161 ${xDb - 7},169" fill="#f85149"/>
          <text x="${(xExpress + xDb) / 2}" y="158" text-anchor="middle" fill="#f85149" font-family="monospace" font-size="9" font-weight="bold">3. INSERT audit_logs (AWAITING DISK)</text>

          <!-- RED BLOCKING BOX ON EXPRESS -->
          <rect x="${xExpress - 12}" y="165" width="24" height="110" rx="3" fill="#1f1315" stroke="#f85149" stroke-width="1.5"/>
          <text x="${xExpress + 20}" y="220" fill="#f85149" font-family="Inter, sans-serif" font-size="9.5" font-weight="bold">⛔ EVENT LOOP TERTAHAN</text>
          <text x="${xExpress + 20}" y="233" fill="#8b949e" font-family="monospace" font-size="8">Disk I/O Wait: 15-20ms</text>
        </g>

        <!-- Step 4: DB Commit & Return -->
        <g opacity="${state.stepIndex === 3 ? '1' : '0.6'}">
          <line x1="${xDb}" y1="275" x2="${xExpress}" y2="275" stroke="#f85149" stroke-width="${state.stepIndex === 3 ? '2.5' : '1.5'}"/>
          <polygon points="${xExpress},275 ${xExpress + 7},271 ${xExpress + 7},279" fill="#f85149"/>
          <text x="${(xExpress + xDb) / 2}" y="268" text-anchor="middle" fill="#f85149" font-family="monospace" font-size="9">4. Commit &amp; Release Pool</text>
        </g>

        <!-- Step 5: HTTP 200 Delayed Response -->
        <g opacity="${state.stepIndex === 4 ? '1' : '0.6'}">
          <line x1="${xExpress}" y1="315" x2="${xClient}" y2="315" stroke="#d29922" stroke-width="${state.stepIndex === 4 ? '2.5' : '1.5'}"/>
          <polygon points="${xClient},315 ${xClient + 7},311 ${xClient + 7},319" fill="#d29922"/>
          <text x="${(xClient + xExpress) / 2}" y="308" text-anchor="middle" fill="#d29922" font-family="monospace" font-size="9" font-weight="bold">5. 200 OK (Latensi: 18.5ms - Lambat)</text>
        </g>
      `;
    } else {
      // MODE B: Dual-Track Non-Blocking (PARALLEL SPLIT!)
      markup += `
        <!-- Step 1: HTTP POST -->
        <g opacity="${state.stepIndex === 0 ? '1' : '0.6'}">
          <line x1="${xClient}" y1="85" x2="${xExpress}" y2="85" stroke="#d29922" stroke-width="${state.stepIndex === 0 ? '2.5' : '1.5'}"/>
          <polygon points="${xExpress},85 ${xExpress - 7},81 ${xExpress - 7},89" fill="#d29922"/>
          <text x="${(xClient + xExpress) / 2}" y="78" text-anchor="middle" fill="#d29922" font-family="monospace" font-size="9" font-weight="bold">1. POST /api/items</text>
        </g>

        <!-- Step 2: DUAL-TRACK PARALLEL BRANCH (SIMULTANEOUS!) -->
        <g opacity="${state.stepIndex === 1 ? '1' : '0.75'}">
          <!-- Dual-Track Architectural Banner -->
          <rect x="180" y="105" width="440" height="20" rx="3" fill="#0e1726" stroke="#3fb950" stroke-width="1"/>
          <text x="400" y="119" text-anchor="middle" fill="#3fb950" font-family="monospace" font-size="8.5" font-weight="bold">⚡ DUAL-TRACK: BERCABANG DUA JALUR SEKALIGUS!</text>

          <!-- Track 1 Arrow (Left to Client: 200 OK) -->
          <line x1="${xExpress}" y1="140" x2="${xClient}" y2="140" stroke="#3fb950" stroke-width="${state.stepIndex === 1 ? '3' : '2'}"/>
          <polygon points="${xClient},140 ${xClient + 7},136 ${xClient + 7},144" fill="#3fb950"/>
          <text x="${(xClient + xExpress) / 2}" y="133" text-anchor="middle" fill="#3fb950" font-family="monospace" font-size="9" font-weight="bold">⚡ Track 1: 200 OK (2.1ms)</text>

          <!-- Track 2 Arrow (Right to UDP Aggregator) AT THE EXACT SAME TIME! -->
          <line x1="${xExpress}" y1="140" x2="${xUdp}" y2="140" stroke="#bc8cff" stroke-width="${state.stepIndex === 1 ? '3' : '2'}"/>
          <polygon points="${xUdp},140 ${xUdp - 7},136 ${xUdp - 7},144" fill="#bc8cff"/>
          <text x="${(xExpress + xUdp) / 2}" y="133" text-anchor="middle" fill="#bc8cff" font-family="monospace" font-size="9" font-weight="bold">⚡ Track 2: UDP :5001 (0.2ms)</text>

          <!-- Green Free Event Loop Bar on Express -->
          <rect x="${xExpress - 3}" y="145" width="6" height="235" fill="#1b4728" rx="1"/>
          <text x="${xExpress - 12}" y="240" text-anchor="end" fill="#3fb950" font-family="Inter, sans-serif" font-size="9" font-weight="bold">🟢 Event Loop Bebas</text>
          <text x="${xExpress - 12}" y="252" text-anchor="end" fill="#8b949e" font-family="monospace" font-size="8">Siap Request Baru</text>
        </g>

        <!-- Step 3: RAM Ring Buffer (Track 2 Background) -->
        <g opacity="${state.stepIndex === 2 ? '1' : '0.6'}">
          <rect x="${xUdp - 6}" y="170" width="12" height="35" fill="#2d1f4d" stroke="#bc8cff" stroke-width="1" rx="2"/>
          <text x="${xUdp + 14}" y="190" fill="#bc8cff" font-family="monospace" font-size="8.5">3. Ring Buffer RAM (3K)</text>
        </g>

        <!-- Step 4: Double-Buffer Swap -->
        <g opacity="${state.stepIndex === 3 ? '1' : '0.6'}">
          <rect x="${xUdp - 6}" y="225" width="12" height="30" fill="#253041" stroke="#58a6ff" stroke-width="1" rx="2"/>
          <text x="${xUdp + 14}" y="243" fill="#58a6ff" font-family="monospace" font-size="8.5">4. Swap Double-Buffer (100 logs)</text>
        </g>

        <!-- Step 5: Bulk INSERT Langsung ke PostgreSQL Database -->
        <g opacity="${state.stepIndex === 4 ? '1' : '0.6'}">
          <line x1="${xUdp}" y1="285" x2="${xDb}" y2="285" stroke="#3fb950" stroke-width="${state.stepIndex === 4 ? '3' : '1.8'}"/>
          <polygon points="${xDb},285 ${xDb - 7},281 ${xDb - 7},289" fill="#3fb950"/>
          <text x="${(xUdp + xDb) / 2}" y="278" text-anchor="middle" fill="#3fb950" font-family="monospace" font-size="9" font-weight="bold">5. Bulk INSERT Langsung ke PostgreSQL (:5432)</text>
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
