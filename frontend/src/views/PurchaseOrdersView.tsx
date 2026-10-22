import React, { useEffect, useState } from 'react';
import {
  apiCreatePurchaseOrder,
  apiGetProducts,
  apiGetPurchaseOrders,
  apiGetSuppliers,
  apiGetWarehouses,
  apiReceivePurchaseOrder,
} from '../services/api';
import type { Product, PurchaseOrder, Supplier, Warehouse } from '../types';
import { CheckCircle2, PackagePlus, Plus, RefreshCw, ShoppingCart, X } from 'lucide-react';

interface PurchaseOrdersViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({ onShowToast }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [orderItems, setOrderItems] = useState<Array<{ productId: number; quantity: number; price: number }>>([
    { productId: 0, quantity: 10, price: 50000 },
  ]);

  // Receive Modal
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [pos, sups, prods, whs] = await Promise.all([
        apiGetPurchaseOrders(),
        apiGetSuppliers(),
        apiGetProducts(),
        apiGetWarehouses(),
      ]);
      setOrders(pos);
      setSuppliers(sups);
      setProducts(prods);
      setWarehouses(whs);
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memuat daftar Purchase Order', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { productId: 0, quantity: 10, price: 10000 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      onShowToast('Silakan pilih mitra pemasok (supplier)', 'error');
      return;
    }
    const validItems = orderItems.filter((i) => i.productId > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      onShowToast('Tambahkan minimal satu baris barang yang valid', 'error');
      return;
    }

    try {
      await apiCreatePurchaseOrder({
        supplierId: Number(supplierId),
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        items: validItems,
      });
      onShowToast('Dokumen Purchase Order berhasil diterbitkan!', 'success');
      setShowCreateModal(false);
      setOrderItems([{ productId: 0, quantity: 10, price: 50000 }]);
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal membuat Purchase Order', 'error');
    }
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPo(po);
    const initialMap: Record<number, number> = {};
    po.items?.forEach((it) => {
      const remaining = it.quantity - (it.receivedQty || 0);
      initialMap[it.productId] = remaining > 0 ? remaining : 0;
    });
    setReceiveQtys(initialMap);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPo) return;

    const payloadItems = Object.entries(receiveQtys)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([productId, quantity]) => ({
        productId: Number(productId),
        quantity: Number(quantity),
      }));

    if (payloadItems.length === 0) {
      onShowToast('Masukkan minimal 1 unit kuantitas yang diterima fisik', 'error');
      return;
    }

    try {
      await apiReceivePurchaseOrder(selectedPo.id, payloadItems);
      onShowToast(`Penerimaan barang PO #${selectedPo.id} berhasil dicatat!`, 'success');
      setSelectedPo(null);
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memproses penerimaan barang PO', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED': return <span className="badge badge-received">SELESAI (DITERIMA)</span>;
      case 'PARTIALLY_RECEIVED': return <span className="badge badge-partial">DITERIMA SEBAGIAN</span>;
      case 'APPROVED': return <span className="badge badge-approved">DISETUJUI (APPROVED)</span>;
      default: return <span className="badge badge-pending">MENUNGGU (PENDING)</span>;
    }
  };

  const formatRupiah = (amount: number) => {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID');
  };

  return (
    <div>
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600 }}>Total Dokumen Purchase Order: {orders.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={14} />
              <span>Perbarui</span>
            </button>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={15} />
              <span>Buat PO Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Dokumen</th>
                <th>Mitra Pemasok (Supplier)</th>
                <th>Rincian Barang & Kuantitas</th>
                <th>Total Nilai Pesanan</th>
                <th>Status PO</th>
                <th>Tanggal Pengajuan</th>
                <th>Tindakan Operasional</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => {
                const totalValue =
                  po.items?.reduce((sum, it) => sum + it.quantity * it.price, 0) || 0;
                const isFullyReceived = po.status === 'RECEIVED';

                return (
                  <tr key={po.id}>
                    <td>
                      <strong>PO-{String(po.id).padStart(4, '0')}</strong>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {po.supplier?.name || `Supplier #${po.supplierId}`}
                    </td>
                    <td>
                      {po.items?.map((it, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem' }} className="tabular-num">
                          • {it.product?.name || `Item #${it.productId}`} ({it.receivedQty || 0}/{it.quantity} {it.product?.uom || 'unit'})
                        </div>
                      ))}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }} className="tabular-num">
                      {formatRupiah(totalValue)}
                    </td>
                    <td>{getStatusBadge(po.status)}</td>
                    <td className="tabular-num">{new Date(po.createdAt).toLocaleDateString('id-ID')}</td>
                    <td>
                      {!isFullyReceived && (
                        <button
                          className="btn-primary"
                          style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          onClick={() => openReceiveModal(po)}
                        >
                          <PackagePlus size={13} />
                          <span>Terima Barang</span>
                        </button>
                      )}
                      {isFullyReceived && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Pesanan Terpenuhi</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '28px' }}>
                    {loading ? 'Memuat data pesanan...' : 'Belum ada dokumen Purchase Order.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Buat PO */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Formulir Purchase Order (PO) Baru</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Mitra Pemasok (Supplier)</label>
                  <select
                    className="form-control"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                    required
                  >
                    <option value="">Pilih Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Gudang Tujuan Penerimaan</label>
                  <select
                    className="form-control"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Gudang Default...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ margin: '14px 0 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Item Barang Pesanan</span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  onClick={handleAddItemRow}
                >
                  <Plus size={13} />
                  <span>Tambah Baris</span>
                </button>
              </div>

              {orderItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1.5fr auto',
                    gap: '8px',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <select
                    className="form-control"
                    value={item.productId}
                    onChange={(e) => {
                      const updated = [...orderItems];
                      updated[idx].productId = Number(e.target.value);
                      const prod = products.find((p) => p.id === Number(e.target.value));
                      if (prod) updated[idx].price = prod.price;
                      setOrderItems(updated);
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
                    placeholder="Qty"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...orderItems];
                      updated[idx].quantity = Number(e.target.value);
                      setOrderItems(updated);
                    }}
                    required
                  />

                  <input
                    type="number"
                    className="form-control tabular-num"
                    placeholder="Harga Satuan"
                    min={0}
                    value={item.price}
                    onChange={(e) => {
                      const updated = [...orderItems];
                      updated[idx].price = Number(e.target.value);
                      setOrderItems(updated);
                    }}
                    required
                  />

                  {orderItems.length > 1 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '7px', color: 'var(--status-rose-text)' }}
                      onClick={() => handleRemoveItemRow(idx)}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Terbitkan Dokumen PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Terima Barang PO */}
      {selectedPo && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Penerimaan Barang Fisik PO #{selectedPo.id}</h3>
              <button className="modal-close" onClick={() => setSelectedPo(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Masukkan kuantitas fisik barang yang tiba di gudang. Sistem secara fleksibel mendukung penerimaan bertahap (parsial).
              </p>

              {selectedPo.items?.map((it) => {
                const remaining = it.quantity - (it.receivedQty || 0);

                return (
                  <div
                    key={it.productId}
                    style={{
                      background: '#f8fafc',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '10px',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {it.product?.name || `Produk #${it.productId}`}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} className="tabular-num">
                        Dipesan: {it.quantity} | Masuk: {it.receivedQty || 0}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Kuantitas Masuk:</label>
                      <input
                        type="number"
                        className="form-control tabular-num"
                        style={{ width: '110px' }}
                        min={0}
                        max={remaining}
                        value={receiveQtys[it.productId] ?? 0}
                        onChange={(e) =>
                          setReceiveQtys({
                            ...receiveQtys,
                            [it.productId]: Number(e.target.value),
                          })
                        }
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--status-emerald-text)' }} className="tabular-num">
                        Sisa belum tiba: {remaining} {it.product?.uom || 'unit'}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedPo(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  <CheckCircle2 size={15} />
                  <span>Konfirmasi Penerimaan Gudang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
