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
        onShowToast(err.message || 'Gagal memuat daftar fasilitas gudang', 'error');
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
      onShowToast('Silakan pilih gudang asal dan gudang tujuan', 'error');
      return;
    }
    if (fromWh === toWh) {
      onShowToast('Gudang asal dan tujuan tidak boleh sama', 'error');
      return;
    }
    const validItems = items.filter((i) => i.productId > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      onShowToast('Tambahkan minimal satu jenis barang dengan jumlah valid', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await apiTransferStock({
        fromWarehouseId: Number(fromWh),
        toWarehouseId: Number(toWh),
        items: validItems,
        note: note || 'Penyeimbangan stok antar fasilitas gudang',
      });
      onShowToast('Stok berhasil dipindahkan antar fasilitas gudang!', 'success');
      onNavigateTab('inventory');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memproses pemindahan stok', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <ArrowRightLeft size={18} style={{ color: 'var(--accent-blue)' }} />
            <span>Formulir Pemindahan Stok Antar Fasilitas Gudang</span>
          </div>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Jalankan pemindahan fisik inventaris antar lokasi gudang secara atomik. Sistem secara otomatis mendebit stok pada gudang asal dan mengkredit gudang tujuan dalam satu transaksi ledger.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Gudang Asal (Pengirim)</label>
              <select
                className="form-control"
                value={fromWh}
                onChange={(e) => setFromWh(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Pilih Gudang Asal...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Gudang Tujuan (Penerima)</label>
              <select
                className="form-control"
                value={toWh}
                onChange={(e) => setToWh(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Pilih Gudang Tujuan...</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span className="form-label" style={{ marginBottom: 0 }}>Daftar Barang yang Dipindahkan</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              onClick={handleAddItem}
            >
              <Plus size={13} />
              <span>Tambah Barang</span>
            </button>
          </div>

          {items.map((it, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr auto',
                gap: '8px',
                marginBottom: '8px',
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
                <option value={0}>Pilih Produk...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>

              <input
                type="number"
                className="form-control tabular-num"
                placeholder="Jumlah (Qty)"
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
                  style={{ padding: '7px', color: 'var(--status-rose-text)' }}
                  onClick={() => handleRemoveItem(idx)}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Keterangan / No. Surat Jalan</label>
            <input
              type="text"
              className="form-control"
              placeholder="Contoh: Surat Jalan SJ/2026/04/001 - Penyeimbangan stok cabang"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={() => onNavigateTab('inventory')}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Check size={15} />
              <span>{submitting ? 'Memproses Transfer...' : 'Konfirmasi Pemindahan Stok'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
