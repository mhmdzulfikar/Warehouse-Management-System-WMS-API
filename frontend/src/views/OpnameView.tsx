import React, { useEffect, useState } from 'react';
import { apiAdjustStockOpname, apiGetProducts, apiGetWarehouses } from '../services/api';
import type { Product, Warehouse } from '../types';
import { Check, ClipboardCheck, Plus, X } from 'lucide-react';

interface OpnameViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateTab: (tab: any) => void;
}

export const OpnameView: React.FC<OpnameViewProps> = ({ onShowToast, onNavigateTab }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [items, setItems] = useState<Array<{ productId: number; physicalQty: number; reason: string }>>([
    { productId: 0, physicalQty: 100, reason: 'Physical stock reconciliation' },
  ]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [whs, prods] = await Promise.all([apiGetWarehouses(), apiGetProducts()]);
        setWarehouses(whs);
        setProducts(prods);
      } catch (err: any) {
        onShowToast(err.message || 'Failed to load options', 'error');
      }
    };
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: 0, physicalQty: 50, reason: 'Physical count check' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      onShowToast('Please select a warehouse facility', 'error');
      return;
    }
    const validItems = items.filter((i) => i.productId > 0);
    if (validItems.length === 0) {
      onShowToast('Please add at least one product for opname adjustment', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await apiAdjustStockOpname({
        warehouseId: Number(warehouseId),
        items: validItems,
        note: note || 'Monthly stock opname audit',
      });
      onShowToast('Stock opname adjustments reconciled successfully!', 'success');
      onNavigateTab('inventory');
    } catch (err: any) {
      onShowToast(err.message || 'Opname adjustment failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <ClipboardCheck size={20} style={{ color: 'var(--accent-amber)' }} />
            <span>Stock Opname / Physical Count Audit</span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Input the exact physical stock counted during warehouse inspection. The system will automatically calculate discrepancies, update ledger balances, and record an audit trail.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ maxWidth: '400px', marginBottom: '20px' }}>
            <label className="form-label">Warehouse Facility</label>
            <select
              className="form-control"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Select Inspected Warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="form-label">Physical Count Entries</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={handleAddItem}
            >
              <Plus size={14} />
              <span>Add Entry</span>
            </button>
          </div>

          {items.map((it, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 2fr auto',
                gap: '10px',
                marginBottom: '10px',
                alignItems: 'center',
              }}
            >
              <select
                className="form-control"
                value={it.productId}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].productId = Number(e.target.value);
                  setItems(updated);
                }}
                required
              >
                <option value={0}>Select Product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>

              <input
                type="number"
                className="form-control"
                placeholder="Physical Qty"
                min={0}
                value={it.physicalQty}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].physicalQty = Number(e.target.value);
                  setItems(updated);
                }}
                required
              />

              <input
                type="text"
                className="form-control"
                placeholder="Discrepancy Reason"
                value={it.reason}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].reason = e.target.value;
                  setItems(updated);
                }}
                required
              />

              {items.length > 1 && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px', color: 'var(--accent-rose)' }}
                  onClick={() => handleRemoveItem(idx)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label className="form-label">Audit Batch Note / Reference</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. End of Month Q3 Physical Inventory Count"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={() => onNavigateTab('inventory')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Check size={16} />
              <span>{submitting ? 'Applying Adjustments...' : 'Submit Physical Count'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
