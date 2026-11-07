/**
 * WMS Nexus • Studio Central State Manager
 * Handles reactive state, sessionStorage tokens, metrics history, and event bus.
 */
class StudioStore {
  constructor() {
    this.theme = localStorage.getItem('nexus_studio_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    this.activeTab = 'telemetry';
    this.token = sessionStorage.getItem('nexus_jwt_token') || '';
    this.user = JSON.parse(sessionStorage.getItem('nexus_user_data') || 'null');
    
    // Telemetry & Metrics
    this.metrics = null;
    this.sparklines = {
      loss: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      recovered: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      buffer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      memory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };

    // Terminal
    this.logs = [];
    this.maxLogs = 1000; // Hard memory buffer limit
    this.isPaused = false;
    this.isAutoscroll = true;
    this.filterLevel = 'ALL';
    this.searchQuery = '';

    // History of test runs for export
    this.testHistory = JSON.parse(localStorage.getItem('nexus_test_history') || '[]');

    // Listeners
    this.subscribers = new Map();
  }

  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
    return () => this.subscribers.get(event).delete(callback);
  }

  emit(event, data) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error('Store emit error', e); }
      });
    }
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('nexus_studio_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.emit('themeChange', theme);
  }

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  setToken(token, user = null) {
    this.token = token;
    this.user = user;
    if (token) {
      sessionStorage.setItem('nexus_jwt_token', token);
      if (user) sessionStorage.setItem('nexus_user_data', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('nexus_jwt_token');
      sessionStorage.removeItem('nexus_user_data');
    }
    this.emit('authChange', { token, user });
  }

  updateMetrics(metrics) {
    this.metrics = metrics;
    // Push into sparkline history
    const lossNum = parseFloat(metrics.aggregator?.effectiveLossRatePercent || '0');
    const recNum = metrics.aggregator?.totalRecovered || 0;
    const bufNum = metrics.aggregator?.currentBufferSize || 0;
    const memNum = parseFloat(metrics.system?.memoryRssMb || '0');

    this.sparklines.loss.push(lossNum);
    this.sparklines.loss.shift();
    this.sparklines.recovered.push(recNum);
    this.sparklines.recovered.shift();
    this.sparklines.buffer.push(bufNum);
    this.sparklines.buffer.shift();
    this.sparklines.memory.push(memNum);
    this.sparklines.memory.shift();

    this.emit('metricsUpdated', metrics);
  }

  addLog(logEntry) {
    if (this.logs.length >= this.maxLogs) {
      this.logs.shift(); // FIFO pruning to prevent memory leak
    }
    this.logs.push(logEntry);
    this.emit('logAdded', logEntry);
  }

  clearLogs() {
    this.logs = [];
    this.emit('logsCleared');
  }

  recordTestRun(run) {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      name: run.name,
      mode: run.mode,
      durationMs: run.durationMs,
      throughput: run.throughput || '-',
      latencyP99: run.latencyP99 || '-',
      lossRate: run.lossRate || '0.00%',
      result: run.result,
      status: run.status || 'SUCCESS'
    };
    this.testHistory.unshift(entry);
    if (this.testHistory.length > 50) this.testHistory.pop();
    localStorage.setItem('nexus_test_history', JSON.stringify(this.testHistory));
    this.emit('testRecorded', entry);
  }
}

window.StudioStore = new StudioStore();
