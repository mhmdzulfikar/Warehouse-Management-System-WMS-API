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
    { productId: 0, quantity: 10 },
  ]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [whs, prods] = await Promise.all([apiGetWarehouses(), apiGetProducts()]);
        setWarehouses(Array.isArray(whs) ? whs : []);
        setProducts(Array.isArray(prods) ? prods : []);
      } catch (err: any) {
        onShowToast(err.message || 'Failed to retrieve facility list', 'error');
      }
    };
    fetchDropdowns();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: 0, quantity: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWh || !toWh) {
      onShowToast('Please select source and destination logistics facilities', 'error');
      return;
    }
    if (fromWh === toWh) {
      onShowToast('Source and destination facilities must be distinct', 'error');
      return;
    }
    const validItems = items.filter((i) => i.productId > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      onShowToast('Add at least one SKU line item with valid quantity', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await apiTransferStock({
        fromWarehouseId: Number(fromWh),
        toWarehouseId: Number(toWh),
        items: validItems,
        note: note || 'Multi-facility stock rebalancing',
      });
      onShowToast('Atomic stock transfer completed across facilities!', 'success');
      onNavigateTab('inventory');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to execute stock transfer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-default)', paddingBottom: '14px' }}>
          <div style={{ background: '#0f172a', color: '#ffffff', padding: '8px', borderRadius: '8px' }}>
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Inter-Facility Inventory Movement</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Execute atomic inventory relocation between logistics hubs with zero discrepancy risk.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div className="form-group">
              <label className="form-label">Origin Facility (Source) *</label>
              <select
                className="form-control"
                value={fromWh}
                onChange={(e) => setFromWh(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select Source Hub...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code ? `[${w.code}] ` : ''}{w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destination Facility (Target) *</label>
              <select
                className="form-control"
                value={toWh}
                onChange={(e) => setToWh(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select Target Hub...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code ? `[${w.code}] ` : ''}{w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ margin: '16px 0 10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Transfer Items & Line Quantities</span>
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
                gridTemplateColumns: '3fr 1fr auto',
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
                placeholder="Qty"
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
                  style={{ padding: '8px', color: '#991b1b' }}
                  onClick={() => handleRemoveItem(idx)}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Transfer Authorization Docket / Notes</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Replenishment transfer for APAC cross-dock surge demand"
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
              <span>{submitting ? 'Executing Transfer...' : 'Confirm Atomic Stock Transfer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
