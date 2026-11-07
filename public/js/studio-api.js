/**
 * WMS Nexus • Studio REST API & Swagger Module (Tab 2)
 * Integrates themed Swagger UI, Quickstart automation, and Cause & Effect linking.
 */
(function() {
  const store = window.StudioStore;
  let swaggerInstance = null;

  function initSwagger() {
    const container = document.getElementById('swagger-ui-container');
    if (!container) return;

    if (window.SwaggerUIBundle) {
      swaggerInstance = window.SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui-container',
        deepLinking: true,
        presets: [
          window.SwaggerUIBundle.presets.apis,
          window.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout',
        requestInterceptor: (req) => {
          // Attach correlation ID for Cause & Effect Linking
          const corrId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          req.headers['X-Request-Id'] = corrId;

          // Attach JWT token from sessionStorage if exists
          if (store.token && !req.headers['Authorization']) {
            req.headers['Authorization'] = `Bearer ${store.token}`;
          }
          return req;
        },
        responseInterceptor: (res) => {
          // Catch response for Cause & Effect Linking
          const corrId = res.headers['x-request-id'] || res.headers['X-Request-Id'];
          if (corrId && res.url && !res.url.includes('/api/benchmark')) {
            const urlPath = new URL(res.url, window.location.origin).pathname;
            showCauseEffectToast(res.status, urlPath, corrId);
          }
          return res;
        }
      });

      // If token already exists in session, apply to swagger
      if (store.token && swaggerInstance.preauthorizeApiKey) {
        swaggerInstance.preauthorizeApiKey('bearerAuth', store.token);
      }
    }
  }

  // Quick Start Actions
  async function autoLoginDemo() {
    const btn = document.getElementById('btnQuickLogin');
    if (btn) btn.classList.add('loading');

    try {
      window.TelemetryModule.appendLog('INFO', 'Logging in with demo manager account (bapak_manager)...');
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'bapak_manager',
          password: 'password123'
        })
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Login failed');

      store.setToken(d.token, d.user);

      // Preauthorize Swagger UI
      if (swaggerInstance && swaggerInstance.preauthorizeApiKey) {
        swaggerInstance.preauthorizeApiKey('bearerAuth', d.token);
      }

      window.TelemetryModule.appendLog('SUCCESS', `Authenticated as "${d.user.username}" (Role: ${d.user.role?.name || 'Manager'}). JWT token injected.`);
      showToast('Kunci akses demo berhasil diaktifkan! Token otomatis terpasang.', 'success');

      // Update quickstart badge
      const statusPill = document.getElementById('quickstartAuthStatus');
      if (statusPill) {
        statusPill.className = 'status-pill status-ok';
        statusPill.innerText = 'Tersambung (Manager)';
      }
    } catch (err) {
      window.TelemetryModule.appendLog('ERROR', `Demo login failed: ${err.message}`);
      showToast(`Login gagal: ${err.message}`, 'error');
    } finally {
      if (btn) btn.classList.remove('loading');
    }
  }

  async function triggerSamplePo() {
    if (!store.token) {
      await autoLoginDemo();
    }

    const btn = document.getElementById('btnQuickPo');
    if (btn) btn.classList.add('loading');

    const correlationId = `po_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    window.TelemetryModule.appendLog('INFO', `Creating sample Purchase Order with Correlation ID [${correlationId}]...`);

    try {
      const res = await fetch('/api/po', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${store.token}`,
          'X-Request-Id': correlationId
        },
        body: JSON.stringify({
          supplierId: 1,
          warehouseId: 1,
          notes: 'Sample PO generated from Studio Quick Start',
          items: [
            { productId: 1, qty: 25, unitPrice: 150000 }
          ]
        })
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'PO creation failed');

      window.TelemetryModule.appendLog('SUCCESS', `PO created successfully (ID #${d.data?.id || 'OK'}). Telemetry captured.`);
      showCauseEffectToast(res.status, '/api/po', correlationId);
    } catch (err) {
      window.TelemetryModule.appendLog('ERROR', `PO creation error: ${err.message}`);
      showToast(`Gagal membuat PO: ${err.message}`, 'error');
    } finally {
      if (btn) btn.classList.remove('loading');
    }
  }

  // Cause & Effect Linking Toast
  function showCauseEffectToast(status, path, correlationId) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-cause-effect';
    toast.innerHTML = `
      <div class="toast-icon">⚡</div>
      <div class="toast-body">
        <div class="toast-title">Cause & Effect Linked</div>
        <div class="toast-desc">
          <strong>${path}</strong> (${status}) tercatat via UDP Telemetry!
        </div>
      </div>
      <button class="btn-tiny btn-accent" onclick="window.ApiModule.jumpToLog('${correlationId}')">
        Lihat di Lab →
      </button>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 8000);
  }

  function jumpToLog(correlationId) {
    // Switch to tab telemetry
    window.StudioApp.switchTab('telemetry');

    // Wait 100ms for DOM render
    setTimeout(() => {
      const row = document.querySelector(`[data-correlation="${correlationId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('pulse-highlight');
        setTimeout(() => row.classList.remove('pulse-highlight'), 3000);
      } else {
        const term = document.getElementById('terminalLog');
        if (term) term.scrollTop = term.scrollHeight;
      }
    }, 120);
  }

  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  window.ApiModule = {
    init: initSwagger,
    autoLoginDemo,
    triggerSamplePo,
    jumpToLog,
    showToast
  };
})();

