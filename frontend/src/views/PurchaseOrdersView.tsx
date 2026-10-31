import React, { useEffect, useState } from 'react';
import {
  apiCreatePurchaseOrder,
  apiApprovePurchaseOrder,
  apiGetProducts,
  apiGetPurchaseOrders,
  apiGetSuppliers,
  apiGetWarehouses,
  apiReceivePurchaseOrder,
} from '../services/api';
import type { Product, PurchaseOrder, Supplier, Warehouse } from '../types';
import { CheckCircle2, PackagePlus, Plus, RefreshCw, ShoppingCart, X, Check, ShieldCheck } from 'lucide-react';

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
    { productId: 0, quantity: 20, price: 500 },
  ]);

  // Receive Modal
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [targetWarehouseId, setTargetWarehouseId] = useState<number>(1);
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
      setOrders(Array.isArray(pos) ? pos : []);
      setSuppliers(Array.isArray(sups) ? sups : []);
      setProducts(Array.isArray(prods) ? prods : []);
      setWarehouses(Array.isArray(whs) ? whs : []);
      if (Array.isArray(whs) && whs.length > 0) {
        setTargetWarehouseId(whs[0].id);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to retrieve procurement purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemRow = () => {
    setOrderItems([...orderItems, { productId: 0, quantity: 10, price: 100 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      onShowToast('Please select a tier-1 supplier partner', 'error');
      return;
    }
    const validItems = orderItems.filter((i) => i.productId > 0 && i.quantity > 0);
    if (validItems.length === 0) {
      onShowToast('Add at least one valid product line item', 'error');
      return;
    }

    try {
      await apiCreatePurchaseOrder({
        supplierId: Number(supplierId),
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        items: validItems,
      });
      onShowToast('Inbound Purchase Order issued with PENDING status!', 'success');
      setShowCreateModal(false);
      setOrderItems([{ productId: 0, quantity: 20, price: 500 }]);
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to create Purchase Order', 'error');
    }
  };

  const handleApprovePO = async (poId: number) => {
    try {
      await apiApprovePurchaseOrder(poId);
      onShowToast(`Purchase Order #PO-${String(poId).padStart(4, '0')} APPROVED for receiving!`, 'success');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to approve Purchase Order', 'error');
    }
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPo(po);
    const initialMap: Record<number, number> = {};
    const items = po.poItems || po.items || [];
    items.forEach((it) => {
      const ordered = it.qty ?? it.quantity ?? 0;
      const received = it.receivedQty || 0;
      const remaining = ordered - received;
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
      onShowToast('Enter at least 1 unit to receive at the dock', 'error');
      return;
    }

    try {
      await apiReceivePurchaseOrder(selectedPo.id, payloadItems, targetWarehouseId);
      onShowToast(`Goods Receipt Note confirmed for PO #${selectedPo.id}! Stock updated.`, 'success');
      setSelectedPo(null);
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to process goods receipt', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'COMPLETED':
        return <span className="badge badge-received">FULFILLED (RECEIVED)</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="badge badge-partial">PARTIAL RECEIPT</span>;
      case 'APPROVED':
        return <span className="badge badge-approved">APPROVED (READY FOR DOCK)</span>;
      default:
        return <span className="badge badge-pending">PENDING APPROVAL</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return '$' + (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Control Header */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600 }}>Active Inbound Purchase Orders ({orders.length} Records)</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={loadData} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={15} />
              <span>Issue Inbound PO</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Document #</th>
                <th>Tier-1 Supplier Partner</th>
                <th>Order Line Specifications</th>
                <th style={{ textAlign: 'right' }}>Total Valuation</th>
                <th>Fulfillment Status</th>
                <th>Issued At</th>
                <th style={{ textAlign: 'right' }}>Operational Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => {
                const items = po.poItems || po.items || [];
                const totalValue = items.reduce((sum, it) => {
                  const qty = it.qty ?? it.quantity ?? 0;
                  const price = Number(it.expectedPrice ?? it.price ?? 0);
                  return sum + (qty * price);
                }, 0);

                const isPending = po.status === 'PENDING' || po.status === 'Draft';
                const isApproved = po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED';
                const isFullyReceived = po.status === 'RECEIVED' || po.status === 'COMPLETED';

                return (
                  <tr key={po.id}>
                    <td>
                      <code style={{ fontWeight: 700 }}>PO-{String(po.id).padStart(4, '0')}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {po.supplier?.name || `Supplier #${po.supplierId}`}
                      </div>
                      {po.createdBy && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Issued by: {po.createdBy.username}
                        </div>
                      )}
                    </td>
                    <td>
                      {items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', marginBottom: '2px' }} className="tabular-num">
                          • <span style={{ fontWeight: 500 }}>{it.product?.name || `Product #${it.productId}`}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                            ({it.receivedQty || 0}/{it.qty ?? it.quantity ?? 0} {it.product?.uom || 'units'})
                          </span>
                        </div>
                      ))}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-num">
                      {formatCurrency(totalValue)}
                    </td>
                    <td>{getStatusBadge(po.status)}</td>
                    <td className="tabular-num" style={{ color: 'var(--text-muted)' }}>
                      {new Date(po.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {isPending && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem', color: '#166534', borderColor: '#bbf7d0' }}
                            onClick={() => handleApprovePO(po.id)}
                            title="Manager Approval"
                          >
                            <ShieldCheck size={13} />
                            <span>Approve PO</span>
                          </button>
                        )}
                        {isApproved && (
                          <button
                            className="btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                            onClick={() => openReceiveModal(po)}
                          >
                            <PackagePlus size={13} />
                            <span>Goods Receipt (GRN)</span>
                          </button>
                        )}
                        {isFullyReceived && (
                          <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Check size={14} /> Closed & Stored
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '36px' }}>
                    {loading ? 'Querying inbound procurement purchase records...' : 'No purchase orders registered.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Issue Inbound PO */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Issue Inbound Purchase Order (PO)</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Tier-1 Supplier Enterprise</label>
                  <select
                    className="form-control"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                    required
                  >
                    <option value="">Select Supplier Partner...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Inbound Receiving Facility</label>
                  <select
                    className="form-control"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Select Target Hub...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code ? `[${w.code}] ` : ''}{w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ margin: '14px 0 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="form-label" style={{ marginBottom: 0 }}>Item Lines & Unit Procurement Cost</span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  onClick={handleAddItemRow}
                >
                  <Plus size={13} />
                  <span>Add Line Item</span>
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
                      if (prod) updated[idx].price = Number(prod.basePrice ?? prod.price ?? 0);
                      setOrderItems(updated);
                    }}
                    required
                  >
                    <option value={0}>Select SKU...</option>
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
                    placeholder="Unit Price ($)"
                    min={0}
                    step="0.01"
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
                      style={{ padding: '7px', color: '#991b1b' }}
                      onClick={() => handleRemoveItemRow(idx)}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Transmit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Inbound Goods Receipt (GRN) */}
      {selectedPo && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Dock Receiving: Goods Receipt Note (GRN)</h3>
              <button className="modal-close" onClick={() => setSelectedPo(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit}>
              <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>PO Reference: PO-{String(selectedPo.id).padStart(4, '0')}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Supplier: {selectedPo.supplier?.name}</div>
                <div style={{ marginTop: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Inbound Receiving Dock Facility:</label>
                  <select
                    className="form-control"
                    value={targetWarehouseId}
                    onChange={(e) => setTargetWarehouseId(Number(e.target.value))}
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code ? `[${w.code}] ` : ''}{w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(selectedPo.poItems || selectedPo.items || []).map((it) => {
                const ordered = it.qty ?? it.quantity ?? 0;
                const remaining = ordered - (it.receivedQty || 0);

                return (
                  <div
                    key={it.productId}
                    style={{
                      background: '#ffffff',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '10px',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {it.product?.name || `Product #${it.productId}`}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} className="tabular-num">
                        Ordered: {ordered} | Received: {it.receivedQty || 0}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Physical Received Qty:</label>
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
                      <span style={{ fontSize: '0.75rem', color: '#059669' }} className="tabular-num">
                        Remaining unfulfilled: {remaining} {it.product?.uom || 'units'}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedPo(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <CheckCircle2 size={15} />
                  <span>Confirm Dock Receipt & Inward Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
