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
      onShowToast(err.message || 'Gagal mengambil ringkasan data gudang', 'error');
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
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Perbarui Data</span>
        </button>
      </div>

      {/* KPI Cards (Clean, Monochrome, Grounded Enterprise) */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">
            <Boxes size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Unit Fisik Stok</span>
            <span className="kpi-value tabular-num">
              {stats?.metrics.totalStockUnits.toLocaleString('id-ID') ?? '...'}
            </span>
            <span className="kpi-sub">
              Tersebar di {stats?.metrics.totalWarehouses ?? 0} lokasi gudang
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">
            <CircleDollarSign size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Estimasi Valuasi Stok</span>
            <span className="kpi-value tabular-num" style={{ fontSize: '1.35rem' }}>
              {stats ? formatRupiah(stats.metrics.totalStockValue) : '...'}
            </span>
            <span className="kpi-sub">
              {stats?.metrics.totalProducts ?? 0} jenis SKU terdaftar
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">
            <AlertCircle size={22} style={{ color: (stats?.metrics.criticalStockCount ?? 0) > 0 ? '#b91c1c' : 'inherit' }} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Stok di Bawah Batas Aman</span>
            <span
              className="kpi-value tabular-num"
              style={{ color: (stats?.metrics.criticalStockCount ?? 0) > 0 ? '#b91c1c' : 'inherit' }}
            >
              {stats?.metrics.criticalStockCount ?? 0}
            </span>
            <span className="kpi-sub">
              Item membutuhkan re-order pengadaan
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pesanan Pembelian Aktif</span>
            <span className="kpi-value tabular-num">
              {(stats?.metrics.pendingPoCount ?? 0) + (stats?.metrics.partiallyReceivedPoCount ?? 0)}
            </span>
            <span className="kpi-sub">
              Status menunggu approval / pengiriman
            </span>
          </div>
        </div>
      </div>

      {/* Peringatan Stok Minimum (Low Stock Alert) */}
      {stats && stats.criticalStocks.length > 0 && (
        <div className="glass-panel" style={{ borderColor: 'var(--status-rose-border)', background: '#fff' }}>
          <div className="panel-header">
            <div className="panel-title" style={{ color: 'var(--status-rose-text)' }}>
              <AlertCircle size={18} />
              <span>Daftar Peringatan Stok di Bawah Minimum (Perlu Pengadaan)</span>
            </div>
            <button className="btn-secondary" onClick={() => onNavigateTab('pos')}>
              Buat PO Pengadaan
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama Barang</th>
                  <th>Kode SKU</th>
                  <th>Lokasi Fasilitas</th>
                  <th>Stok Saat Ini</th>
                  <th>Batas Minimum</th>
                  <th>Defisit / Kurang</th>
                  <th>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {stats.criticalStocks.map((item) => (
                  <tr key={item.inventoryId}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName}</td>
                    <td>
                      <code>{item.sku}</code>
                    </td>
                    <td>{item.warehouseName}</td>
                    <td>
                      <span className="badge badge-critical tabular-num">
                        {item.currentQty} {item.uom}
                      </span>
                    </td>
                    <td className="tabular-num">{item.minStock} {item.uom}</td>
                    <td style={{ color: 'var(--status-rose-text)', fontWeight: 700 }} className="tabular-num">
                      -{item.shortage} {item.uom}
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                        onClick={() => onNavigateTab('pos')}
                      >
                        Pesan Ulang
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: Distribusi Stok per Fasilitas & Mutasi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Fasilitas Gudang */}
        <div className="glass-panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div className="panel-title">
              <Warehouse size={18} />
              <span>Distribusi Stok per Gudang</span>
            </div>
            <button className="btn-secondary" onClick={() => onNavigateTab('inventory')}>
              Lihat Detail
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fasilitas Gudang</th>
                  <th>Jenis SKU</th>
                  <th>Total Unit Fisik</th>
                </tr>
              </thead>
              <tbody>
                {stats?.warehouseDistribution.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>{w.uniqueProducts} jenis</td>
                    <td>
                      <span className="badge badge-approved tabular-num">
                        {w.totalItems.toLocaleString('id-ID')} unit
                      </span>
                    </td>
                  </tr>
                ))}
                {(!stats || stats.warehouseDistribution.length === 0) && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>
                      Belum ada data saldo stok gudang
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ringkasan Mutasi Barang */}
        <div className="glass-panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <div className="panel-title">
              <History size={18} />
              <span>Ringkasan Mutasi Barang</span>
            </div>
            <button className="btn-secondary" onClick={() => onNavigateTab('transactions')}>
              Buku Jurnal
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-in">INBOUND</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700 }} className="tabular-num">
                  {stats?.transactionTypeCounts.IN ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Penerimaan PO Supplier</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-out">OUTBOUND</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700 }} className="tabular-num">
                  {stats?.transactionTypeCounts.OUT ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pengeluaran Barang</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-transfer">TRANSFER</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700 }} className="tabular-num">
                  {stats?.transactionTypeCounts.TRANSFER ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pindah Antar Gudang</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-adjust">OPNAME</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700 }} className="tabular-num">
                  {stats?.transactionTypeCounts.ADJUST ?? 0}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Penyesuaian Selisih Fisik</span>
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat Mutasi Terbaru */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <PackageCheck size={18} />
            <span>Aktivitas Mutasi Terakhir</span>
          </div>
          <button className="btn-secondary" onClick={() => onNavigateTab('transactions')}>
            Buka Seluruh Riwayat
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Mutasi</th>
                <th>Jenis</th>
                <th>Petugas</th>
                <th>Detail Barang & Perubahan</th>
                <th>Waktu Transaksi</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <strong>#{tx.id}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getBadgeClass(tx.type)}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td>{tx.createdByUser}</td>
                  <td>
                    {tx.items?.map((it, idx) => (
                      <span key={idx} style={{ display: 'inline-block', marginRight: '10px' }} className="tabular-num">
                        {it.productName} ({it.qtyChange > 0 ? `+${it.qtyChange}` : it.qtyChange})
                      </span>
                    ))}
                  </td>
                  <td>{formatDate(tx.timestamp)}</td>
                </tr>
              ))}
              {(!stats || stats.recentTransactions.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                    Belum ada riwayat mutasi tercatat
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
