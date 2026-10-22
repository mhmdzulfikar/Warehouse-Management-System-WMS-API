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
      onShowToast(err.message || 'Failed to load purchase orders', 'error');
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
      onShowToast('Please select a supplier', 'error');
      return;
    }
    const validItems = orderItems.filter((i) => i.productId > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      onShowToast('Please add at least one valid product item', 'error');
      return;
    }

    try {
      await apiCreatePurchaseOrder({
        supplierId: Number(supplierId),
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        items: validItems,
      });
      onShowToast('Purchase Order created successfully!', 'success');
      setShowCreateModal(false);
      setOrderItems([{ productId: 0, quantity: 10, price: 50000 }]);
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create PO', 'error');
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
      onShowToast('Enter at least 1 quantity to receive', 'error');
      return;
    }

    try {
      await apiReceivePurchaseOrder(selectedPo.id, payloadItems);
      onShowToast(`Items successfully received for PO #${selectedPo.id}`, 'success');
      setSelectedPo(null);
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to process PO receiving', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED': return <span className="badge badge-received">RECEIVED</span>;
      case 'PARTIALLY_RECEIVED': return <span className="badge badge-partial">PARTIAL</span>;
      case 'APPROVED': return <span className="badge badge-approved">APPROVED</span>;
      default: return <span className="badge badge-pending">PENDING</span>;
    }
  };

  const formatRupiah = (amount: number) => {
    return 'Rp ' + (amount || 0).toLocaleString('id-ID');
  };

  return (
    <div>
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={20} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600 }}>Total Purchase Orders: {orders.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} />
              <span>New Purchase Order</span>
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
                <th>PO ID</th>
                <th>Supplier</th>
                <th>Items Ordered</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
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
                      <strong>#{po.id}</strong>
                    </td>
                    <td style={{ fontWeight: 600 }}>{po.supplier?.name || `Supplier #${po.supplierId}`}</td>
                    <td>
                      {po.items?.map((it, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem' }}>
                          • {it.product?.name || `Product #${it.productId}`} ({it.receivedQty || 0}/{it.quantity})
                        </div>
                      ))}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                      {formatRupiah(totalValue)}
                    </td>
                    <td>{getStatusBadge(po.status)}</td>
                    <td>{new Date(po.createdAt).toLocaleDateString('id-ID')}</td>
                    <td>
                      {!isFullyReceived && (
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          onClick={() => openReceiveModal(po)}
                        >
                          <PackagePlus size={14} />
                          <span>Receive Items</span>
                        </button>
                      )}
                      {isFullyReceived && (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Fulfilled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '30px' }}>
                    {loading ? 'Loading orders...' : 'No purchase orders recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create PO */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Purchase Order</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Target Supplier</label>
                  <select
                    className="form-control"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                    required
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination Facility</label>
                  <select
                    className="form-control"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Optional Default Warehouse...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ margin: '14px 0 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="form-label">Order Line Items</span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={handleAddItemRow}
                >
                  <Plus size={14} />
                  <span>Add Line</span>
                </button>
              </div>

              {orderItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1.5fr auto',
                    gap: '10px',
                    alignItems: 'center',
                    marginBottom: '10px',
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
                    <option value={0}>Select Product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    className="form-control"
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
                    className="form-control"
                    placeholder="Unit Price"
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
                      style={{ padding: '8px', color: 'var(--accent-rose)' }}
                      onClick={() => handleRemoveItemRow(idx)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Submit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Receive PO */}
      {selectedPo && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Receive PO #{selectedPo.id}</h3>
              <button className="modal-close" onClick={() => setSelectedPo(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Enter received quantity for each item below. Partial deliveries will update status to{' '}
                <strong style={{ color: 'var(--accent-cyan)' }}>PARTIALLY_RECEIVED</strong>.
              </p>

              {selectedPo.items?.map((it) => {
                const remaining = it.quantity - (it.receivedQty || 0);

                return (
                  <div
                    key={it.productId}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      marginBottom: '10px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600 }}>{it.product?.name || `Product #${it.productId}`}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        Ordered: {it.quantity} | Received: {it.receivedQty || 0}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Receive Now:</label>
                      <input
                        type="number"
                        className="form-control"
                        style={{ width: '120px' }}
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
                      <span style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)' }}>
                        Max remaining: {remaining}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedPo(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <CheckCircle2 size={16} />
                  <span>Confirm Receipt & Update Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
