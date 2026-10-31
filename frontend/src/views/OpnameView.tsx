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
    { productId: 0, physicalQty: 100, reason: 'Routine weekly physical cycle count' },
  ]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [whs, prods] = await Promise.all([apiGetWarehouses(), apiGetProducts()]);
        setWarehouses(Array.isArray(whs) ? whs : []);
        setProducts(Array.isArray(prods) ? prods : []);
      } catch (err: any) {
        onShowToast(err.message || 'Failed to retrieve master facility list', 'error');
      }
    };
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: 0, physicalQty: 50, reason: 'Physical cycle count adjustment' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      onShowToast('Please select the audit facility hub', 'error');
      return;
    }
    const validItems = items.filter((i) => i.productId > 0);
    if (validItems.length === 0) {
      onShowToast('Add at least one product SKU to reconcile', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await apiAdjustStockOpname({
        warehouseId: Number(warehouseId),
        items: validItems,
        note: note || 'Official Physical Inventory Cycle Count Reconciliation Docket',
      });
      onShowToast('Cycle count audit reconciliation applied to inventory ledger!', 'success');
      onNavigateTab('inventory');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to apply cycle count adjustment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-default)', paddingBottom: '14px' }}>
          <div style={{ background: '#0f172a', color: '#ffffff', padding: '8px', borderRadius: '8px' }}>
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Physical Inventory Cycle Count Audit</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Reconcile physical on-floor bin counts against digital records with immutable audit reason codes.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label">Audit Target Logistics Facility *</label>
            <select
              className="form-control"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Select Audit Facility...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code ? `[${w.code}] ` : ''}{w.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ margin: '16px 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Audited SKUs & Actual Counted Quantities</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={handleAddItem}
            >
              <Plus size={13} />
              <span>Add Line Item</span>
            </button>
          </div>

          {items.map((it, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 2fr auto',
                gap: '10px',
                alignItems: 'center',
                marginBottom: '10px',
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
                <option value={0}>Select Product SKU...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>

              <input
                type="number"
                className="form-control tabular-num"
                placeholder="Actual Count"
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
                placeholder="Reason / Variance Cause"
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
                  style={{ padding: '8px', color: '#991b1b' }}
                  onClick={() => handleRemoveItem(idx)}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Audit Certificate / Official Discrepancy Minutes</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Q4 Global Logistics Physical Cycle Count Audit Sign-off"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigateTab('inventory')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Check size={16} />
              <span>{submitting ? 'Applying Reconciliation...' : 'Commit Cycle Count Adjustment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
