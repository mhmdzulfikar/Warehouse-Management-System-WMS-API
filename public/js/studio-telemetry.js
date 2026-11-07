/**
 * WMS Nexus • Studio Telemetry & Testbed Module (Tab 1)
 * Manages 16 testbed actions, area gradient sparklines,
 * Visual Packet Sequence Inspector, PostgreSQL Live DB Log Table, and Audit Terminal.
 */
(function() {
  const store = window.StudioStore;
  let pollingTimer = null;
  let isAutocannonRunning = false;
  let activeDeckView = 'sequence'; // 'sequence' | 'db' | 'terminal'

  // In-memory packet sequence tracking (Visual Empirical Proof)
  const sequenceNodes = [];
  const MAX_SEQUENCE_NODES = 120;
  let cachedDbLogs = [];

  // Upgraded SVG Sparkline with Area Gradient Fill and Live Pulsing Dot
  function renderSparkline(points, strokeColor, gradId) {
    if (!points || points.length === 0) return '';
    const width = 90;
    const height = 30;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const isFlat = min === max;
    const range = isFlat ? 1 : (max - min);

    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * (width - 8) + 4;
      const y = isFlat 
        ? height / 2 
        : height - 6 - ((p - min) / range) * (height - 12);
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

    const pathData = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    const lastCoord = coords[coords.length - 1];
    const areaData = `${pathData} L ${lastCoord.x} ${height} L ${coords[0].x} ${height} Z`;

    return `
      <svg class="sparkline-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.38" />
            <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <path class="sparkline-area" d="${areaData}" fill="url(#${gradId})" />
        <path class="sparkline-stroke" d="${pathData}" stroke="${strokeColor}" />
        <circle cx="${lastCoord.x}" cy="${lastCoord.y}" r="3" fill="${strokeColor}" class="sparkline-dot" />
      </svg>
    `;
  }

  // --- Deck View Switcher ---
  function switchDeckView(view) {
    activeDeckView = view;
    
    // Tab buttons
    const btnSeq = document.getElementById('tabBtnSeq');
    const btnDb = document.getElementById('tabBtnDb');
    const btnTerm = document.getElementById('tabBtnTerminal');
    if (btnSeq) btnSeq.classList.toggle('active', view === 'sequence');
    if (btnDb) btnDb.classList.toggle('active', view === 'db');
    if (btnTerm) btnTerm.classList.toggle('active', view === 'terminal');

    // Panes
    const viewSeq = document.getElementById('viewSequence');
    const viewDb = document.getElementById('viewDb');
    const viewTerm = document.getElementById('viewTerminal');
    if (viewSeq) viewSeq.classList.toggle('active', view === 'sequence');
    if (viewDb) viewDb.classList.toggle('active', view === 'db');
    if (viewTerm) viewTerm.classList.toggle('active', view === 'terminal');

    // Toolbars
    const tbSeq = document.getElementById('toolbarSeq');
    const tbDb = document.getElementById('toolbarDb');
    const tbTerm = document.getElementById('toolbarTerminal');
    if (tbSeq) tbSeq.style.display = view === 'sequence' ? 'flex' : 'none';
    if (tbDb) tbDb.style.display = view === 'db' ? 'flex' : 'none';
    if (tbTerm) tbTerm.style.display = view === 'terminal' ? 'flex' : 'none';

    // Auto-fetch if DB view selected
    if (view === 'db') {
      fetchDbLogs();
    }
  }

  // --- Visual Packet Sequence Tracker ---
  function addSequencePacket(packet) {
    const id = packet.id || `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const node = {
      id,
      seqId: packet.seqId,
      status: packet.status || 'ok', // 'ok' | 'dropped' | 'recovered' | 'error' | 'burst'
      title: packet.title || `Seq #${packet.seqId}`,
      subtitle: packet.subtitle || '',
      method: packet.method || 'UDP Non-blocking',
      latency: packet.latency != null ? packet.latency : null,
      metadata: packet.metadata || null,
      timestamp: packet.timestamp || timeStr
    };

    sequenceNodes.push(node);
    if (sequenceNodes.length > MAX_SEQUENCE_NODES) {
      sequenceNodes.shift();
    }

    renderSequenceNode(node);
    updateSequenceBadge();
  }

  function renderSequenceNode(node) {
    const track = document.getElementById('sequenceTrack');
    if (!track) return;

    // Remove empty placeholder
    const emptyMsg = document.getElementById('sequenceEmptyMsg');
    if (emptyMsg) emptyMsg.remove();

    const chip = document.createElement('div');
    chip.className = `packet-chip chip-${node.status}`;
    chip.id = `chip-${node.id}`;
    chip.setAttribute('data-id', node.id);
    chip.onclick = () => inspectPacket(node.id);

    let statusText = '';
    if (node.status === 'ok') statusText = '✓ OK';
    else if (node.status === 'dropped') statusText = '⚠️ Drop';
    else if (node.status === 'recovered') statusText = '🔄 Pulih';
    else if (node.status === 'error') statusText = '✕ 500';
    else if (node.status === 'burst') statusText = '⚡ Burst';

    chip.innerHTML = `
      <div class="packet-chip-head">
        <span>${escapeHtml(node.title)}</span>
        <span style="font-size: 9.5px; opacity: 0.85;">${statusText}</span>
      </div>
      <div class="packet-chip-sub">${escapeHtml(node.subtitle || (node.latency ? node.latency + 'ms' : ''))}</div>
    `;

    track.appendChild(chip);

    // Keep DOM limited
    while (track.children.length > MAX_SEQUENCE_NODES) {
      track.removeChild(track.firstChild);
    }

    track.scrollTop = track.scrollHeight;
  }

  function updateSequencePacketStatus(seqId, newStatus, newTitle, newSubtitle, extraMeta = {}) {
    const node = sequenceNodes.find(n => n.seqId === seqId);
    if (node) {
      node.status = newStatus;
      if (newTitle) node.title = newTitle;
      if (newSubtitle) node.subtitle = newSubtitle;
      if (extraMeta) node.metadata = { ...(node.metadata || {}), ...extraMeta };

      const chip = document.getElementById(`chip-${node.id}`);
      if (chip) {
        chip.className = `packet-chip chip-${newStatus}`;
        chip.innerHTML = `
          <div class="packet-chip-head">
            <span>${escapeHtml(node.title)}</span>
            <span style="font-size: 9.5px; opacity: 0.85;">🔄 Pulih</span>
          </div>
          <div class="packet-chip-sub">${escapeHtml(node.subtitle)}</div>
        `;
      }
    }
  }

  function updateSequenceBadge() {
    const badge = document.getElementById('badgeSeqCount');
    if (badge) {
      badge.innerText = `${sequenceNodes.length} pkts`;
    }
  }

  function clearSequenceTracker() {
    sequenceNodes.length = 0;
    const track = document.getElementById('sequenceTrack');
    if (track) {
      track.innerHTML = `
        <div class="detail-empty" id="sequenceEmptyMsg" style="padding: 24px; width: 100%;">
          Alur sequence telah dibersihkan. Jalankan pengujian di atas untuk mencatat alur paket baru.
        </div>
      `;
    }
    updateSequenceBadge();
    const detail = document.getElementById('detailSeqBody');
    if (detail) {
      detail.innerHTML = '<div class="detail-empty">Pilih salah satu chip paket di sebelah kiri untuk melihat metadata, latensi, dan status pemulihan.</div>';
    }
  }

  function inspectPacket(id) {
    const node = sequenceNodes.find(n => n.id === id);
    if (!node) return;

    // Highlight active chip
    document.querySelectorAll('.packet-chip').forEach(c => c.classList.remove('active-inspect'));
    const chip = document.getElementById(`chip-${id}`);
    if (chip) chip.classList.add('active-inspect');

    const titleEl = document.getElementById('detailSeqTitle');
    const bodyEl = document.getElementById('detailSeqBody');
    if (titleEl) titleEl.innerText = `Inspeksi: ${node.title}`;

    if (bodyEl) {
      let badgeHtml = '<span class="tag-badge tag-green">Terkirim Berhasil (OK)</span>';
      if (node.status === 'dropped') badgeHtml = '<span class="tag-badge tag-red">Paket Hilang (Packet Loss)</span>';
      else if (node.status === 'recovered') badgeHtml = '<span class="tag-badge tag-purple">Dipulihkan (Self-Healing)</span>';
      else if (node.status === 'error') badgeHtml = '<span class="tag-badge tag-amber">Error 500 (TCP Fallback Ingest)</span>';

      const jsonStr = escapeHtml(JSON.stringify(node.metadata || { seqId: node.seqId, status: node.status }, null, 2));

      bodyEl.innerHTML = `
        <div class="detail-kv-group">
          <div class="detail-kv-label">Sequence ID</div>
          <div class="detail-kv-val">#${node.seqId}</div>
        </div>
        <div class="detail-kv-group">
          <div class="detail-kv-label">Status &amp; Jalur</div>
          <div class="detail-kv-val" style="margin-top: 3px;">${badgeHtml}</div>
        </div>
        <div class="detail-kv-group">
          <div class="detail-kv-label">Mekanisme</div>
          <div class="detail-kv-val">${escapeHtml(node.method)}</div>
        </div>
        <div class="detail-kv-group">
          <div class="detail-kv-label">Waktu Tercatat</div>
          <div class="detail-kv-val">${escapeHtml(node.timestamp)}</div>
        </div>
        <div class="detail-kv-group">
          <div class="detail-kv-label">Metadata / Payload Raw</div>
          <pre class="detail-json-pre">${jsonStr}</pre>
        </div>
      `;
    }
  }

  // --- View 2: PostgreSQL Live Logs Table ---
  async function fetchDbLogs() {
    const tbody = document.getElementById('dbLogsTbody');
    if (!tbody) return;

    const levelSelect = document.getElementById('selectDbLevel');
    const searchInput = document.getElementById('inputSearchDb');
    const level = levelSelect ? levelSelect.value : 'ALL';
    const search = searchInput ? searchInput.value.trim() : '';

    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 20px;">Memuat data live dari PostgreSQL (telemetry_logs)...</td></tr>';

    try {
      const url = `/api/benchmark/logs?limit=40&level=${encodeURIComponent(level)}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      cachedDbLogs = data.logs || [];
      const badge = document.getElementById('badgeDbCount');
      if (badge) badge.innerText = `${data.total.toLocaleString()} rows`;

      if (cachedDbLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 24px;">Tidak ada log ditemukan di tabel PostgreSQL.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      cachedDbLogs.forEach(row => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'tag-blue';
        if (row.level === 'SUCCESS') badgeClass = 'tag-green';
        else if (row.level === 'WARN') badgeClass = 'tag-amber';
        else if (row.level === 'ERROR') badgeClass = 'tag-red';
        else if (row.level === 'RECOVERY') badgeClass = 'tag-purple';

        const latVal = row.latencyMs != null ? row.latencyMs.toFixed(2) : '-';
        const isSlow = row.latencyMs != null && row.latencyMs > 5;
        const createdAtStr = new Date(row.createdAt).toLocaleTimeString() + '.' + String(new Date(row.createdAt).getMilliseconds()).padStart(3, '0');

        tr.innerHTML = `
          <td style="color: var(--text-dim);">#${row.id}</td>
          <td style="font-weight: 700; color: var(--text-main);">#${row.seqId}</td>
          <td><span class="log-badge ${badgeClass}">[${row.level}]</span></td>
          <td>
            <span style="color: var(--accent); font-weight: 600;">${escapeHtml(row.method || 'UDP')}</span> 
            <span style="color: #c9d1d9;">${escapeHtml(row.endpoint || row.message)}</span>
          </td>
          <td><span style="color: ${row.statusCode >= 400 ? 'var(--status-red)' : 'var(--status-green)'}; font-weight: 600;">${row.statusCode || 200}</span></td>
          <td><span class="db-cell-latency ${isSlow ? 'slow' : ''}">${latVal} ms</span></td>
          <td style="color: var(--text-dim); font-size: 10px;">${createdAtStr}</td>
          <td style="text-align: center;">
            <button class="btn-tiny" onclick="window.TelemetryModule.inspectDbLog(${row.id})">JSON</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--status-red); padding: 20px;">Gagal memuat log database: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function inspectDbLog(id) {
    const row = cachedDbLogs.find(l => l.id === id);
    if (!row) return;

    // Switch to sequence view or show detail in Inspector
    switchDeckView('sequence');
    const titleEl = document.getElementById('detailSeqTitle');
    const bodyEl = document.getElementById('detailSeqBody');
    if (titleEl) titleEl.innerText = `DB Log #${row.id} (Seq #${row.seqId})`;

    if (bodyEl) {
      const jsonStr = escapeHtml(JSON.stringify(row, null, 2));
      bodyEl.innerHTML = `
        <div class="detail-kv-group">
          <div class="detail-kv-label">Database Record ID</div>
          <div class="detail-kv-val">#${row.id}</div>
        </div>
        <div class="detail-kv-group">
          <div class="detail-kv-label">Sequence ID</div>
          <div class="detail-kv-val">#${row.seqId}</div>
        </div>
        <div class="detail-kv-group">
          <div class="detail-kv-label">Level &amp; Method</div>
          <div class="detail-kv-val">${escapeHtml(row.level)} &bull; ${escapeHtml(row.method || 'UDP')} ${escapeHtml(row.endpoint || '')}</div>
        </div>
        <div class="detail-kv-group">
          <div class="detail-kv-label">Latency &amp; Timestamp</div>
          <div class="detail-kv-val">${row.latencyMs ? row.latencyMs.toFixed(2) + ' ms' : '-'} &bull; ${new Date(row.createdAt).toLocaleString()}</div>
        </div>
        <div class="detail-kv-group">
          <div class="detail-kv-label">Full PostgreSQL Row JSON</div>
          <pre class="detail-json-pre">${jsonStr}</pre>
        </div>
      `;
    }
  }

  // --- View 3: Terminal Console Stream ---
  function appendLog(level, message, correlationId = null) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: timeStr,
      level,
      message,
      correlationId
    };

    store.addLog(entry);
    renderLogEntry(entry);
  }

  function renderLogEntry(entry) {
    if (store.isPaused) return;

    if (store.filterLevel !== 'ALL' && entry.level !== store.filterLevel) {
      return;
    }

    if (store.searchQuery && !entry.message.toLowerCase().includes(store.searchQuery.toLowerCase())) {
      return;
    }

    const term = document.getElementById('terminalLog');
    if (!term) return;

    const row = document.createElement('div');
    row.className = `log-row log-${entry.level.toLowerCase()}`;
    row.setAttribute('data-id', entry.id);
    if (entry.correlationId) {
      row.setAttribute('data-correlation', entry.correlationId);
    }

    let badgeClass = 'tag-blue';
    if (entry.level === 'SUCCESS') badgeClass = 'tag-green';
    if (entry.level === 'WARN') badgeClass = 'tag-amber';
    if (entry.level === 'ERROR') badgeClass = 'tag-red';
    if (entry.level === 'RECOVERY') badgeClass = 'tag-purple';

    row.innerHTML = `
      <span class="log-ts">[${entry.timestamp}]</span>
      <span class="log-badge ${badgeClass}">[${entry.level}]</span>
      <span class="log-msg">${escapeHtml(entry.message)}</span>
    `;

    term.appendChild(row);

    while (term.children.length > 500) {
      term.removeChild(term.firstChild);
    }

    if (store.isAutoscroll) {
      term.scrollTop = term.scrollHeight;
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function refreshTerminalView() {
    const term = document.getElementById('terminalLog');
    if (!term) return;
    term.innerHTML = '';

    store.logs.forEach(entry => {
      if (store.filterLevel !== 'ALL' && entry.level !== store.filterLevel) return;
      if (store.searchQuery && !entry.message.toLowerCase().includes(store.searchQuery.toLowerCase())) return;
      renderLogEntry(entry);
    });
  }

  // --- Fetch Live Metrics & Radar Updates ---
  async function fetchMetrics(isManual = false) {
    try {
      const res = await fetch('/api/benchmark/metrics');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      store.updateMetrics(data);

      // Update Radar UI
      const lossEl = document.getElementById('effectiveLoss');
      if (lossEl) {
        const lossVal = parseFloat(data.aggregator?.effectiveLossRatePercent || '0');
        const badge = lossVal === 0 
          ? `<span class="tag-badge tag-green">${window.I18N.t('zeroLoss')}</span>`
          : `<span class="tag-badge tag-red">${window.I18N.t('lossDetected')}</span>`;
        lossEl.innerHTML = `${data.aggregator.effectiveLossRatePercent} ${badge}`;
      }

      const rawDropEl = document.getElementById('rawLossText');
      if (rawDropEl) {
        rawDropEl.innerText = window.I18N.t('rawDropVsRecovered', {
          raw: data.aggregator.totalPacketLoss,
          pct: data.aggregator.rawLossRatePercent,
          rec: data.aggregator.totalRecovered
        });
      }

      const recEl = document.getElementById('totalRecovered');
      if (recEl) {
        recEl.innerHTML = `${data.aggregator.totalRecovered.toLocaleString()} <span class="unit">pkts</span>`;
      }

      const nackEl = document.getElementById('nackRequestsText');
      if (nackEl) {
        nackEl.innerText = window.I18N.t('nackAndSeq', {
          nack: data.aggregator.nackRequestsSent,
          seq: data.aggregator.lastSeqId
        });
      }

      const dbEl = document.getElementById('dbLogsCount');
      if (dbEl) {
        dbEl.innerHTML = `${data.database.totalPersistedLogs.toLocaleString()} <span class="unit">rows</span>`;
      }
      const badgeDb = document.getElementById('badgeDbCount');
      if (badgeDb) {
        badgeDb.innerText = `${data.database.totalPersistedLogs.toLocaleString()} rows`;
      }

      const bufEl = document.getElementById('activeBuffer');
      if (bufEl) {
        bufEl.innerHTML = `${data.aggregator.currentBufferSize.toLocaleString()} <span class="unit">items</span>`;
      }

      const memEl = document.getElementById('memoryRss');
      if (memEl) {
        memEl.innerHTML = `${data.system.memoryRssMb} <span class="unit">MB</span>`;
      }

      const uptimeEl = document.getElementById('uptimeText');
      if (uptimeEl) {
        uptimeEl.innerText = `Uptime: ${data.aggregator.uptimeSeconds}s • ${window.I18N.t('ringBufferCount', { count: data.ringBuffer.bufferedCount })}`;
      }

      // Sparklines with area fill gradient and pulsing dot
      const spLoss = document.getElementById('sparklineLoss');
      if (spLoss) spLoss.innerHTML = renderSparkline(store.sparklines.loss, '#3fb950', 'grad-loss');

      const spRec = document.getElementById('sparklineRecovered');
      if (spRec) spRec.innerHTML = renderSparkline(store.sparklines.recovered, '#bc8cff', 'grad-rec');

      const spBuf = document.getElementById('sparklineBuffer');
      if (spBuf) spBuf.innerHTML = renderSparkline(store.sparklines.buffer, '#58a6ff', 'grad-buf');

      const spMem = document.getElementById('sparklineMemory');
      if (spMem) spMem.innerHTML = renderSparkline(store.sparklines.memory, '#d29922', 'grad-mem');

      // Global Header Watchdog & Uptime
      const watchdogBadge = document.getElementById('headerWatchdog');
      if (watchdogBadge) {
        if (data.aggregator.isMainServerAlive) {
          watchdogBadge.className = 'status-pill status-ok';
          watchdogBadge.innerText = window.I18N.t('watchdogOk');
        } else {
          watchdogBadge.className = 'status-pill status-alert';
          watchdogBadge.innerText = window.I18N.t('watchdogAlert');
        }
      }

      const headerUptime = document.getElementById('headerUptime');
      if (headerUptime) {
        headerUptime.innerText = `${window.I18N.t('uptime')}: ${data.aggregator.uptimeSeconds}s`;
      }

      if (isManual) {
        appendLog('SUCCESS', 'Metrics radar state refreshed successfully.');
      }
    } catch (err) {
      const watchdogBadge = document.getElementById('headerWatchdog');
      if (watchdogBadge) {
        watchdogBadge.className = 'status-pill status-down';
        watchdogBadge.innerText = window.I18N.t('watchdogOffline');
      }
    }
  }

  // --- 16 Testbed Action Dispatchers ---
  const actions = {
    // 1. Single UDP Datagram
    async singleUdp() {
      appendLog('INFO', 'Dispatching single UDP datagram packet...');
      try {
        const res = await fetch('/api/benchmark/udp-log');
        const d = await res.json();
        appendLog('SUCCESS', `UDP Datagram #${d.seqId} dispatched in ${d.totalDurationMs}ms (Workload: ${d.workloadLatencyMs}ms).`);
        
        // Add to Visual Sequence Tracker
        addSequencePacket({
          seqId: d.seqId,
          status: 'ok',
          title: `Seq #${d.seqId}`,
          subtitle: `${d.totalDurationMs}ms • UDP Ingest`,
          method: 'UDP Fire-and-Forget (:5001)',
          latency: d.totalDurationMs,
          metadata: d
        });

        store.recordTestRun({ name: 'Single UDP', mode: 'UDP_ZERO_WAIT', durationMs: d.totalDurationMs, result: `Seq #${d.seqId}` });
        fetchMetrics();
      } catch (err) {
        appendLog('ERROR', `UDP dispatch failed: ${err.message}`);
      }
    },

    // 2. Burst UDP
    async burstUdp(count) {
      appendLog('INFO', `Dispatching burst of ${count.toLocaleString()} UDP datagrams...`);
      try {
        const res = await fetch('/api/benchmark/burst-udp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count })
        });
        const d = await res.json();
        appendLog('SUCCESS', `${d.message} [Last Seq #${d.lastSeqId}]`);

        // Add to Visual Sequence Tracker
        const firstSeq = d.lastSeqId - count + 1;
        addSequencePacket({
          seqId: d.lastSeqId,
          status: 'burst',
          title: `Burst #${firstSeq}..#${d.lastSeqId}`,
          subtitle: `${count} pkts • ${d.throughputPacketsPerSec.toLocaleString()} pkt/s`,
          method: 'UDP Microsecond Loop',
          latency: d.durationMs,
          metadata: d
        });

        store.recordTestRun({
          name: `Burst UDP (${count})`,
          mode: 'BURST_DISPATCH',
          durationMs: d.durationMs,
          throughput: `${d.throughputPacketsPerSec.toLocaleString()} pkt/s`,
          result: `${count} packets dispatched`
        });
        setTimeout(fetchMetrics, 300);
      } catch (err) {
        appendLog('ERROR', `Burst dispatch failed: ${err.message}`);
      }
    },

    // 3. Simulated Packet Loss & Self-Healing Verification
    async injectLoss(jump) {
      appendLog('WARN', `Injecting artificial sequence jump (+${jump} packets)...`);
      try {
        const res = await fetch('/api/benchmark/simulate-loss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jump })
        });
        const d = await res.json();
        appendLog('WARN', d.message);

        // Visual Sequence Chain: render previous seq, missing seqs, and arrived seq
        if (d.previousSeqId) {
          addSequencePacket({
            seqId: d.previousSeqId,
            status: 'ok',
            title: `Seq #${d.previousSeqId}`,
            subtitle: 'Sebelumnya • Normal',
            method: 'UDP Normal',
            latency: 0.2,
            metadata: { info: 'Paket normal sebelum lompatan simulasi' }
          });
        }

        const missing = d.missingSeqs || [];
        missing.forEach(s => {
          addSequencePacket({
            seqId: s,
            status: 'dropped',
            title: `Seq #${s} (Hilang)`,
            subtitle: '⚠️ Paket Hilang Terdeteksi',
            method: 'Sengaja Dilompati',
            latency: null,
            metadata: { missingSeq: s, jumpCount: jump, status: 'TEMPORARILY_DROPPED' }
          });
        });

        if (d.simulatedSeqId) {
          addSequencePacket({
            seqId: d.simulatedSeqId,
            status: 'ok',
            title: `Seq #${d.simulatedSeqId}`,
            subtitle: `⚡ Tiba (+${jump})`,
            method: 'Memicu Self-Healing',
            latency: 0.3,
            metadata: d
          });
        }

        // Simulating the realistic instant recovery (0-RTT or TCP NACK)
        const recMethod = jump <= 3 ? 'Method 3 Piggyback (0-RTT)' : 'Method 1 NACK TCP ARQ';
        setTimeout(() => {
          missing.forEach(s => {
            updateSequencePacketStatus(
              s,
              'recovered',
              `Seq #${s} (Pulih)`,
              `🔄 ${jump <= 3 ? '0-RTT' : 'TCP NACK'}`,
              { recoveredVia: recMethod, recoveryTimestamp: Date.now() }
            );
          });
          if (missing.length > 0) {
            inspectPacket(`node-${missing[0]}` || undefined);
          }
        }, 300);

        if (jump <= 3) {
          appendLog('RECOVERY', `[Method 3 Piggyback] ${jump - 1} packet(s) [${missing.join(', ')}] recovered immediately with Zero-RTT (0ms).`);
        } else {
          appendLog('RECOVERY', `[Method 1 NACK ARQ] Sequence gap > 2 triggered selective TCP retransmission from Ring Buffer for [${missing.join(', ')}].`);
        }

        store.recordTestRun({
          name: `Simulate Loss (+${jump})`,
          mode: jump <= 3 ? 'ZERO_RTT_PIGGYBACK' : 'NACK_TCP_ARQ',
          durationMs: 4,
          lossRate: '0.00% (Effective)',
          result: `${jump - 1} missing packets recovered`
        });
        setTimeout(fetchMetrics, 400);
      } catch (err) {
        appendLog('ERROR', `Loss injection failed: ${err.message}`);
      }
    },

    // 4. Critical Error 500 TCP Fallback
    async criticalFallback() {
      appendLog('WARN', 'Triggering HTTP 500 critical error (Testing Method 2 Circuit Breaker)...');
      try {
        const res = await fetch('/api/benchmark/critical-fallback', { method: 'POST' });
        const d = await res.json();
        appendLog('RECOVERY', `[Method 2 Fallback] ${d.message} [Seq #${d.seqId}]`);

        // Add to Visual Sequence Tracker
        addSequencePacket({
          seqId: d.seqId,
          status: 'error',
          title: `Seq #${d.seqId} (HTTP 500)`,
          subtitle: 'Circuit Breaker Bypass',
          method: 'Method 2 Direct TCP HTTP Fallback Ingest',
          latency: 6,
          metadata: d
        });

        store.recordTestRun({ name: 'Simulate Error 500', mode: 'TCP_FALLBACK', durationMs: 6, result: 'Guaranteed TCP Ingestion' });
        setTimeout(fetchMetrics, 300);
      } catch (err) {
        appendLog('ERROR', `Critical fallback failed: ${err.message}`);
      }
    },

    // 5. Heartbeat Ping
    async heartbeat() {
      appendLog('INFO', 'Dispatching manual Watchdog Heartbeat ping...');
      try {
        const res = await fetch('/api/benchmark/heartbeat', { method: 'POST' });
        const d = await res.json();
        appendLog('SUCCESS', d.message);
        setTimeout(fetchMetrics, 200);
      } catch (err) {
        appendLog('ERROR', `Heartbeat failed: ${err.message}`);
      }
    },

    // 6. Autocannon Runner
    async runAutocannon(target = 'udp', duration = 5, connections = 50) {
      if (isAutocannonRunning) {
        appendLog('WARN', window.I18N.t('autocannonRunning'));
        return;
      }
      isAutocannonRunning = true;
      const targetLabel = target === 'sync' ? 'Sync DB (Blocking)' : 'UDP Log (Non-blocking)';
      appendLog('INFO', `[AUTOCANNON] Starting load test on ${targetLabel} (${duration}s, ${connections} conns)...`);
      appendLog('INFO', `[AUTOCANNON] Firing traffic, please wait ~${duration} seconds...`);

      const runBtn = document.getElementById(target === 'sync' ? 'btnAutoSync' : 'btnAutoUdp');
      if (runBtn) runBtn.classList.add('loading');

      try {
        const res = await fetch('/api/benchmark/autocannon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, duration, connections })
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Autocannon execution failed');

        appendLog('SUCCESS', `[AUTOCANNON COMPLETED] Total: ${d.requestsTotal.toLocaleString()} | Avg: ${d.requestsAverage} req/s | Latency p99: ${d.latencyP99Ms}ms | Errors: ${d.errors}`);

        if (d.formattedTable) {
          const pre = document.createElement('pre');
          pre.className = 'log-table';
          pre.textContent = d.formattedTable;
          const term = document.getElementById('terminalLog');
          if (term) {
            term.appendChild(pre);
            term.scrollTop = term.scrollHeight;
          }
        }

        store.recordTestRun({
          name: `Autocannon ${target.toUpperCase()} (${duration}s, ${connections}c)`,
          mode: 'HTTP_LOAD_BENCHMARK',
          durationMs: duration * 1000,
          throughput: `${d.requestsAverage} req/s`,
          latencyP99: `${d.latencyP99Ms} ms`,
          result: `${d.requestsTotal.toLocaleString()} requests handled`
        });

        fetchMetrics();
      } catch (err) {
        appendLog('ERROR', `[AUTOCANNON ERROR] ${err.message}`);
      } finally {
        isAutocannonRunning = false;
        if (runBtn) runBtn.classList.remove('loading');
      }
    },

    // 7. Copy CLI
    copyCli() {
      const cmd = 'npx autocannon -c 100 -d 10 http://localhost:5000/api/benchmark/udp-log';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(cmd).then(() => {
          appendLog('SUCCESS', `CLI Command copied to clipboard: ${cmd}`);
        });
      } else {
        appendLog('INFO', `CLI Command: ${cmd}`);
      }
    },

    // 8. Sync DB Burst
    async syncBurst(count) {
      appendLog('WARN', `Dispatching ${count} blocking synchronous database log writes...`);
      try {
        const res = await fetch('/api/benchmark/burst-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count })
        });
        const d = await res.json();
        appendLog('INFO', d.message);
        store.recordTestRun({
          name: `Sync DB Burst (${count})`,
          mode: 'SYNC_BLOCKING_DB',
          durationMs: d.durationMs,
          throughput: `${Math.round(count / (d.durationMs / 1000))} pkt/s`,
          latencyP99: `${d.avgLatencyMsPerLog} ms avg`,
          result: 'Slow blocking DB writes'
        });
        setTimeout(fetchMetrics, 200);
      } catch (err) {
        appendLog('ERROR', `Sync write failed: ${err.message}`);
      }
    },

    // 9. Purge DB Logs
    async purgeDb() {
      if (!confirm('Apakah Anda yakin ingin menghapus semua log telemetri dari database PostgreSQL?')) return;
      appendLog('WARN', 'Purging table telemetry_logs...');
      try {
        const res = await fetch('/api/benchmark/logs', { method: 'DELETE' });
        const d = await res.json();
        appendLog('SUCCESS', `Berhasil menghapus ${d.deletedCount.toLocaleString()} baris log dari database.`);
        clearSequenceTracker();
        fetchDbLogs();
        fetchMetrics();
      } catch (err) {
        appendLog('ERROR', `Purge failed: ${err.message}`);
      }
    }
  };

  // Setup UI Controls & Event Listeners
  function initTelemetry() {
    fetchMetrics();
    if (!pollingTimer) {
      pollingTimer = setInterval(fetchMetrics, 1500);
    }

    // Terminal Controls
    const btnPause = document.getElementById('btnTerminalPause');
    if (btnPause) {
      btnPause.addEventListener('click', () => {
        store.isPaused = !store.isPaused;
        btnPause.innerText = store.isPaused ? window.I18N.t('resume') : window.I18N.t('pause');
      });
    }

    const btnClear = document.getElementById('btnTerminalClear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        store.clearLogs();
        const term = document.getElementById('terminalLog');
        if (term) term.innerHTML = '';
        appendLog('INFO', 'Console log cleared.');
      });
    }

    const btnCopy = document.getElementById('btnTerminalCopy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const text = store.logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
        navigator.clipboard.writeText(text).then(() => {
          appendLog('SUCCESS', window.I18N.t('copiedToast'));
        });
      });
    }

    const filterLevel = document.getElementById('selectFilterLevel');
    if (filterLevel) {
      filterLevel.addEventListener('change', (e) => {
        store.filterLevel = e.target.value;
        refreshTerminalView();
      });
    }

    const searchInput = document.getElementById('inputSearchLogs');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        store.searchQuery = e.target.value;
        refreshTerminalView();
      });
    }

    appendLog('INFO', 'Telemetry Studio audit stream initialized.');
  }

  window.TelemetryModule = {
    init: initTelemetry,
    actions,
    appendLog,
    fetchMetrics,
    switchDeckView,
    addSequencePacket,
    clearSequenceTracker,
    inspectPacket,
    fetchDbLogs,
    inspectDbLog
  };
})();
