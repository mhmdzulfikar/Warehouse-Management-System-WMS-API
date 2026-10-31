import React, { useEffect, useState } from 'react';
import { apiGetInventory, apiGetWarehouses } from '../services/api';
import type { InventoryItem, Warehouse } from '../types';
import { 
  Boxes, 
  RefreshCw, 
  Search, 
  MapPin, 
  Barcode, 
  Tag, 
  AlertTriangle, 
  Layers, 
  DollarSign 
} from 'lucide-react';

interface InventoryViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateTab: (tab: any) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onShowToast, onNavigateTab }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invData, whData] = await Promise.all([
        apiGetInventory(selectedWarehouse ? Number(selectedWarehouse) : undefined),
        apiGetWarehouses(),
      ]);
      setInventory(Array.isArray(invData) ? invData : []);
      setWarehouses(Array.isArray(whData) ? whData : []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load enterprise inventory ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWarehouse]);

  // Extract unique categories for filter
  const categories = Array.from(
    new Set(
      inventory
        .map((item) => item.product?.category)
        .filter((cat): cat is string => Boolean(cat))
    )
  );

  const filteredItems = inventory.filter((item) => {
    const pName = item.product?.name?.toLowerCase() || '';
    const sku = item.product?.sku?.toLowerCase() || '';
    const barcode = item.product?.barcode?.toLowerCase() || '';
    const location = item.storageLocation?.toLowerCase() || '';
    const category = item.product?.category || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch = 
      pName.includes(term) || 
      sku.includes(term) || 
      barcode.includes(term) || 
      location.includes(term);

    const matchesCategory = selectedCategory ? category === selectedCategory : true;

    return matchesSearch && matchesCategory;
  });

  // KPI calculations
  const totalUnits = filteredItems.reduce((acc, curr) => acc + (curr.currentQty ?? curr.quantity ?? 0), 0);
  const totalValue = filteredItems.reduce((acc, curr) => {
    const qty = curr.currentQty ?? curr.quantity ?? 0;
    const price = Number(curr.product?.basePrice ?? curr.product?.price ?? 0);
    return acc + (qty * price);
  }, 0);
  const criticalItems = filteredItems.filter((item) => {
    const qty = item.currentQty ?? item.quantity ?? 0;
    const min = item.product?.minStock ?? 10;
    return qty <= min;
  });

  const formatCurrency = (val: number) => {
    return '$' + (val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Enterprise Metrics Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', padding: '10px', borderRadius: '8px' }}>
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Active Ledger Lines</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700 }} className="tabular-num">{filteredItems.length} SKUs</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#eff6ff', color: '#2563eb', padding: '10px', borderRadius: '8px' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Physical On-Hand</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700 }} className="tabular-num">{totalUnits.toLocaleString('en-US')} Units</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#ecfdf5', color: '#059669', padding: '10px', borderRadius: '8px' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Valuation</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700 }} className="tabular-num">{formatCurrency(totalValue)}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: criticalItems.length > 0 ? '#fffbeb' : '#f8fafc', color: criticalItems.length > 0 ? '#d97706' : '#64748b', padding: '10px', borderRadius: '8px' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Replenishment Triggers</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: criticalItems.length > 0 ? '#b45309' : 'inherit' }} className="tabular-num">
              {criticalItems.length} Items
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '36px' }}
                placeholder="Search by Product Name, SKU, Barcode, Bin Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Warehouse Facility Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                className="form-control"
                style={{ width: '220px' }}
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="">All Logistics Facilities</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code ? `[${w.code}] ` : ''}{w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={15} style={{ color: 'var(--text-muted)' }} />
                <select
                  className="form-control"
                  style={{ width: '200px' }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button className="btn-primary" onClick={() => onNavigateTab('transfer')}>
              Inter-Bin Transfer
            </button>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
            <Boxes size={18} />
            <span>Global Inventory Balance Ledger</span>
            <span style={{ fontSize: '0.8rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
              {filteredItems.length} records
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Product & Enterprise Specification</th>
                <th>Category</th>
                <th>Storage Location & Bin</th>
                <th>Batch / Lot</th>
                <th style={{ textAlign: 'right' }}>On-Hand Stock</th>
                <th style={{ textAlign: 'right' }}>Unit Value</th>
                <th style={{ textAlign: 'right' }}>Total Asset</th>
                <th>Health Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const qty = item.currentQty ?? item.quantity ?? 0;
                const minStock = item.product?.minStock ?? 10;
                const isOutOfStock = qty === 0;
                const isCritical = qty <= minStock && !isOutOfStock;
                const price = Number(item.product?.basePrice ?? item.product?.price ?? 0);
                const lineTotal = qty * price;

                return (
                  <tr key={item.id}>
                    <td className="tabular-num" style={{ color: 'var(--text-muted)' }}>#{item.id}</td>
                    
                    {/* Product & SKU */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {item.product?.name || 'Unknown Item'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                        <code style={{ background: '#f8fafc', padding: '1px 6px', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
                          {item.product?.sku || '-'}
                        </code>
                        {item.product?.barcode && (
                          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Barcode size={12} />
                            <span className="tabular-num">{item.product.barcode}</span>
                          </span>
                        )}
                        {item.product?.storageTemp && item.product.storageTemp !== 'Ambient' && (
                          <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 500 }}>
                            {item.product.storageTemp}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {item.product?.category || 'General Industrial'}
                      </span>
                    </td>

                    {/* Location & Warehouse */}
                    <td>
                      <div>
                        {item.storageLocation ? (
                          <span style={{ 
                            fontFamily: 'JetBrains Mono, monospace', 
                            fontSize: '0.8rem', 
                            fontWeight: 600, 
                            color: '#0f172a',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            marginBottom: '3px'
                          }}>
                            {item.storageLocation}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned Bin</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {item.warehouse?.code ? `[${item.warehouse.code}] ` : ''}
                        {item.warehouse?.name || `Warehouse #${item.warehouseId}`}
                      </div>
                    </td>

                    {/* Batch / Lot */}
                    <td>
                      {item.batchNumber ? (
                        <div style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>
                          {item.batchNumber}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Standard Lot</span>
                      )}
                      {item.expiryDate && (
                        <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
                          Exp: {new Date(item.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </td>

                    {/* On-Hand Stock */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="tabular-num">
                        {qty.toLocaleString('en-US')}
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>
                          {item.product?.uom || 'units'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="tabular-num">
                        Min: {minStock} {item.product?.uom || 'units'}
                      </div>
                    </td>

                    {/* Unit Price */}
                    <td style={{ textAlign: 'right' }} className="tabular-num">
                      {formatCurrency(price)}
                    </td>

                    {/* Total Line Value */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-num">
                      {formatCurrency(lineTotal)}
                    </td>

                    {/* Status Badge */}
                    <td>
                      {isOutOfStock ? (
                        <span className="badge" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                          OUT OF STOCK
                        </span>
                      ) : isCritical ? (
                        <span className="badge" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                          LOW BUFFER ({minStock - qty} Short)
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                          OPTIMAL
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '36px' }}>
                    {loading ? 'Querying multi-facility ledger records...' : 'No inventory records matched the specified search criteria.'}
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
