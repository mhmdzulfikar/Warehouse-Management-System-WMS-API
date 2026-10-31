import React, { useEffect, useState } from 'react';
import {
  apiCreateCustomer,
  apiCreateProduct,
  apiCreateSupplier,
  apiCreateWarehouse,
  apiGetCustomers,
  apiGetProducts,
  apiGetSuppliers,
  apiGetWarehouses,
} from '../services/api';
import type { Customer, Product, Supplier, Warehouse } from '../types';
import { 
  Boxes, 
  Building2, 
  Plus, 
  RefreshCw, 
  Truck, 
  Users, 
  X, 
  Barcode 
} from 'lucide-react';

interface MasterDataViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({ onShowToast }) => {
  const [subTab, setSubTab] = useState<'products' | 'suppliers' | 'warehouses' | 'customers'>('products');

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalType, setModalType] = useState<'product' | 'supplier' | 'warehouse' | 'customer' | null>(null);

  // Form states - Product
  const [pName, setPName] = useState('');
  const [pSku, setPSku] = useState('');
  const [pBarcode, setPBarcode] = useState('');
  const [pCategory, setPCategory] = useState('Computing & Infrastructure');
  const [pPrice, setPPrice] = useState(1250);
  const [pUom, setPUom] = useState('unit');
  const [pMinStock, setPMinStock] = useState(15);
  const [pStorageTemp, setPStorageTemp] = useState('Ambient');

  // Form states - Supplier
  const [sName, setSName] = useState('');
  const [sContact, setSContact] = useState('');
  const [sAddress, setSAddress] = useState('');

  // Form states - Warehouse
  const [wName, setWName] = useState('');
  const [wCode, setWCode] = useState('');
  const [wLocation, setWLocation] = useState('');
  const [wZoneType, setWZoneType] = useState('General High-Bay & Automated Storage');

  // Form states - Customer
  const [cName, setCName] = useState('');
  const [cCode, setCCode] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cCity, setCCity] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, sups, whs, custs] = await Promise.all([
        apiGetProducts(),
        apiGetSuppliers(),
        apiGetWarehouses(),
        apiGetCustomers(),
      ]);
      setProducts(Array.isArray(prods) ? prods : []);
      setSuppliers(Array.isArray(sups) ? sups : []);
      setWarehouses(Array.isArray(whs) ? whs : []);
      setCustomers(Array.isArray(custs) ? custs : []);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load enterprise master catalog', 'error');
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
        barcode: pBarcode || undefined,
        category: pCategory || undefined,
        price: Number(pPrice),
        uom: pUom,
        minStock: Number(pMinStock),
        storageTemp: pStorageTemp || undefined,
      });
      onShowToast('New enterprise SKU registered in master catalog!', 'success');
      setModalType(null);
      setPName('');
      setPSku('');
      setPBarcode('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to save product specification', 'error');
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
      onShowToast('Tier-1 Global Supplier registered successfully!', 'success');
      setModalType(null);
      setSName('');
      setSContact('');
      setSAddress('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to register supplier', 'error');
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCreateWarehouse({
        name: wName,
        code: wCode || undefined,
        location: wLocation,
        zoneType: wZoneType || undefined,
      });
      onShowToast('Global Logistics Hub added to facility network!', 'success');
      setModalType(null);
      setWName('');
      setWCode('');
      setWLocation('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to register logistics facility', 'error');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCreateCustomer({
        name: cName,
        code: cCode || undefined,
        email: cEmail || undefined,
        phone: cPhone || undefined,
        address: cAddress || undefined,
        city: cCity || undefined,
      });
      onShowToast('Enterprise Customer Account registered!', 'success');
      setModalType(null);
      setCName('');
      setCCode('');
      setCEmail('');
      setCPhone('');
      setCAddress('');
      setCCity('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to register customer account', 'error');
    }
  };

  const formatCurrency = (amount: number) => {
    return '$' + (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub-tab Navigation */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`btn-secondary ${subTab === 'products' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('products')}
            >
              <Boxes size={15} />
              <span>SKU Catalog ({products.length})</span>
            </button>
            <button
              className={`btn-secondary ${subTab === 'customers' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('customers')}
            >
              <Users size={15} />
              <span>Global Customers ({customers.length})</span>
            </button>
            <button
              className={`btn-secondary ${subTab === 'suppliers' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('suppliers')}
            >
              <Truck size={15} />
              <span>Tier-1 Suppliers ({suppliers.length})</span>
            </button>
            <button
              className={`btn-secondary ${subTab === 'warehouses' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('warehouses')}
            >
              <Building2 size={15} />
              <span>Logistics Facilities ({warehouses.length})</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={loadData} disabled={loading} title="Refresh records">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
            {subTab === 'products' && (
              <button className="btn-primary" onClick={() => setModalType('product')}>
                <Plus size={15} />
                <span>Register SKU</span>
              </button>
            )}
            {subTab === 'customers' && (
              <button className="btn-primary" onClick={() => setModalType('customer')}>
                <Plus size={15} />
                <span>Add Customer</span>
              </button>
            )}
            {subTab === 'suppliers' && (
              <button className="btn-primary" onClick={() => setModalType('supplier')}>
                <Plus size={15} />
                <span>Add Supplier</span>
              </button>
            )}
            {subTab === 'warehouses' && (
              <button className="btn-primary" onClick={() => setModalType('warehouse')}>
                <Plus size={15} />
                <span>Add Facility</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUB-PANE 1: PRODUCTS */}
      {subTab === 'products' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Product Specification & Name</th>
                  <th>SKU & Barcode (GTIN)</th>
                  <th>Enterprise Category</th>
                  <th style={{ textAlign: 'right' }}>Standard Base Price</th>
                  <th>UOM</th>
                  <th>Buffer Threshold</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="tabular-num" style={{ color: 'var(--text-muted)' }}>#{p.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      {p.storageTemp && p.storageTemp !== 'Ambient' && (
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 500 }}>
                          {p.storageTemp}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code>{p.sku}</code>
                      </div>
                      {p.barcode && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Barcode size={12} />
                          <span className="tabular-num">{p.barcode}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {p.category || 'General Industrial'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-num">
                      {formatCurrency(p.basePrice ?? p.price)}
                    </td>
                    <td>{p.uom}</td>
                    <td>
                      <span className="badge badge-approved tabular-num">{p.minStock ?? 10} {p.uom}</span>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No enterprise SKUs registered in the master catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PANE 2: CUSTOMERS */}
      {subTab === 'customers' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account Code</th>
                  <th>Corporate Customer / Enterprise Partner</th>
                  <th>Corporate Contact</th>
                  <th>Region / Logistics Hub</th>
                  <th>Destination Address / Receiving Bay</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No enterprise customer accounts registered yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <code style={{ fontWeight: 600 }}>{c.code}</code>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                      <td>
                        <div>{c.phone || c.contactInfo || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email || ''}</div>
                      </td>
                      <td>
                        <span className="badge badge-partial" style={{ background: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1' }}>
                          {c.city || 'Global Hub'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.address || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PANE 3: SUPPLIERS */}
      {subTab === 'suppliers' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Tier-1 Supplier Enterprise</th>
                  <th>Official Corporate Contact</th>
                  <th>Global Manufacturing / Logistics Address</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="tabular-num" style={{ color: 'var(--text-muted)' }}>#{s.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                    <td style={{ fontSize: '0.85rem' }}>{s.contactInfo || s.contact || '-'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{s.address || '-'}</td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No tier-1 suppliers registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PANE 4: WAREHOUSES */}
      {subTab === 'warehouses' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Code</th>
                  <th>Logistics Facility Name</th>
                  <th>Geographic Location & Terminal</th>
                  <th>Storage Architecture & Zone Type</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <code style={{ fontWeight: 700 }}>{w.code || `WH-${w.id}`}</code>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.name}</td>
                    <td style={{ fontSize: '0.85rem' }}>{w.location || '-'}</td>
                    <td>
                      <span className="badge badge-approved" style={{ background: '#f8fafc', color: '#1e293b', borderColor: '#e2e8f0', fontSize: '0.75rem' }}>
                        {w.zoneType || 'General High-Bay Logistics'}
                      </span>
                    </td>
                  </tr>
                ))}
                {warehouses.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No logistics facilities registered in the network.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Product */}
      {modalType === 'product' && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Register Enterprise SKU</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label className="form-label">Product Name & Specification</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Industrial Solid-State LiDAR Sensor 2D"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">SKU Identifier</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SKU-LID-AUT-08"
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Barcode / GTIN</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 0819238472910"
                    value={pBarcode}
                    onChange={(e) => setPBarcode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Enterprise Category</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Automotive & Robotics"
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit of Measure (UOM)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. unit, box, kit"
                    value={pUom}
                    onChange={(e) => setPUom(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Base Price ($ USD)</label>
                  <input
                    type="number"
                    className="form-control tabular-num"
                    min={0}
                    step="0.01"
                    value={pPrice}
                    onChange={(e) => setPPrice(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Buffer Minimum Stock</label>
                  <input
                    type="number"
                    className="form-control tabular-num"
                    min={0}
                    value={pMinStock}
                    onChange={(e) => setPMinStock(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Storage Class / Temperature</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ambient, -20°C Cold-Chain, Hazmat"
                  value={pStorageTemp}
                  onChange={(e) => setPStorageTemp(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save SKU Specification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Customer */}
      {modalType === 'customer' && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Register Global Customer Account</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Account Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. CUST-GLB-005"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Corporate Enterprise Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Apex Industrial Systems Inc"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Corporate Telephone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+1-800-555-0199"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Official Logistics Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="logistics@apexsystems.com"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Receiving Hub Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="1200 Logistics Parkway, Dock 4"
                    value={cAddress}
                    onChange={(e) => setCAddress(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Metro / Region</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="California, USA"
                    value={cCity}
                    onChange={(e) => setCCity(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Supplier */}
      {modalType === 'supplier' && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Register Tier-1 Supplier</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier}>
              <div className="form-group">
                <label className="form-label">Supplier Enterprise Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Continental Precision Dynamics GmbH"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Corporate Contact (Phone / Email)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+49-69-700-1100 | logistics@continental.de"
                  value={sContact}
                  onChange={(e) => setSContact(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Headquarters / Manufacturing Facility Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Vahrenwalder Str. 9, 30165 Hannover, Germany"
                  value={sAddress}
                  onChange={(e) => setSAddress(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Warehouse */}
      {modalType === 'warehouse' && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Register Logistics Facility Hub</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Facility Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="GLOBAL-DC-04"
                    value={wCode}
                    onChange={(e) => setWCode(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Facility Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tokyo Air Freight Gateway Hub"
                    value={wName}
                    onChange={(e) => setWName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Geographic Location</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Narita International Airport Cargo Bay, Chiba, Japan"
                  value={wLocation}
                  onChange={(e) => setWLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Zone Architecture & Capabilities</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="High-Velocity Cross-Dock & Cold-Chain Vault"
                  value={wZoneType}
                  onChange={(e) => setWZoneType(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Facility Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
