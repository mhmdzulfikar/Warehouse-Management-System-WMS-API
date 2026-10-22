import React, { useEffect, useState } from 'react';
import {
  apiCreateProduct,
  apiCreateSupplier,
  apiCreateWarehouse,
  apiGetProducts,
  apiGetSuppliers,
  apiGetWarehouses,
} from '../services/api';
import { Product, Supplier, Warehouse } from '../types';
import { Boxes, Building2, Plus, RefreshCw, Truck, X } from 'lucide-react';

interface MasterDataViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({ onShowToast }) => {
  const [subTab, setSubTab] = useState<'products' | 'suppliers' | 'warehouses'>('products');

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalType, setModalType] = useState<'product' | 'supplier' | 'warehouse' | null>(null);

  // Form states
  const [pName, setPName] = useState('');
  const [pSku, setPSku] = useState('');
  const [pPrice, setPPrice] = useState(15000);
  const [pUom, setPUom] = useState('pcs');
  const [pMinStock, setPMinStock] = useState(50);

  const [sName, setSName] = useState('');
  const [sContact, setSContact] = useState('');
  const [sAddress, setSAddress] = useState('');

  const [wName, setWName] = useState('');
  const [wLocation, setWLocation] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, sups, whs] = await Promise.all([
        apiGetProducts(),
        apiGetSuppliers(),
        apiGetWarehouses(),
      ]);
      setProducts(prods);
      setSuppliers(sups);
      setWarehouses(whs);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load master data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCreateProduct({
        name: pName,
        sku: pSku,
        price: Number(pPrice),
        uom: pUom,
        minStock: Number(pMinStock),
      });
      onShowToast('Product created successfully!', 'success');
      setModalType(null);
      setPName('');
      setPSku('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create product', 'error');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCreateSupplier({
        name: sName,
        contact: sContact,
        address: sAddress,
      });
      onShowToast('Supplier created successfully!', 'success');
      setModalType(null);
      setSName('');
      setSContact('');
      setSAddress('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create supplier', 'error');
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCreateWarehouse({
        name: wName,
        location: wLocation,
      });
      onShowToast('Warehouse facility created successfully!', 'success');
      setModalType(null);
      setWName('');
      setWLocation('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create warehouse', 'error');
    }
  };

  const formatRupiah = (amount: number) => {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID');
  };

  return (
    <div>
      {/* Sub-tab Navigation */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn-secondary ${subTab === 'products' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('products')}
            >
              <Boxes size={16} />
              <span>Products ({products.length})</span>
            </button>
            <button
              className={`btn-secondary ${subTab === 'suppliers' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('suppliers')}
            >
              <Truck size={16} />
              <span>Suppliers ({suppliers.length})</span>
            </button>
            <button
              className={`btn-secondary ${subTab === 'warehouses' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('warehouses')}
            >
              <Building2 size={16} />
              <span>Warehouses ({warehouses.length})</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={15} />
            </button>
            {subTab === 'products' && (
              <button className="btn-primary" onClick={() => setModalType('product')}>
                <Plus size={16} />
                <span>Add Product</span>
              </button>
            )}
            {subTab === 'suppliers' && (
              <button className="btn-primary" onClick={() => setModalType('supplier')}>
                <Plus size={16} />
                <span>Add Supplier</span>
              </button>
            )}
            {subTab === 'warehouses' && (
              <button className="btn-primary" onClick={() => setModalType('warehouse')}>
                <Plus size={16} />
                <span>Add Warehouse</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUB-PANE 1: PRODUCTS */}
      {subTab === 'products' && (
        <div className="glass-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>SKU Code</th>
                  <th>Unit Price</th>
                  <th>UOM</th>
                  <th>Min Safe Buffer</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      <code style={{ color: 'var(--accent-cyan)' }}>{p.sku}</code>
                    </td>
                    <td style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                      {formatRupiah(p.price)}
                    </td>
                    <td>{p.uom}</td>
                    <td>
                      <span className="badge badge-approved">{p.minStock ?? 50} {p.uom}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PANE 2: SUPPLIERS */}
      {subTab === 'suppliers' && (
        <div className="glass-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier ID</th>
                  <th>Company / Vendor Name</th>
                  <th>Contact Info</th>
                  <th>Physical Address</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.contact || '-'}</td>
                    <td>{s.address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PANE 3: WAREHOUSES */}
      {subTab === 'warehouses' && (
        <div className="glass-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facility ID</th>
                  <th>Facility Name</th>
                  <th>Geographic Location</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.id}>
                    <td>#{w.id}</td>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>{w.location || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Product */}
      {modalType === 'product' && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Create Master Product</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Minyak Goreng Filma 2L"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">SKU Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. MYK-FLM-02"
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit of Measure (UOM)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. pouch, dus, pcs"
                    value={pUom}
                    onChange={(e) => setPUom(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Standard Price (IDR)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={pPrice}
                    onChange={(e) => setPPrice(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Stock Buffer (Threshold)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={pMinStock}
                    onChange={(e) => setPMinStock(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Supplier */}
      {modalType === 'supplier' && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Register Supplier Vendor</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier}>
              <div className="form-group">
                <label className="form-label">Supplier Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. PT Mitra Logistik Sejahtera"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact (Phone/Email)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 021-889977 / vendor@mitra.com"
                  value={sContact}
                  onChange={(e) => setSContact(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Office / Plant Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Kawasan Industri MM2100, Cikarang"
                  value={sAddress}
                  onChange={(e) => setSAddress(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Warehouse */}
      {modalType === 'warehouse' && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Register Warehouse Facility</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div className="form-group">
                <label className="form-label">Facility Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Gudang Regional Surabaya"
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Geographic Location</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rungkut Industri, Surabaya"
                  value={wLocation}
                  onChange={(e) => setWLocation(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
