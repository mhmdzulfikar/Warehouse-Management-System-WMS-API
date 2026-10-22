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
      onShowToast(err.message || 'Failed to load transaction movements', 'error');
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
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            {['ALL', 'IN', 'OUT', 'TRANSFER', 'ADJUST'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`btn-secondary ${filterType === t ? 'btn-primary' : ''}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                {t}
              </button>
            ))}
          </div>

          <button className="btn-secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <History size={20} />
            <span>Audit Journal & Historical Movements ({filtered.length} entries)</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Operator</th>
                <th>Items Movement</th>
                <th>Notes / Reason</th>
                <th>Timestamp</th>
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
                  <td>{tx.user?.username || 'System'}</td>
                  <td>
                    {tx.items?.map((it, idx) => (
                      <div key={idx} style={{ fontSize: '0.82rem' }}>
                        • {it.product?.name || `Product #${it.productId}`} ({it.quantity > 0 ? `+${it.quantity}` : it.quantity})
                        {' '}@ {it.warehouse?.name || `WH #${it.warehouseId}`}
                      </div>
                    ))}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{tx.note || '-'}</td>
                  <td>{formatDate(tx.timestamp)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                    {loading ? 'Loading movements...' : 'No transaction records found.'}
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
