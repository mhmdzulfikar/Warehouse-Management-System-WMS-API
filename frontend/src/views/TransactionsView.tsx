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
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load chronological audit ledger', 'error');
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Filters Header */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            {[
              { id: 'ALL', label: 'All Movements' },
              { id: 'IN', label: 'Inbound GRN' },
              { id: 'OUT', label: 'Outbound Dispatch' },
              { id: 'TRANSFER', label: 'Inter-Facility Transfer' },
              { id: 'ADJUST', label: 'Cycle Count Audit' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={`btn-secondary ${filterType === t.id ? 'btn-primary' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button className="btn-secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Audit Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} />
          <span style={{ fontWeight: 600 }}>Chronological Audit Trail & Material Movements Ledger</span>
          <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
            {filtered.length} entries
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Entry #</th>
                <th>Movement Type</th>
                <th>Reference Docket</th>
                <th>Authorized Operator</th>
                <th>Line Delta & Facility Affected</th>
                <th>Remarks / Reason</th>
                <th>Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const items = tx.transactionItems || tx.items || [];
                const user = tx.user || tx.createdBy;

                return (
                  <tr key={tx.id}>
                    <td>
                      <code style={{ fontWeight: 700 }}>#{tx.id}</code>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(tx.type)}`}>{tx.type}</span>
                    </td>
                    <td>
                      {tx.referenceType ? (
                        <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                          {tx.referenceType} {tx.referenceId ? `#${tx.referenceId}` : ''}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Direct Entry</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{user?.username || 'System Daemon'}</td>
                    <td>
                      {items.map((it: any, idx: number) => {
                        const delta = it.qtyChange ?? it.quantity ?? 0;
                        return (
                          <div key={idx} style={{ fontSize: '0.82rem', marginBottom: '2px' }} className="tabular-num">
                            • <span style={{ fontWeight: 600 }}>{it.product?.name || `Product #${it.productId}`}</span>
                            <span style={{ 
                              color: delta > 0 ? '#059669' : '#b91c1c', 
                              fontWeight: 700,
                              marginLeft: '6px'
                            }}>
                              ({delta > 0 ? `+${delta}` : delta})
                            </span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                              @ {it.warehouse?.code ? `[${it.warehouse.code}] ` : ''}{it.warehouse?.name || `Facility #${it.warehouseId}`}
                            </span>
                          </div>
                        );
                      })}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{tx.note || '-'}</td>
                    <td className="tabular-num" style={{ color: 'var(--text-muted)' }}>{formatDate(tx.timestamp)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '36px' }}>
                    {loading ? 'Querying movement ledger...' : 'No transaction records found matching the filter.'}
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
