import React, { useEffect, useState } from 'react';
import { apiGetProducts, apiGetWarehouses, apiTransferStock } from '../services/api';
import type { Product, Warehouse } from '../types';
import { ArrowRightLeft, Check, Plus, X } from 'lucide-react';

interface TransferViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateTab: (tab: any) => void;
}

export const TransferView: React.FC<TransferViewProps> = ({ onShowToast, onNavigateTab }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fromWh, setFromWh] = useState<number | ''>('');
  const [toWh, setToWh] = useState<number | ''>('');
  const [items, setItems] = useState<Array<{ productId: number; quantity: number }>>([
    { productId: 0, quantity: 5 },
  ]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [whs, prods] = await Promise.all([apiGetWarehouses(), apiGetProducts()]);
        setWarehouses(whs);
        setProducts(prods);
      } catch (err: any) {
        onShowToast(err.message || 'Failed to load options', 'error');
      }
    };
    fetchDropdowns();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: 0, quantity: 5 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWh || !toWh) {
      onShowToast('Please select both source and destination warehouses', 'error');
      return;
    }
    if (fromWh === toWh) {
      onShowToast('Source and destination warehouses cannot be the same', 'error');
      return;
    }
    const validItems = items.filter((i) => i.productId > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      onShowToast('Please add at least one product with valid quantity', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await apiTransferStock({
        fromWarehouseId: Number(fromWh),
        toWarehouseId: Number(toWh),
        items: validItems,
        note: note || 'Inter-warehouse stock balancing',
      });
      onShowToast('Stock transferred successfully!', 'success');
      onNavigateTab('inventory');
    } catch (err: any) {
      onShowToast(err.message || 'Stock transfer failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <ArrowRightLeft size={20} style={{ color: 'var(--accent-cyan)' }} />
            <span>Inter-Warehouse Stock Transfer</span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Execute atomic inventory transfer between distribution facilities. The ledger will automatically debit the origin warehouse and credit the destination warehouse.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Origin Facility (From)</label>
              <select
                className="form-control"
                value={fromWh}
                onChange={(e) => setFromWh(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select Origin Warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destination Facility (To)</label>
              <select
                className="form-control"
                value={toWh}
                onChange={(e) => setToWh(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select Destination Warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="form-label">Products to Relocate</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={handleAddItem}
            >
              <Plus size={14} />
              <span>Add Item</span>
            </button>
          </div>

          {items.map((it, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr auto',
                gap: '12px',
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
                placeholder="Quantity"
                min={1}
                value={it.quantity}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].quantity = Number(e.target.value);
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
            <label className="form-label">Transfer Reference Note / Reason</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Replenishment for branch retail demand"
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
              <span>{submitting ? 'Executing Transfer...' : 'Confirm Stock Transfer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
