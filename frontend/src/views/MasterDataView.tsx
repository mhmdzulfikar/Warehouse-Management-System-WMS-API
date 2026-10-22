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
import { Boxes, Building2, Plus, RefreshCw, Truck, Users, X } from 'lucide-react';

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
      setProducts(prods);
      setSuppliers(sups);
      setWarehouses(whs);
      setCustomers(custs);
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memuat master data', 'error');
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
      onShowToast('Produk baru berhasil disimpan ke master data!', 'success');
      setModalType(null);
      setPName('');
      setPSku('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menyimpan produk', 'error');
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
      onShowToast('Mitra supplier berhasil didaftarkan!', 'success');
      setModalType(null);
      setSName('');
      setSContact('');
      setSAddress('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menyimpan supplier', 'error');
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCreateWarehouse({
        name: wName,
        location: wLocation,
      });
      onShowToast('Fasilitas gudang baru berhasil didaftarkan!', 'success');
      setModalType(null);
      setWName('');
      setWLocation('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal mendaftarkan gudang', 'error');
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
      onShowToast('Mitra Customer baru berhasil didaftarkan!', 'success');
      setModalType(null);
      setCName('');
      setCCode('');
      setCEmail('');
      setCPhone('');
      setCAddress('');
      setCCity('');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal mendaftarkan customer', 'error');
    }
  };

  const formatRupiah = (amount: number) => {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID');
  };

  return (
    <div>
      {/* Sub-tab Navigation */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`btn-secondary ${subTab === 'products' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('products')}
            >
              <Boxes size={15} />
              <span>Data Produk ({products.length})</span>
            </button>
            <button
              className={`btn-secondary ${subTab === 'customers' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('customers')}
            >
              <Users size={15} />
              <span>Mitra Customer ({customers.length})</span>
            </button>
            <button
              className={`btn-secondary ${subTab === 'suppliers' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('suppliers')}
            >
              <Truck size={15} />
              <span>Mitra Supplier ({suppliers.length})</span>
            </button>
            <button
              className={`btn-secondary ${subTab === 'warehouses' ? 'btn-primary' : ''}`}
              onClick={() => setSubTab('warehouses')}
            >
              <Building2 size={15} />
              <span>Fasilitas Gudang ({warehouses.length})</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={loadData} disabled={loading} title="Perbarui data">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
            {subTab === 'products' && (
              <button className="btn-primary" onClick={() => setModalType('product')}>
                <Plus size={15} />
                <span>Tambah Produk</span>
              </button>
            )}
            {subTab === 'customers' && (
              <button className="btn-primary" onClick={() => setModalType('customer')}>
                <Plus size={15} />
                <span>Tambah Customer</span>
              </button>
            )}
            {subTab === 'suppliers' && (
              <button className="btn-primary" onClick={() => setModalType('supplier')}>
                <Plus size={15} />
                <span>Tambah Supplier</span>
              </button>
            )}
            {subTab === 'warehouses' && (
              <button className="btn-primary" onClick={() => setModalType('warehouse')}>
                <Plus size={15} />
                <span>Tambah Gudang</span>
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
                  <th>ID</th>
                  <th>Nama Barang / Produk</th>
                  <th>Kode SKU</th>
                  <th>Harga Standar</th>
                  <th>Satuan (UOM)</th>
                  <th>Ambang Minimum</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td>
                      <code>{p.sku}</code>
                    </td>
                    <td className="tabular-num">{formatRupiah(p.price)}</td>
                    <td>{p.uom}</td>
                    <td>
                      <span className="badge badge-approved tabular-num">{p.minStock ?? 50} {p.uom}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PANE 2: CUSTOMERS (PEMBELI) */}
      {subTab === 'customers' && (
        <div className="glass-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode Customer</th>
                  <th>Nama Perusahaan / Pembeli</th>
                  <th>Kontak Telepon & Email</th>
                  <th>Kota / Wilayah</th>
                  <th>Alamat Kantor / Gudang Tujuan</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      Belum ada data customer terdaftar.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.code}</strong>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                      <td>
                        <div>{c.phone || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email || ''}</div>
                      </td>
                      <td>
                        <span className="badge badge-partial" style={{ background: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1' }}>
                          {c.city || 'Indonesia'}
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
        <div className="glass-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Perusahaan Vendor</th>
                  <th>Kontak / Telepon / Email</th>
                  <th>Alamat Kantor / Pabrik</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                    <td>{s.contact || '-'}</td>
                    <td>{s.address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-PANE 4: WAREHOUSES */}
      {subTab === 'warehouses' && (
        <div className="glass-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nama Fasilitas Gudang</th>
                  <th>Alamat / Lokasi Geografis</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.id}>
                    <td>#{w.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.name}</td>
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
              <h3 className="modal-title">Tambah Produk Baru</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label className="form-label">Nama Barang</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Minyak Goreng Filma 2L"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Kode SKU Unik</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: MYK-FLM-02"
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Satuan Ukuran (UOM)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: pouch, dus, pcs"
                    value={pUom}
                    onChange={(e) => setPUom(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Harga Standar (Rp)</label>
                  <input
                    type="number"
                    className="form-control tabular-num"
                    min={0}
                    value={pPrice}
                    onChange={(e) => setPPrice(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Batas Stok Minimum (Buffer)</label>
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

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Customer */}
      {modalType === 'customer' && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Daftarkan Mitra Customer Baru</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Kode (Opsional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="CUST-004"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Perusahaan / Customer *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="PT Retail Makmur Sejahtera"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Kontak Telepon</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="0812-3456-7890"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email PIC</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="purchasing@retailmakmur.com"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Alamat Kantor / Gudang Tujuan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Jl. Ahmad Yani No. 120"
                    value={cAddress}
                    onChange={(e) => setCAddress(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kota / Wilayah</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Surabaya"
                    value={cCity}
                    onChange={(e) => setCCity(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Customer
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
              <h3 className="modal-title">Daftarkan Pemasok (Supplier) Baru</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier}>
              <div className="form-group">
                <label className="form-label">Nama Perusahaan Pemasok</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: PT Mitra Logistik Sejahtera"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kontak Resmi (Telepon / Email)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: 021-889977 / vendor@mitra.com"
                  value={sContact}
                  onChange={(e) => setSContact(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Kantor / Pergudangan</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Kawasan Industri MM2100, Cikarang"
                  value={sAddress}
                  onChange={(e) => setSAddress(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Pemasok
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
              <h3 className="modal-title">Daftarkan Fasilitas Gudang Baru</h3>
              <button className="modal-close" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse}>
              <div className="form-group">
                <label className="form-label">Nama Fasilitas Gudang</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Gudang Distribusi Surabaya Barat"
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lokasi / Alamat Lengkap</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Jl. Rungkut Industri No. 45, Surabaya"
                  value={wLocation}
                  onChange={(e) => setWLocation(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalType(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Fasilitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
