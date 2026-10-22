import React, { useEffect, useState } from 'react';
import { apiGetDashboardStats } from '../services/api';
import type { DashboardStats } from '../types';
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Clock,
  History,
  PackageCheck,
  RefreshCw,
  Warehouse,
} from 'lucide-react';

interface OverviewViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateTab: (tab: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onShowToast, onNavigateTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiGetDashboardStats();
      setStats(data);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load telemetry stats', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatRupiah = (amount: number) => {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'IN': return 'badge-in';
      case 'OUT': return 'badge-out';
      case 'TRANSFER': return 'badge-transfer';
      case 'ADJUST': return 'badge-adjust';
      case 'RECEIVED': return 'badge-received';
      case 'PARTIALLY_RECEIVED': return 'badge-partial';
      case 'APPROVED': return 'badge-approved';
      default: return 'badge-pending';
    }
  };

  return (
    <div>
      {/* Refresh Trigger */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn-secondary" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon indigo">
            <Boxes size={26} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Stock Units</span>
            <span className="kpi-value">
              {stats?.metrics.totalStockUnits.toLocaleString('id-ID') ?? '...'}
            </span>
            <span className="kpi-sub">
              Across {stats?.metrics.totalWarehouses ?? 0} facility locations
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon emerald">
            <CircleDollarSign size={26} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Estimated Valuation</span>
            <span className="kpi-value" style={{ fontSize: '1.45rem' }}>
              {stats ? formatRupiah(stats.metrics.totalStockValue) : '...'}
            </span>
            <span className="kpi-sub">
              {stats?.metrics.totalProducts ?? 0} unique SKUs cataloged
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber">
            <AlertTriangle size={26} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Critical Restock Radar</span>
            <span
              className="kpi-value"
              style={{ color: stats?.metrics.criticalStockCount ? 'var(--accent-rose)' : 'inherit' }}
            >
              {stats?.metrics.criticalStockCount ?? 0}
            </span>
            <span className="kpi-sub">
              Items below minimum buffer threshold
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon cyan">
            <Clock size={26} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Active PO Orders</span>
            <span className="kpi-value">
              {(stats?.metrics.pendingPoCount ?? 0) + (stats?.metrics.partiallyReceivedPoCount ?? 0)}
            </span>
            <span className="kpi-sub">
              Pending approval & partial deliveries
            </span>
          </div>
        </div>
      </div>

      {/* Critical Stock Radar */}
      {stats && stats.criticalStocks.length > 0 && (
        <div className="glass-panel" style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}>
          <div className="panel-header">
            <div className="panel-title" style={{ color: 'var(--accent-rose)' }}>
              <AlertTriangle size={20} />
              <span>Critical Stock Restock Radar</span>
            </div>
            <button className="btn-secondary" onClick={() => onNavigateTab('pos')}>
              Create Restock PO
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Warehouse Facility</th>
                  <th>Current Qty</th>
                  <th>Min Safe Stock</th>
                  <th>Deficit / Shortage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.criticalStocks.map((item) => (
                  <tr key={item.inventoryId}>
                    <td style={{ fontWeight: 600 }}>{item.productName}</td>
                    <td>
                      <code style={{ color: 'var(--accent-cyan)' }}>{item.sku}</code>
                    </td>
                    <td>{item.warehouseName}</td>
                    <td>
                      <span className="badge badge-critical">
                        {item.currentQty} {item.uom}
                      </span>
                    </td>
                    <td>{item.minStock} {item.uom}</td>
                    <td style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>
                      -{item.shortage} {item.uom}
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => onNavigateTab('pos')}
                      >
                        Procure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: Warehouse Distribution & Movement Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Facilities */}
        <div className="glass-panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div className="panel-title">
              <Warehouse size={18} />
              <span>Facility Stock Balances</span>
            </div>
            <button className="btn-secondary" onClick={() => onNavigateTab('inventory')}>
              Explore
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Warehouse</th>
                  <th>Active SKUs</th>
                  <th>Total Units</th>
                </tr>
              </thead>
              <tbody>
                {stats?.warehouseDistribution.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>{w.uniqueProducts} types</td>
                    <td>
                      <span className="badge badge-approved">
                        {w.totalItems.toLocaleString('id-ID')} units
                      </span>
                    </td>
                  </tr>
                ))}
                {(!stats || stats.warehouseDistribution.length === 0) && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                      No facility inventory recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Movement Breakdown */}
        <div className="glass-panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div className="panel-title">
              <History size={18} />
              <span>Transaction Type Distribution</span>
            </div>
            <button className="btn-secondary" onClick={() => onNavigateTab('transactions')}>
              Ledger
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-in">INBOUND</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {stats?.transactionTypeCounts.IN ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock receipts from PO</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-out">OUTBOUND</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {stats?.transactionTypeCounts.OUT ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Items dispatched</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-transfer">TRANSFER</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {stats?.transactionTypeCounts.TRANSFER ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inter-warehouse shift</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-adjust">OPNAME</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {stats?.transactionTypeCounts.ADJUST ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Physical count adjustments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Ledger */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <PackageCheck size={20} />
            <span>Recent Movement Ledger</span>
          </div>
          <button className="btn-secondary" onClick={() => onNavigateTab('transactions')}>
            View All Ledger
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Type</th>
                <th>Operator</th>
                <th>Movement Summary</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>#{tx.id}</td>
                  <td>
                    <span className={`badge ${getBadgeClass(tx.type)}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td>{tx.createdByUser}</td>
                  <td>
                    {tx.items?.map((it, idx) => (
                      <span key={idx} style={{ display: 'inline-block', marginRight: '10px' }}>
                        {it.productName} ({it.qtyChange > 0 ? `+${it.qtyChange}` : it.qtyChange})
                      </span>
                    ))}
                  </td>
                  <td>{formatDate(tx.timestamp)}</td>
                </tr>
              ))}
              {(!stats || stats.recentTransactions.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                    No recent transactions recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
