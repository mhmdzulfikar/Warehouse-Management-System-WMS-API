/**
 * WMS Nexus • Studio Main Application Coordinator
 * Handles tab routing via URL hash, keyboard shortcuts, and module orchestration.
 */
(function() {
  const store = window.StudioStore;

  function initApp() {
    // 1. Apply theme & language
    document.documentElement.setAttribute('data-theme', store.theme);
    window.I18N.applyTranslations();

    // 2. Initialize modules
    window.TelemetryModule.init();
    window.ArchitectureModule.init();

    // 3. Bind Tab Buttons
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-tab-target');
        switchTab(target);
      });
    });

    // 4. Handle initial hash or fallback
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    // 5. Global Keyboard Shortcuts
    window.addEventListener('keydown', handleKeydown);

    // 6. Bind Header Buttons
    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) btnTheme.addEventListener('click', () => store.toggleTheme());

    const btnLang = document.getElementById('btnLangToggle');
    if (btnLang) {
      btnLang.addEventListener('click', () => {
        const nextLang = window.I18N.getLang() === 'id' ? 'en' : 'id';
        window.I18N.setLanguage(nextLang);
      });
    }

    const btnPalette = document.getElementById('btnOpenPalette');
    if (btnPalette) btnPalette.addEventListener('click', () => window.PaletteModule.openPalette());

    const btnTour = document.getElementById('btnStartTour');
    if (btnTour) btnTour.addEventListener('click', () => window.PaletteModule.startTour());

    const paletteInput = document.getElementById('paletteInput');
    if (paletteInput) {
      paletteInput.addEventListener('input', (e) => window.PaletteModule.filterPalette(e.target.value));
    }

    const paletteModal = document.getElementById('paletteModal');
    if (paletteModal) {
      paletteModal.addEventListener('click', (e) => {
        if (e.target === paletteModal) window.PaletteModule.closePalette();
      });
    }

    // Auto-launch guided tour for first-time visitors
    if (!localStorage.getItem('nexus_tour_completed')) {
      setTimeout(() => {
        window.PaletteModule.startTour();
        localStorage.setItem('nexus_tour_completed', 'true');
      }, 1200);
    }
  }

  function handleHashChange() {
    const rawHash = window.location.hash.replace('#', '').toLowerCase();
    const validTabs = ['telemetry', 'api', 'architecture'];
    const active = validTabs.includes(rawHash) ? rawHash : 'telemetry';
    switchTab(active, false);
  }

  function switchTab(tabId, updateHash = true) {
    store.activeTab = tabId;

    // Update Tab Buttons UI
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab-target') === tabId;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    // Update Tab Panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      const isTarget = pane.id === `tab-${tabId}`;
      pane.classList.toggle('active', isTarget);
    });

    // Update URL hash without jumping page scroll
    if (updateHash && window.location.hash !== `#${tabId}`) {
      history.replaceState(null, '', `#${tabId}`);
    }

    // Lazy load Swagger UI on first entry to Tab 2
    if (tabId === 'api' && !window.swaggerLoaded) {
      window.swaggerLoaded = true;
      setTimeout(() => {
        window.ApiModule.init();
      }, 50);
    }

    // Scroll window smoothly to top of content
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function handleKeydown(e) {
    // Command Palette: Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      window.PaletteModule.openPalette();
      return;
    }

    // Escape closes modals
    if (e.key === 'Escape') {
      window.PaletteModule.closePalette();
      window.PaletteModule.closeTour();
      return;
    }

    // Numeric Tab Switching if not typing in inputs
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    if (!isTyping) {
      if (e.key === '1') switchTab('telemetry');
      if (e.key === '2') switchTab('api');
      if (e.key === '3') switchTab('architecture');
      if (e.key.toLowerCase() === 't') store.toggleTheme();
      if (e.key === '?') window.PaletteModule.startTour();
    }
  }

  document.addEventListener('DOMContentLoaded', initApp);

  window.StudioApp = {
    switchTab
  };
})();
