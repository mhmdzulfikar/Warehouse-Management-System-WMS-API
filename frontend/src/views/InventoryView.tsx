import React, { useEffect, useState } from 'react';
import { apiGetInventory, apiGetWarehouses } from '../services/api';
import { InventoryItem, Warehouse } from '../types';
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
      onShowToast(err.message || 'Failed to load inventory', 'error');
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
      {/* Control Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px' }}
                placeholder="Search products by SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <select
                className="form-control"
                style={{ width: '200px' }}
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
            <button className="btn-primary" onClick={() => onNavigateTab('transfer')}>
              Transfer Stock
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel">
        <div className="panel-header">
          <div className="panel-title">
            <Boxes size={20} />
            <span>Facility Stock Records ({filteredItems.length} entries)</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Warehouse Facility</th>
                <th>Quantity Balance</th>
                <th>Min Stock Threshold</th>
                <th>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const minStock = item.product?.minStock ?? 50;
                const isCritical = item.quantity <= minStock;

                return (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td style={{ fontWeight: 600 }}>{item.product?.name || 'Unknown'}</td>
                    <td>
                      <code style={{ color: 'var(--accent-cyan)' }}>{item.product?.sku || '-'}</code>
                    </td>
                    <td>{item.warehouse?.name || `Warehouse #${item.warehouseId}`}</td>
                    <td>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                        {item.quantity} {item.product?.uom || 'pcs'}
                      </span>
                    </td>
                    <td>{minStock} {item.product?.uom || 'pcs'}</td>
                    <td>
                      {isCritical ? (
                        <span className="badge badge-critical">CRITICAL LOW</span>
                      ) : (
                        <span className="badge badge-in">HEALTHY</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                    {loading ? 'Loading inventory data...' : 'No inventory records matched your query.'}
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
