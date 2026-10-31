import React, { useEffect, useState } from 'react';
import { apiGetDashboardStats } from '../services/api';
import type { DashboardStats } from '../types';
import {
  AlertCircle,
  Boxes,
  CircleDollarSign,
  Clock,
  History,
  PackageCheck,
  RefreshCw,
  Warehouse
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
      onShowToast(err.message || 'Failed to retrieve global warehouse intelligence summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return '$' + (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Bar: Telemetry Operational Pulse & Manual Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '6px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }}></span>
          <span style={{ fontWeight: 600 }}>Dual-Track Telemetry Engine:</span>
          <span>UDP Datagram Active (Port 5001 • Latency ~0.3ms • 0% Packet Loss)</span>
        </div>

        <button className="btn-secondary" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Intelligence</span>
        </button>
      </div>

      {/* Enterprise KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">
            <Boxes size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Physical Inventory Units</span>
            <span className="kpi-value tabular-num">
              {stats?.metrics.totalStockUnits.toLocaleString('en-US') ?? '...'}
            </span>
            <span className="kpi-sub">
              Distributed across {stats?.metrics.totalWarehouses ?? 0} Global Facilities
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">
            <CircleDollarSign size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Inventory Valuation</span>
            <span className="kpi-value tabular-num" style={{ fontSize: '1.35rem' }}>
              {stats ? formatCurrency(stats.metrics.totalStockValue) : '...'}
            </span>
            <span className="kpi-sub">
              Across {stats?.metrics.totalProducts ?? 0} Active Enterprise SKUs
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">
            <AlertCircle size={22} style={{ color: (stats?.metrics.criticalStockCount ?? 0) > 0 ? '#b91c1c' : 'inherit' }} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Replenishment Triggers</span>
            <span
              className="kpi-value tabular-num"
              style={{ color: (stats?.metrics.criticalStockCount ?? 0) > 0 ? '#b91c1c' : 'inherit' }}
            >
              {stats?.metrics.criticalStockCount ?? 0}
            </span>
            <span className="kpi-sub">
              Items below automated buffer thresholds
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Open Inbound POs</span>
            <span className="kpi-value tabular-num">
              {(stats?.metrics.pendingPoCount ?? 0) + (stats?.metrics.partiallyReceivedPoCount ?? 0)}
            </span>
            <span className="kpi-sub">
              Awaiting inbound receiving dock fulfillment
            </span>
          </div>
        </div>
      </div>

      {/* Critical Replenishment Alert Panel */}
      {stats && stats.criticalStocks.length > 0 && (
        <div className="card" style={{ borderColor: 'var(--status-rose-border)', background: '#ffffff', padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff5f5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 600 }}>
              <AlertCircle size={18} />
              <span>Automated Replenishment Alert • Buffer Level Breached</span>
            </div>
            <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => onNavigateTab('pos')}>
              Generate Purchase Order
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Specification</th>
                  <th>Category</th>
                  <th>Facility</th>
                  <th style={{ textAlign: 'right' }}>Current On-Hand</th>
                  <th style={{ textAlign: 'right' }}>Threshold (Min)</th>
                  <th style={{ textAlign: 'right' }}>Shortage Deficit</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.criticalStocks.map((item) => (
                  <tr key={item.inventoryId}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName}</div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <code>{item.sku}</code>
                        {item.barcode && <span>• Barcode: {item.barcode}</span>}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.category || 'Standard'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {item.warehouseCode ? `[${item.warehouseCode}] ` : ''}{item.warehouseName}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge badge-critical tabular-num">
                        {item.currentQty} {item.uom}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-num">{item.minStock} {item.uom}</td>
                    <td style={{ textAlign: 'right', color: '#b91c1c', fontWeight: 700 }} className="tabular-num">
                      -{item.shortage} {item.uom}
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        onClick={() => onNavigateTab('pos')}
                      >
                        Procure Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: Global Facility Distribution & Movement Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        
        {/* Global Facility Distribution */}
        <div className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <Warehouse size={18} />
              <span>Multi-Facility Distribution</span>
            </div>
            <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => onNavigateTab('inventory')}>
              View Ledger
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Logistics Facility</th>
                  <th>SKU Coverage</th>
                  <th style={{ textAlign: 'right' }}>Total Units</th>
                </tr>
              </thead>
              <tbody>
                {stats?.warehouseDistribution.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{w.name}</div>
                      {w.code && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {w.code}</div>}
                    </td>
                    <td className="tabular-num">{w.uniqueProducts} SKUs</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge badge-approved tabular-num">
                        {w.totalItems.toLocaleString('en-US')} units
                      </span>
                    </td>
                  </tr>
                ))}
                {(!stats || stats.warehouseDistribution.length === 0) && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                      No facility distribution data recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Movement Ledger Summary */}
        <div className="card" style={{ margin: 0, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <History size={18} />
              <span>Inventory Movement Velocity</span>
            </div>
            <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => onNavigateTab('transactions')}>
              Audit Log
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-in">INBOUND</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700 }} className="tabular-num">
                  {stats?.transactionTypeCounts.IN ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supplier Goods Receipt (GRN)</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-out">OUTBOUND</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700 }} className="tabular-num">
                  {stats?.transactionTypeCounts.OUT ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery Orders Dispatched</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-transfer">TRANSFER</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700 }} className="tabular-num">
                  {stats?.transactionTypeCounts.TRANSFER ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inter-Facility / Bin Movements</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-adjust">CYCLE COUNT</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 700 }} className="tabular-num">
                  {stats?.transactionTypeCounts.ADJUST ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audit Variance Adjustments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Recent Transactions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <PackageCheck size={18} />
            <span>Real-Time Audit Movement Stream</span>
          </div>
          <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 10px' }} onClick={() => onNavigateTab('transactions')}>
            Open Ledger Stream
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Tx ID</th>
                <th>Type</th>
                <th>Operator</th>
                <th>Item Adjustments & Facility Target</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="tabular-num" style={{ color: 'var(--text-muted)' }}>
                    <strong>#{tx.id}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getBadgeClass(tx.type)}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{tx.createdByUser}</td>
                  <td>
                    {tx.items?.map((it, idx) => (
                      <span key={idx} style={{ display: 'inline-block', marginRight: '10px' }} className="tabular-num">
                        {it.productName} ({it.qtyChange > 0 ? `+${it.qtyChange}` : it.qtyChange})
                      </span>
                    ))}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatDate(tx.timestamp)}</td>
                </tr>
              ))}
              {(!stats || stats.recentTransactions.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                    No audit records registered yet
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
