import React, { useEffect, useState } from 'react';
import { apiGetTransactions } from '../services/api';
import type { Transaction } from '../types';
import { Filter, History, RefreshCw } from 'lucide-react';

interface TransactionsViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ onShowToast }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiGetTransactions();
      setTransactions(data);
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memuat buku jurnal mutasi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = transactions.filter((tx) => {
    if (filterType === 'ALL') return true;
    return tx.type === filterType;
  });

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'IN': return 'badge-in';
      case 'OUT': return 'badge-out';
      case 'TRANSFER': return 'badge-transfer';
      case 'ADJUST': return 'badge-adjust';
      default: return 'badge-pending';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div>
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            {[
              { id: 'ALL', label: 'Semua Mutasi' },
              { id: 'IN', label: 'Inbound (Masuk)' },
              { id: 'OUT', label: 'Outbound (Keluar)' },
              { id: 'TRANSFER', label: 'Transfer Lokasi' },
              { id: 'ADJUST', label: 'Opname Fisik' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={`btn-secondary ${filterType === t.id ? 'btn-primary' : ''}`}
                style={{ padding: '5px 10px', fontSize: '0.75rem' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button className="btn-secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} />
            <span>Perbarui Jurnal</span>
          </button>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <History size={18} />
            <span>Buku Jurnal Riwayat Pergerakan Barang ({filtered.length} entri)</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Mutasi</th>
                <th>Jenis</th>
                <th>Dokumen Referensi</th>
                <th>Petugas Pelaksana</th>
                <th>Rincian Kuantitas Barang</th>
                <th>Catatan / Keterangan</th>
                <th>Waktu Transaksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <strong>#{tx.id}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getBadgeClass(tx.type)}`}>{tx.type}</span>
                  </td>
                  <td>{tx.referenceType || '-'}</td>
                  <td style={{ fontWeight: 500 }}>{tx.user?.username || 'Sistem'}</td>
                  <td>
                    {tx.items?.map((it, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem' }} className="tabular-num">
                        • {it.product?.name || `Produk #${it.productId}`} ({it.quantity > 0 ? `+${it.quantity}` : it.quantity})
                        {' '}@ {it.warehouse?.name || `Gudang #${it.warehouseId}`}
                      </div>
                    ))}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{tx.note || '-'}</td>
                  <td className="tabular-num">{formatDate(tx.timestamp)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '28px' }}>
                    {loading ? 'Memuat mutasi...' : 'Tidak ada catatan mutasi yang ditemukan.'}
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
