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
    { productId: 0, physicalQty: 100, reason: 'Hasil audit perhitungan fisik mingguan' },
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
        onShowToast(err.message || 'Gagal memuat daftar fasilitas gudang', 'error');
      }
    };
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: 0, physicalQty: 50, reason: 'Penyesuaian stok fisik' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      onShowToast('Silakan pilih lokasi gudang yang diperiksa', 'error');
      return;
    }
    const validItems = items.filter((i) => i.productId > 0);
    if (validItems.length === 0) {
      onShowToast('Tambahkan minimal satu jenis barang untuk penyesuaian opname', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await apiAdjustStockOpname({
        warehouseId: Number(warehouseId),
        items: validItems,
        note: note || 'Berita Acara Stock Opname Fisik',
      });
      onShowToast('Penyesuaian stok opname berhasil diterapkan ke sistem!', 'success');
      onNavigateTab('inventory');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menyimpan penyesuaian stock opname', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <ClipboardCheck size={18} style={{ color: 'var(--status-amber-text)' }} />
            <span>Rekonsiliasi Stock Opname Fisik Gudang</span>
          </div>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Masukkan kuantitas fisik riil hasil perhitungan di lapangan. Sistem akan secara otomatis menghitung selisih (discrepancy), memperbarui saldo inventaris, dan mencatatnya ke buku jurnal mutasi.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ maxWidth: '380px', marginBottom: '16px' }}>
            <label className="form-label">Lokasi Gudang yang Diperiksa</label>
            <select
              className="form-control"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">Pilih Gudang yang Diinspeksi...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span className="form-label" style={{ marginBottom: 0 }}>Daftar Hasil Hitung Fisik Lapangan</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
              onClick={handleAddItem}
            >
              <Plus size={13} />
              <span>Tambah Baris</span>
            </button>
          </div>

          {items.map((it, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 2fr auto',
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
                placeholder="Jumlah Fisik"
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
                placeholder="Alasan / Bukti Selisih"
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
                  style={{ padding: '7px', color: 'var(--status-rose-text)' }}
                  onClick={() => handleRemoveItem(idx)}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">No. Berita Acara / Keterangan Batch Opname</label>
            <input
              type="text"
              className="form-control"
              placeholder="Contoh: Berita Acara No. BA/OPN/2026/04 - Audit Stok Akhir Bulan"
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
              <span>{submitting ? 'Menyimpan Penyesuaian...' : 'Terapkan Hasil Opname Fisik'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
