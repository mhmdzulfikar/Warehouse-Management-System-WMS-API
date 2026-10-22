/**
 * WMS Nexus - Real-Time Dashboard Client Application
 * Vanilla JS with Modular Architecture & Reactive Updates
 */

const API_BASE = window.location.origin;

// State
let token = localStorage.getItem('wms_token') || null;
let currentUser = null;
try {
    currentUser = JSON.parse(localStorage.getItem('wms_user') || 'null');
} catch (e) {
    currentUser = null;
}

let cachedWarehouses = [];
let cachedProducts = [];
let cachedSuppliers = [];

// ==========================================
// 1. API Fetch Helper with Auto-Bearer Auth
// ==========================================
async function api(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const json = await response.json();

        if (response.status === 401) {
            // Token expired or invalid
            showToast('Session expired. Please log in.', 'error');
            logout();
            return null;
        }

        if (!response.ok) {
            throw new Error(json.message || `HTTP ${response.status} Error`);
        }

        return json;
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
}

// ==========================================
// 2. Formatters
// ==========================================
function formatRupiah(amount) {
    const num = Number(amount) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getBadgeHtml(statusOrType) {
    const key = (statusOrType || '').toUpperCase();
    const map = {
        'IN': 'badge-in',
        'OUT': 'badge-out',
        'ADJUST': 'badge-adjust',
        'TRANSFER': 'badge-transfer',
        'PENDING': 'badge-pending',
        'APPROVED': 'badge-approved',
        'PARTIALLY_RECEIVED': 'badge-partial',
        'RECEIVED': 'badge-received',
        'COMPLETED': 'badge-received',
        'CRITICAL_LOW': 'badge-alert',
        'OUT_OF_STOCK': 'badge-alert'
    };
    const cls = map[key] || 'badge-pending';
    return `<span class="badge ${cls}">${key}</span>`;
}

// ==========================================
// 3. Toast Notifications
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// 4. Modal Management
// ==========================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Close modal when clicking outside box
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop') && e.target.id !== 'modal-login') {
        e.target.style.display = 'none';
    }
});

// ==========================================
// 5. Auth & User Profile
// ==========================================
function updateProfileUI() {
    const profileName = document.getElementById('profile-name');
    const profileRole = document.getElementById('profile-role');
    const avatarInitials = document.getElementById('avatar-initials');

    if (currentUser) {
        profileName.textContent = currentUser.username || 'User';
        profileRole.textContent = currentUser.role || 'Role';
        avatarInitials.textContent = (currentUser.username || 'U').substring(0, 2).toUpperCase();
        closeModal('modal-login');
    } else {
        openModal('modal-login');
    }
}

async function login(identifier, password) {
    try {
        const res = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password })
        });

        if (res && res.data) {
            token = res.data.token;
            currentUser = res.data.user;
            localStorage.setItem('wms_token', token);
            localStorage.setItem('wms_user', JSON.stringify(currentUser));

            showToast(`Welcome back, ${currentUser.username}! (${currentUser.role})`);
            updateProfileUI();
            await refreshAllData();
        }
    } catch (e) {
        // Handled in api()
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('wms_token');
    localStorage.removeItem('wms_user');
    updateProfileUI();
}

// ==========================================
// 6. Tab Navigation
// ==========================================
function switchTab(tabId) {
    // Nav links
    document.querySelectorAll('.sidebar-menu .nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tabId);
    });

    // Tab panes
    document.querySelectorAll('.view-content .tab-pane').forEach(el => {
        el.classList.remove('active');
    });

    const targetPane = document.getElementById(`pane-${tabId}`);
    if (targetPane) {
        targetPane.classList.add('active');
    }

    // Update titles
    const titles = {
        'overview': { title: 'Executive Dashboard', subtitle: 'Real-time telemetry and KPI metrics' },
        'inventory': { title: 'Stock & Inventory Control', subtitle: 'Live warehouse stock balances and thresholds' },
        'pos': { title: 'Purchase Orders (Procurement)', subtitle: 'Order requisition, approval, and receiving' },
        'transactions': { title: 'Audit Ledger & History', subtitle: 'Complete chronological item movement journal' },
        'transfer': { title: 'Inter-Warehouse Transfer', subtitle: 'Move items between distribution centers' },
        'opname': { title: 'Stock Opname / Physical Count', subtitle: 'Reconcile digital ledger with physical inventory' },
        'master': { title: 'Master Data Management', subtitle: 'Products, suppliers, and warehouse facilities' }
    };

    const info = titles[tabId] || { title: 'WMS Nexus', subtitle: 'Management Core' };
    document.getElementById('page-title').textContent = info.title;
    document.getElementById('page-subtitle').textContent = info.subtitle;

    // Load data for active tab
    if (tabId === 'overview') loadOverview();
    else if (tabId === 'inventory') loadInventory();
    else if (tabId === 'pos') loadPurchaseOrders();
    else if (tabId === 'transactions') loadTransactions();
    else if (tabId === 'transfer') populateTransferForm();
    else if (tabId === 'opname') populateOpnameForm();
    else if (tabId === 'master') loadMasterData();
}

// Sub tabs in Master Data
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('sub-tab')) {
        document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const subId = e.target.dataset.sub;
        document.querySelectorAll('.sub-pane').forEach(p => p.style.display = 'none');
        const target = document.getElementById(subId);
        if (target) target.style.display = 'block';
    }
});

// ==========================================
// 7. Loaders
// ==========================================

// --- TAB 1: OVERVIEW & KPIS ---
async function loadOverview() {
    if (!token) return;

    try {
        const res = await api('/api/dashboard/stats');
        if (!res || !res.data) return;

        const data = res.data;
        const m = data.metrics;

        // KPI Cards
        document.getElementById('metric-stock-units').textContent = (m.totalStockUnits || 0).toLocaleString();
        document.getElementById('metric-stock-value').textContent = formatRupiah(m.totalStockValue);
        document.getElementById('metric-critical-count').textContent = m.criticalStockCount || 0;
        document.getElementById('metric-pending-po').textContent = m.pendingPoCount || 0;

        // Badges in sidebar
        const alertBadge = document.getElementById('sidebar-alert-badge');
        if (m.criticalStockCount > 0) {
            alertBadge.style.display = 'inline-block';
            alertBadge.textContent = m.criticalStockCount;
        } else {
            alertBadge.style.display = 'none';
        }

        const poBadge = document.getElementById('sidebar-po-badge');
        if (m.pendingPoCount > 0) {
            poBadge.style.display = 'inline-block';
            poBadge.textContent = m.pendingPoCount;
        } else {
            poBadge.style.display = 'none';
        }

        // Activity stat boxes
        const counts = data.transactionTypeCounts || {};
        document.getElementById('count-in').textContent = counts.IN || 0;
        document.getElementById('count-out').textContent = counts.OUT || 0;
        document.getElementById('count-adjust').textContent = counts.ADJUST || 0;
        document.getElementById('count-transfer').textContent = counts.TRANSFER || 0;

        // Warehouse distribution bars
        const whContainer = document.getElementById('wh-dist-container');
        if (data.warehouseDistribution && data.warehouseDistribution.length > 0) {
            const maxUnits = Math.max(...data.warehouseDistribution.map(w => w.totalItems), 1);
            whContainer.innerHTML = data.warehouseDistribution.map(wh => {
                const percent = Math.min(100, Math.round((wh.totalItems / maxUnits) * 100));
                return `
                    <div class="wh-dist-item">
                        <div class="wh-dist-top">
                            <span>${wh.name}</span>
                            <span class="mono-cell">${wh.totalItems.toLocaleString()} units (${wh.uniqueProducts} SKUs)</span>
                        </div>
                        <div class="wh-dist-bar-track">
                            <div class="wh-dist-bar-fill" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            whContainer.innerHTML = `<div class="text-muted">No warehouse data found.</div>`;
        }

        // Critical stock radar table
        const critTbody = document.getElementById('critical-stock-tbody');
        if (data.criticalStocks && data.criticalStocks.length > 0) {
            critTbody.innerHTML = data.criticalStocks.map(item => `
                <tr>
                    <td class="mono-cell">${item.sku}</td>
                    <td><strong>${item.productName}</strong></td>
                    <td>${item.warehouseName}</td>
                    <td class="text-rose"><strong>${item.currentQty} ${item.uom}</strong></td>
                    <td>${item.minStock} ${item.uom}</td>
                    <td class="text-rose font-weight-bold">-${item.shortage}</td>
                    <td>${getBadgeHtml(item.status)}</td>
                    <td>
                        <button class="btn btn-primary btn-xs" onclick="quickCreatePoForProduct(${item.productId}, '${item.productName.replace(/'/g, "\\'")}')">
                            Order PO
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            critTbody.innerHTML = `<tr><td colspan="8" class="text-center text-emerald" style="padding: 24px;">All inventory stocks are healthy above minimum safety thresholds!</td></tr>`;
        }

        // Recent POs list
        const posList = document.getElementById('recent-pos-list');
        if (data.recentPurchaseOrders && data.recentPurchaseOrders.length > 0) {
            posList.innerHTML = data.recentPurchaseOrders.map(po => `
                <div class="wh-dist-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:700;">PO #${po.id} &bull; ${po.supplierName}</div>
                        <div class="text-muted" style="font-size:0.75rem;">By ${po.createdByUser} on ${formatDate(po.createdAt)} &bull; ${formatRupiah(po.totalAmount)}</div>
                    </div>
                    <div>
                        ${getBadgeHtml(po.status)}
                    </div>
                </div>
            `).join('');
        } else {
            posList.innerHTML = `<div class="text-muted">No purchase orders recorded yet.</div>`;
        }

        // Recent Transactions list
        const txList = document.getElementById('recent-transactions-list');
        if (data.recentTransactions && data.recentTransactions.length > 0) {
            txList.innerHTML = data.recentTransactions.map(tx => {
                const itemSummary = tx.items.map(i => `${i.productName} (${i.qtyChange > 0 ? '+' : ''}${i.qtyChange})`).join(', ');
                return `
                    <div class="wh-dist-item" style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:600;">${getBadgeHtml(tx.type)} <span style="font-size:0.8rem; margin-left:6px;">${tx.referenceType || 'Manual'}</span></div>
                            <div class="text-muted" style="font-size:0.75rem; margin-top:2px;">${itemSummary} &bull; by ${tx.createdByUser} (${formatDate(tx.timestamp)})</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            txList.innerHTML = `<div class="text-muted">No ledger entries recorded yet.</div>`;
        }

    } catch (e) {
        console.error('Failed to load overview:', e);
    }
}

// --- TAB 2: INVENTORY ---
async function loadInventory() {
    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Fetching latest stock records...</td></tr>`;

    try {
        const whFilter = document.getElementById('inv-wh-filter').value;
        const search = document.getElementById('inv-search').value;

        let query = '?page=1&limit=100';
        if (whFilter) query += `&warehouseId=${whFilter}`;

        const res = await api(`/api/inventory${query}`);
        if (!res || !res.data) return;

        let items = res.data;
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(it => 
                (it.product?.name && it.product.name.toLowerCase().includes(q)) ||
                (it.product?.sku && it.product.sku.toLowerCase().includes(q))
            );
        }

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No inventory records matching criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(inv => {
            const p = inv.product || {};
            const wh = inv.warehouse || {};
            const basePrice = Number(p.basePrice) || 0;
            const assetValue = inv.currentQty * basePrice;
            const isCritical = inv.currentQty <= (p.minStock ?? 10);
            const statusHtml = isCritical
                ? `<span class="badge badge-alert">LOW (${inv.currentQty}/${p.minStock ?? 10})</span>`
                : `<span class="badge badge-received">HEALTHY</span>`;

            return `
                <tr>
                    <td class="mono-cell">${p.sku || '-'}</td>
                    <td><strong>${p.name || '-'}</strong></td>
                    <td>${wh.name || '-'}</td>
                    <td><strong>${inv.currentQty}</strong></td>
                    <td>${p.uom || 'pcs'}</td>
                    <td>${formatRupiah(basePrice)}</td>
                    <td class="text-emerald"><strong>${formatRupiah(assetValue)}</strong></td>
                    <td>${p.minStock ?? 10}</td>
                    <td>${statusHtml}</td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-rose">Failed to load inventory.</td></tr>`;
    }
}

// --- TAB 3: PURCHASE ORDERS ---
async function loadPurchaseOrders() {
    const tbody = document.getElementById('pos-tbody');
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">Fetching purchase orders...</td></tr>`;

    try {
        const statusFilter = document.getElementById('po-status-filter').value;
        let query = '?page=1&limit=50';
        if (statusFilter) query += `&status=${statusFilter}`;

        const res = await api(`/api/po${query}`);
        if (!res || !res.data) return;

        const pos = res.data;
        if (pos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No purchase orders found.</td></tr>`;
            return;
        }

        const isManager = currentUser && (currentUser.role.toUpperCase() === 'MANAGER' || currentUser.role.toUpperCase() === 'ADMIN');
        const isGudang = currentUser && (currentUser.role.toUpperCase() === 'STAFF GUDANG' || isManager);

        tbody.innerHTML = pos.map(po => {
            const itemsSummary = (po.poItems || []).map(i => `${i.product?.name || 'Item'} (${i.receivedQty}/${i.qty})`).join(', ');
            const totalAmount = (po.poItems || []).reduce((acc, it) => acc + (it.qty * Number(it.expectedPrice)), 0);

            let actionBtn = '-';
            if (po.status === 'PENDING') {
                if (isManager) {
                    actionBtn = `<button class="btn btn-primary btn-xs" onclick="approvePo(${po.id})">Approve PO</button>`;
                } else {
                    actionBtn = `<span class="text-muted" style="font-size:0.75rem;">Waiting Manager</span>`;
                }
            } else if (po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') {
                if (isGudang) {
                    actionBtn = `<button class="btn btn-success btn-xs" onclick="openReceiveModal(${po.id})">Receive Goods</button>`;
                } else {
                    actionBtn = `<span class="text-muted" style="font-size:0.75rem;">Ready to Receive</span>`;
                }
            } else if (po.status === 'RECEIVED') {
                actionBtn = `<span class="text-emerald" style="font-size:0.78rem; font-weight:700;">&check; Done</span>`;
            }

            return `
                <tr>
                    <td class="mono-cell">#${po.id}</td>
                    <td><strong>${po.supplier?.name || '-'}</strong></td>
                    <td>${po.createdBy?.username || '-'}</td>
                    <td>${po.approvedBy?.username || '-'}</td>
                    <td>${formatDate(po.createdAt)}</td>
                    <td style="max-width:220px; font-size:0.8rem;">${itemsSummary}</td>
                    <td class="text-emerald font-weight-bold">${formatRupiah(totalAmount)}</td>
                    <td>${getBadgeHtml(po.status)}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-rose">Failed to load purchase orders.</td></tr>`;
    }
}

async function approvePo(poId) {
    if (!confirm(`Are you sure you want to approve Purchase Order #${poId}?`)) return;

    try {
        const res = await api(`/api/po/${poId}/approve`, { method: 'PATCH', body: JSON.stringify({}) });
        if (res) {
            showToast(`Purchase Order #${poId} successfully APPROVED!`);
            loadPurchaseOrders();
            loadOverview();
        }
    } catch (e) {}
}

async function openReceiveModal(poId) {
    // Find PO details
    const res = await api(`/api/po?page=1&limit=100`);
    const po = (res.data || []).find(p => p.id === poId);
    if (!po) return;

    document.getElementById('receive-po-id').value = poId;
    document.getElementById('receive-po-id-label').textContent = poId;

    const container = document.getElementById('receive-items-container');
    container.innerHTML = po.poItems.map(item => {
        const remaining = item.qty - item.receivedQty;
        return `
            <div class="form-group" style="padding: 10px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border-subtle); margin-bottom: 10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                    <strong>${item.product?.name || 'Product'}</strong>
                    <span class="text-muted" style="font-size:0.78rem;">Remaining: <strong>${remaining}</strong> / ${item.qty}</span>
                </div>
                <div class="form-grid-2">
                    <div>
                        <label style="font-size:0.75rem;">Qty Coming Today</label>
                        <input type="number" class="form-control receive-item-qty" data-product-id="${item.productId}" max="${remaining}" min="0" value="${remaining}">
                    </div>
                    <div>
                        <label style="font-size:0.75rem;">Unit Expected</label>
                        <input type="text" class="form-control" value="${formatRupiah(item.expectedPrice)}" disabled>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    openModal('modal-receive-po');
}

// --- TAB 4: TRANSACTIONS LEDGER ---
async function loadTransactions() {
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Fetching audit ledger entries...</td></tr>`;

    try {
        const typeFilter = document.getElementById('ledger-type-filter').value;
        let query = '?page=1&limit=50';
        if (typeFilter) query += `&type=${typeFilter}`;

        const res = await api(`/api/transactions${query}`);
        if (!res || !res.data) return;

        const txs = res.data;
        if (txs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No ledger transactions found.</td></tr>`;
            return;
        }

        tbody.innerHTML = txs.map(tx => {
            const itemsHtml = (tx.transactionItems || []).map(it => {
                const sign = it.qtyChange > 0 ? '+' : '';
                const color = it.qtyChange > 0 ? 'text-emerald' : 'text-rose';
                return `<div>${it.product?.name} &bull; <strong>${it.warehouse?.name}</strong>: <span class="${color}"><strong>${sign}${it.qtyChange}</strong></span></div>`;
            }).join('');

            return `
                <tr>
                    <td class="mono-cell">#${tx.id}</td>
                    <td>${getBadgeHtml(tx.type)}</td>
                    <td>${tx.referenceType || 'Manual Operation'}</td>
                    <td><strong>${tx.createdBy?.username || '-'}</strong></td>
                    <td>${formatDate(tx.timestamp)}</td>
                    <td style="font-size:0.82rem;">${itemsHtml}</td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-rose">Failed to load transactions.</td></tr>`;
    }
}

// --- TAB 7: MASTER DATA ---
async function loadMasterData() {
    // 1. Products
    const prodTbody = document.getElementById('master-products-tbody');
    try {
        const res = await api('/api/products?page=1&limit=100');
        cachedProducts = res.data || [];
        prodTbody.innerHTML = cachedProducts.map(p => `
            <tr>
                <td class="mono-cell">${p.sku}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.uom}</td>
                <td class="text-emerald">${formatRupiah(p.basePrice)}</td>
                <td>${p.minStock ?? 10}</td>
            </tr>
        `).join('');
    } catch (e) {}

    // 2. Warehouses
    const whTbody = document.getElementById('master-warehouses-tbody');
    try {
        const res = await api('/api/warehouses?page=1&limit=100');
        cachedWarehouses = res.data || [];
        whTbody.innerHTML = cachedWarehouses.map(w => `
            <tr>
                <td class="mono-cell">#${w.id}</td>
                <td><strong>${w.name}</strong></td>
                <td>${w.location}</td>
            </tr>
        `).join('');
    } catch (e) {}

    // 3. Suppliers
    const supTbody = document.getElementById('master-suppliers-tbody');
    try {
        const res = await api('/api/suppliers?page=1&limit=100');
        cachedSuppliers = res.data || [];
        supTbody.innerHTML = cachedSuppliers.map(s => `
            <tr>
                <td class="mono-cell">#${s.id}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.contactInfo || '-'}</td>
                <td>${s.address || '-'}</td>
            </tr>
        `).join('');
    } catch (e) {}
}

// ==========================================
// 8. Populate Form Dropdowns
// ==========================================
async function ensureMetadata() {
    if (cachedWarehouses.length === 0) {
        const res = await api('/api/warehouses?page=1&limit=100');
        cachedWarehouses = res.data || [];
    }
    if (cachedProducts.length === 0) {
        const res = await api('/api/products?page=1&limit=100');
        cachedProducts = res.data || [];
    }
    if (cachedSuppliers.length === 0) {
        const res = await api('/api/suppliers?page=1&limit=100');
        cachedSuppliers = res.data || [];
    }

    // Populate filter dropdown in Inventory tab
    const invWhFilter = document.getElementById('inv-wh-filter');
    if (invWhFilter && invWhFilter.options.length <= 1) {
        cachedWarehouses.forEach(wh => {
            const opt = document.createElement('option');
            opt.value = wh.id;
            opt.textContent = wh.name;
            invWhFilter.appendChild(opt);
        });
    }

    // Populate warehouse dropdown in Receive modal
    const recWh = document.getElementById('receive-wh');
    if (recWh && recWh.options.length === 0) {
        cachedWarehouses.forEach(wh => {
            const opt = document.createElement('option');
            opt.value = wh.id;
            opt.textContent = wh.name;
            recWh.appendChild(opt);
        });
    }

    // Populate PO modal dropdowns
    const poSup = document.getElementById('po-supplier');
    if (poSup && poSup.options.length === 0) {
        cachedSuppliers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            poSup.appendChild(opt);
        });
    }

    const poProd = document.getElementById('po-product');
    if (poProd && poProd.options.length === 0) {
        cachedProducts.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.name} (${p.sku})`;
            poProd.appendChild(opt);
        });
    }
}

async function populateTransferForm() {
    await ensureMetadata();
    const src = document.getElementById('transfer-src-wh');
    const tgt = document.getElementById('transfer-tgt-wh');
    const prod = document.getElementById('transfer-product');

    src.innerHTML = cachedWarehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    tgt.innerHTML = cachedWarehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    prod.innerHTML = cachedProducts.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');

    if (src.options.length > 1) {
        tgt.selectedIndex = 1;
    }
}

async function populateOpnameForm() {
    await ensureMetadata();
    const wh = document.getElementById('opname-wh');
    const prod = document.getElementById('opname-product');

    wh.innerHTML = cachedWarehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    prod.innerHTML = cachedProducts.map(p => `<option value="${p.id}">${p.name} (${p.sku})</option>`).join('');
}

function quickCreatePoForProduct(productId, productName) {
    ensureMetadata().then(() => {
        openModal('modal-create-po');
        const poProd = document.getElementById('po-product');
        poProd.value = productId;
        document.getElementById('po-qty').value = 50;
        showToast(`Drafting new Purchase Order for ${productName}`);
    });
}

// ==========================================
// 9. Form Event Listeners
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateProfileUI();

    // Check URL Hash for Tab routing
    const hash = window.location.hash.replace('#', '') || 'overview';
    switchTab(hash);

    // Sidebar navigation clicks
    document.querySelectorAll('.sidebar-menu .nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.dataset.tab;
            window.location.hash = tabId;
            switchTab(tabId);
        });
    });

    // Refresh button
    document.getElementById('btn-refresh').addEventListener('click', () => {
        showToast('Refreshing dashboard telemetry...');
        refreshAllData();
    });

    // Quick PO Button
    document.getElementById('btn-quick-po').addEventListener('click', () => {
        ensureMetadata().then(() => openModal('modal-create-po'));
    });

    const openPoBtn = document.getElementById('btn-open-po-modal');
    if (openPoBtn) {
        openPoBtn.addEventListener('click', () => {
            ensureMetadata().then(() => openModal('modal-create-po'));
        });
    }

    // Quick Opname and Transfer triggers from Inventory tab
    document.getElementById('btn-open-opname').addEventListener('click', () => {
        switchTab('opname');
    });
    document.getElementById('btn-open-transfer').addEventListener('click', () => {
        switchTab('transfer');
    });

    // Inventory search & filter
    document.getElementById('inv-search').addEventListener('input', loadInventory);
    document.getElementById('inv-wh-filter').addEventListener('change', loadInventory);
    document.getElementById('po-status-filter').addEventListener('change', loadPurchaseOrders);
    document.getElementById('ledger-type-filter').addEventListener('change', loadTransactions);

    // Logout
    document.getElementById('btn-logout').addEventListener('click', logout);

    // Login Form Submit
    document.getElementById('form-login').addEventListener('submit', (e) => {
        e.preventDefault();
        const ident = document.getElementById('login-identifier').value.trim();
        const pass = document.getElementById('login-password').value;
        login(ident, pass);
    });

    // Quick role buttons
    document.querySelectorAll('.btn-role-quick').forEach(btn => {
        btn.addEventListener('click', () => {
            login(btn.dataset.user, btn.dataset.pass);
        });
    });

    // Create PO Form Submit
    document.getElementById('form-create-po').addEventListener('submit', async (e) => {
        e.preventDefault();
        const supplierId = Number(document.getElementById('po-supplier').value);
        const productId = Number(document.getElementById('po-product').value);
        const qtyOrdered = Number(document.getElementById('po-qty').value);
        const unitPrice = Number(document.getElementById('po-price').value);

        try {
            const res = await api('/api/po', {
                method: 'POST',
                body: JSON.stringify({
                    supplierId,
                    items: [{ productId, qtyOrdered, unitPrice }]
                })
            });

            if (res) {
                showToast(`Purchase Order created successfully (ID #${res.data?.id})!`);
                closeModal('modal-create-po');
                loadPurchaseOrders();
                loadOverview();
            }
        } catch (e) {}
    });

    // Receive PO Form Submit
    document.getElementById('form-receive-po').addEventListener('submit', async (e) => {
        e.preventDefault();
        const poId = Number(document.getElementById('receive-po-id').value);
        const warehouseId = Number(document.getElementById('receive-wh').value);

        const items = [];
        document.querySelectorAll('.receive-item-qty').forEach(input => {
            const qty = Number(input.value);
            if (qty > 0) {
                items.push({
                    productId: Number(input.dataset.productId),
                    qtyReceived: qty
                });
            }
        });

        if (items.length === 0) {
            showToast('Please enter a received quantity greater than 0', 'error');
            return;
        }

        try {
            const res = await api(`/api/po/${poId}/receive`, {
                method: 'POST',
                body: JSON.stringify({ warehouseId, items })
            });

            if (res) {
                showToast(`Goods received into warehouse! New Status: ${res.data?.updatedPo?.status}`);
                closeModal('modal-receive-po');
                loadPurchaseOrders();
                loadOverview();
            }
        } catch (e) {}
    });

    // Transfer Form Submit
    document.getElementById('form-transfer').addEventListener('submit', async (e) => {
        e.preventDefault();
        const sourceWarehouseId = Number(document.getElementById('transfer-src-wh').value);
        const targetWarehouseId = Number(document.getElementById('transfer-tgt-wh').value);
        const productId = Number(document.getElementById('transfer-product').value);
        const qty = Number(document.getElementById('transfer-qty').value);
        const notes = document.getElementById('transfer-notes').value.trim();

        if (sourceWarehouseId === targetWarehouseId) {
            showToast('Source and Target warehouses cannot be identical!', 'error');
            return;
        }

        try {
            const res = await api('/api/transactions/transfer', {
                method: 'POST',
                body: JSON.stringify({
                    sourceWarehouseId,
                    targetWarehouseId,
                    items: [{ productId, qty }],
                    notes: notes || undefined
                })
            });

            if (res) {
                showToast(`Stock transfer of ${qty} units completed!`);
                document.getElementById('form-transfer').reset();
                switchTab('overview');
            }
        } catch (e) {}
    });

    // Stock Opname Form Submit
    document.getElementById('form-opname').addEventListener('submit', async (e) => {
        e.preventDefault();
        const warehouseId = Number(document.getElementById('opname-wh').value);
        const productId = Number(document.getElementById('opname-product').value);
        const actualQty = Number(document.getElementById('opname-actual-qty').value);
        const reason = document.getElementById('opname-reason').value.trim();
        const notes = document.getElementById('opname-notes').value.trim();

        try {
            const res = await api('/api/transactions/adjust', {
                method: 'POST',
                body: JSON.stringify({
                    warehouseId,
                    reason: reason || undefined,
                    items: [{ productId, actualQty, notes: notes || undefined }]
                })
            });

            if (res) {
                showToast(`Stock Opname adjustment submitted successfully!`);
                document.getElementById('form-opname').reset();
                switchTab('overview');
            }
        } catch (e) {}
    });
});

async function refreshAllData() {
    await ensureMetadata();
    loadOverview();
}
