import React, { useEffect, useState } from 'react';
import { apiGetInventory, apiGetWarehouses } from '../services/api';
import type { InventoryItem, Warehouse } from '../types';
import { Boxes, Filter, RefreshCw, Search } from 'lucide-react';

interface InventoryViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateTab: (tab: any) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onShowToast, onNavigateTab }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invData, whData] = await Promise.all([
        apiGetInventory(selectedWarehouse ? Number(selectedWarehouse) : undefined),
        apiGetWarehouses(),
      ]);
      setInventory(invData);
      setWarehouses(whData);
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memuat saldo stok gudang', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWarehouse]);

  const filteredItems = inventory.filter((item) => {
    const pName = item.product?.name?.toLowerCase() || '';
    const sku = item.product?.sku?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();
    return pName.includes(term) || sku.includes(term);
  });

  return (
    <div>
      {/* Filter & Control Bar */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '36px' }}
                placeholder="Cari barang berdasarkan nama produk atau SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                className="form-control"
                style={{ width: '210px' }}
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="">Semua Lokasi Gudang</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={14} />
              <span>Perbarui</span>
            </button>
            <button className="btn-primary" onClick={() => onNavigateTab('transfer')}>
              Transfer Barang
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Boxes size={18} />
            <span>Daftar Saldo Stok Barang ({filteredItems.length} baris)</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Produk / Barang</th>
                <th>Kode SKU</th>
                <th>Lokasi Fasilitas Gudang</th>
                <th>Saldo Stok Fisik</th>
                <th>Batas Minimum (Buffer)</th>
                <th>Status Ketersediaan</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const minStock = item.product?.minStock ?? 50;
                const isCritical = item.quantity <= minStock;

                return (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.product?.name || 'Produk Tidak Dikenal'}
                    </td>
                    <td>
                      <code>{item.product?.sku || '-'}</code>
                    </td>
                    <td>{item.warehouse?.name || `Gudang #${item.warehouseId}`}</td>
                    <td>
                      <strong style={{ fontSize: '0.95rem' }} className="tabular-num">
                        {item.quantity} {item.product?.uom || 'pcs'}
                      </strong>
                    </td>
                    <td className="tabular-num">{minStock} {item.product?.uom || 'pcs'}</td>
                    <td>
                      {isCritical ? (
                        <span className="badge badge-critical">KRITIS / KURANG</span>
                      ) : (
                        <span className="badge badge-in">AMAN (NORMAL)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '28px' }}>
                    {loading ? 'Memuat data inventaris...' : 'Tidak ada data stok yang sesuai dengan pencarian.'}
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
