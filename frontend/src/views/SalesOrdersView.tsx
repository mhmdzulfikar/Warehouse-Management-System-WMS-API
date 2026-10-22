import React, { useEffect, useState } from 'react';
import {
  apiConfirmSalesOrder,
  apiCreateSalesOrder,
  apiGetCustomers,
  apiGetDeliveryOrders,
  apiGetProducts,
  apiGetSalesOrders,
  apiGetWarehouses,
  apiPackSalesOrder,
  apiPickSalesOrder,
  apiShipSalesOrder,
} from '../services/api';
import type { Customer, DeliveryOrder, Product, SalesOrder, Warehouse } from '../types';
import {
  Boxes,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Truck,
  Warehouse as WarehouseIcon,
  X,
} from 'lucide-react';

interface SalesOrdersViewProps {
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SalesOrdersView: React.FC<SalesOrdersViewProps> = ({ onShowToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'delivery'>('orders');

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pickingOrder, setPickingOrder] = useState<SalesOrder | null>(null);
  const [packingOrder, setPackingOrder] = useState<SalesOrder | null>(null);
  const [shippingOrder, setShippingOrder] = useState<SalesOrder | null>(null);
  const [selectedDo, setSelectedDo] = useState<DeliveryOrder | null>(null);

  // Form states for Create SO
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [soNotes, setSoNotes] = useState('');
  const [soItems, setSoItems] = useState<Array<{ productId: number; quantity: number; unitPrice: number }>>([
    { productId: 0, quantity: 5, unitPrice: 0 },
  ]);

  // Picking & Packing inputs state (keyed by productId)
  const [pickQtys, setPickQtys] = useState<Record<number, number>>({});
  const [packQtys, setPackQtys] = useState<Record<number, number>>({});

  // Shipping form state
  const [shipRecipientName, setShipRecipientName] = useState('');
  const [shipRecipientAddress, setShipRecipientAddress] = useState('');
  const [shipMethod, setShipMethod] = useState('Armada Truk Internal Gudang');
  const [shipTrackingNumber, setShipTrackingNumber] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [soData, doData, custList, prodList, whList] = await Promise.all([
        apiGetSalesOrders(),
        apiGetDeliveryOrders(),
        apiGetCustomers(),
        apiGetProducts(),
        apiGetWarehouses(),
      ]);
      setSalesOrders(soData);
      setDeliveryOrders(doData);
      setCustomers(custList);
      setProducts(prodList);
      setWarehouses(whList);

      if (whList.length > 0 && !warehouseId) {
        setWarehouseId(whList[0].id);
      }
      if (custList.length > 0 && !customerId) {
        setCustomerId(custList[0].id);
      }
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memuat data Sales Order', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format IDR Currency
  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  // Status Badge Helper
  const getSoStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-pending">PENDING (MENUNGGU)</span>;
      case 'CONFIRMED':
        return <span className="badge badge-approved">CONFIRMED (SIAP PICKING)</span>;
      case 'PICKING':
        return <span className="badge badge-partial">PROSES PICKING</span>;
      case 'PACKED':
        return <span className="badge badge-partial" style={{ background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }}>PACKED (SIAP KIRIM)</span>;
      case 'SHIPPED':
        return <span className="badge badge-received">TERKIRIM (SHIPPED)</span>;
      case 'CANCELLED':
        return <span className="badge" style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}>DIBATALKAN</span>;
      default:
        return <span className="badge badge-pending">{status}</span>;
    }
  };

  // Handle Add / Remove Product Rows in Create SO
  const handleAddProductRow = () => {
    const firstProd = products[0];
    const defaultPrice = firstProd ? ((firstProd as any).basePrice ?? firstProd.price ?? 0) : 0;
    setSoItems([...soItems, { productId: firstProd ? firstProd.id : 0, quantity: 1, unitPrice: Number(defaultPrice) }]);
  };

  const handleRemoveProductRow = (idx: number) => {
    setSoItems(soItems.filter((_, i) => i !== idx));
  };

  const handleProductChange = (idx: number, pId: number) => {
    const found = products.find((p) => p.id === pId);
    const updated = [...soItems];
    updated[idx].productId = pId;
    if (found) {
      updated[idx].unitPrice = Number((found as any).basePrice ?? found.price ?? 0);
    }
    setSoItems(updated);
  };

  const handleQtyChange = (idx: number, qty: number) => {
    const updated = [...soItems];
    updated[idx].quantity = Math.max(1, qty);
    setSoItems(updated);
  };

  const handlePriceChange = (idx: number, price: number) => {
    const updated = [...soItems];
    updated[idx].unitPrice = Math.max(0, price);
    setSoItems(updated);
  };

  const calculateSoTotal = () => {
    return soItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice || 0), 0);
  };

  // Submit Create SO
  const handleCreateSoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      onShowToast('Silakan pilih mitra pembeli / customer', 'error');
      return;
    }
    if (!warehouseId) {
      onShowToast('Silakan pilih gudang asal barang', 'error');
      return;
    }
    const validItems = soItems.filter((it) => it.productId > 0 && it.quantity > 0);
    if (validItems.length === 0) {
      onShowToast('Tambahkan minimal satu baris barang pesanan yang valid', 'error');
      return;
    }

    try {
      await apiCreateSalesOrder({
        customerId: Number(customerId),
        warehouseId: Number(warehouseId),
        notes: soNotes || undefined,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          price: it.unitPrice,
        })),
      });
      onShowToast('Sales Order berhasil dibuat dengan status PENDING!', 'success');
      setShowCreateModal(false);
      setSoNotes('');
      setSoItems([{ productId: 0, quantity: 5, unitPrice: 0 }]);
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal menerbitkan Sales Order', 'error');
    }
  };

  // Confirm SO
  const handleConfirmOrder = async (order: SalesOrder) => {
    try {
      await apiConfirmSalesOrder(order.id);
      onShowToast(`Sales Order ${order.soNumber || order.orderNumber} berhasil dikonfirmasi!`, 'success');
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal mengonfirmasi Sales Order', 'error');
    }
  };

  // Open Picking Modal
  const openPickingModal = (order: SalesOrder) => {
    setPickingOrder(order);
    const initialMap: Record<number, number> = {};
    const lines = order.soItems || order.items || [];
    lines.forEach((it) => {
      initialMap[it.productId] = it.pickedQty || it.qty || it.quantity || 0;
    });
    setPickQtys(initialMap);
  };

  // Quick Pick All
  const handleQuickPickAll = () => {
    if (!pickingOrder) return;
    const allMap: Record<number, number> = {};
    const lines = pickingOrder.soItems || pickingOrder.items || [];
    lines.forEach((it) => {
      allMap[it.productId] = it.qty || it.quantity || 1;
    });
    setPickQtys(allMap);
    onShowToast('Seluruh kuantitas barang diset sesuai target pesanan!', 'info');
  };

  // Submit Picking
  const handleSubmitPicking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickingOrder) return;
    try {
      const itemsPayload = Object.entries(pickQtys).map(([prodId, pickedQty]) => ({
        productId: Number(prodId),
        pickedQty: Number(pickedQty),
      }));

      await apiPickSalesOrder(pickingOrder.id, itemsPayload);
      onShowToast(`Progres picking untuk ${pickingOrder.soNumber || pickingOrder.orderNumber} berhasil disimpan!`, 'success');
      setPickingOrder(null);
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memproses picking', 'error');
    }
  };

  // Open Packing Modal
  const openPackingModal = (order: SalesOrder) => {
    setPackingOrder(order);
    const initialMap: Record<number, number> = {};
    const lines = order.soItems || order.items || [];
    lines.forEach((it) => {
      initialMap[it.productId] = it.packedQty || it.pickedQty || it.qty || it.quantity || 0;
    });
    setPackQtys(initialMap);
  };

  // Quick Pack All
  const handleQuickPackAll = () => {
    if (!packingOrder) return;
    const allMap: Record<number, number> = {};
    const lines = packingOrder.soItems || packingOrder.items || [];
    lines.forEach((it) => {
      allMap[it.productId] = it.pickedQty || it.qty || it.quantity || 1;
    });
    setPackQtys(allMap);
    onShowToast('Seluruh kuantitas kemasan diset lengkap!', 'info');
  };

  // Submit Packing
  const handleSubmitPacking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packingOrder) return;
    try {
      const itemsPayload = Object.entries(packQtys).map(([prodId, packedQty]) => ({
        productId: Number(prodId),
        packedQty: Number(packedQty),
      }));

      await apiPackSalesOrder(packingOrder.id, itemsPayload);
      onShowToast(`Pesanan ${packingOrder.soNumber || packingOrder.orderNumber} selesai dikemas (PACKED)! Siap dikirim.`, 'success');
      setPackingOrder(null);
      await loadData();
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memproses packing', 'error');
    }
  };

  // Open Shipping Modal
  const openShippingModal = (order: SalesOrder) => {
    setShippingOrder(order);
    setShipRecipientName(order.customer?.name || '');
    setShipRecipientAddress(order.customer?.address || order.shippingAddress || 'Alamat tujuan customer');
    setShipMethod('Armada Truk Internal Gudang');
    setShipTrackingNumber('');
  };

  // Submit Shipping (Deducts stock & creates Delivery Order)
  const handleSubmitShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingOrder) return;
    if (!shipRecipientName || !shipRecipientAddress) {
      onShowToast('Nama penerima dan alamat pengiriman wajib diisi', 'error');
      return;
    }

    try {
      const lines = shippingOrder.soItems || shippingOrder.items || [];
      const itemsPayload = lines.map((it) => ({
        productId: it.productId,
        quantity: it.packedQty || it.pickedQty || it.qty || it.quantity || 1,
      }));

      const deliveryOrder = await apiShipSalesOrder(shippingOrder.id, {
        driverName: shipMethod,
        vehiclePlate: shipTrackingNumber || 'B 1234 WMS',
        recipientName: shipRecipientName,
        recipientAddress: shipRecipientAddress,
        shippingMethod: shipMethod,
        trackingNumber: shipTrackingNumber || undefined,
        note: `Pengiriman resmi untuk ${shippingOrder.soNumber || shippingOrder.orderNumber}`,
        items: itemsPayload,
      });

      onShowToast(
        `Pengiriman berhasil! Surat Jalan ${deliveryOrder.doNumber} telah terbit & stok gudang otomatis terpotong.`,
        'success'
      );
      setShippingOrder(null);
      await loadData();

      // Show the generated Delivery Order
      setSelectedDo(deliveryOrder);
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memproses pengiriman keluar', 'error');
    }
  };

  // Filtered lists
  const filteredSalesOrders = salesOrders.filter((so) => {
    const q = searchQuery.toLowerCase();
    const orderNo = (so.soNumber || so.orderNumber || '').toLowerCase();
    const custName = so.customer?.name?.toLowerCase() || '';
    const whName = so.warehouse?.name?.toLowerCase() || '';
    return orderNo.includes(q) || custName.includes(q) || whName.includes(q);
  });

  const filteredDeliveryOrders = deliveryOrders.filter((d) => {
    const q = searchQuery.toLowerCase();
    const doNo = d.doNumber?.toLowerCase() || '';
    const recName = d.recipientName?.toLowerCase() || '';
    const method = (d.driverName || (d as any).shippingMethod || '').toLowerCase();
    return doNo.includes(q) || recName.includes(q) || method.includes(q);
  });

  return (
    <div>
      {/* Top Bar with Subtabs & Actions */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Sub-tabs switch */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              id="subtab-orders"
              className="btn-tab"
              onClick={() => setActiveSubTab('orders')}
              style={{
                background: activeSubTab === 'orders' ? '#fff' : 'transparent',
                fontWeight: activeSubTab === 'orders' ? 600 : 500,
                color: activeSubTab === 'orders' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeSubTab === 'orders' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
              }}
            >
              <Truck size={15} style={{ color: activeSubTab === 'orders' ? 'var(--accent-primary)' : 'inherit' }} />
              <span>Sales Orders (SO) ({salesOrders.length})</span>
            </button>

            <button
              id="subtab-delivery"
              className="btn-tab"
              onClick={() => setActiveSubTab('delivery')}
              style={{
                background: activeSubTab === 'delivery' ? '#fff' : 'transparent',
                fontWeight: activeSubTab === 'delivery' ? 600 : 500,
                color: activeSubTab === 'delivery' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeSubTab === 'delivery' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
              }}
            >
              <FileCheck2 size={15} style={{ color: activeSubTab === 'delivery' ? 'var(--accent-primary)' : 'inherit' }} />
              <span>Surat Jalan Keluar (DO) ({deliveryOrders.length})</span>
            </button>
          </div>

          {/* Search & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                id="search-outbound-input"
                type="text"
                placeholder="Cari order, customer, no surat jalan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', width: '240px', fontSize: '0.82rem' }}
              />
            </div>

            <button className="btn-secondary" onClick={loadData} disabled={loading} title="Perbarui data">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Segarkan</span>
            </button>

            {activeSubTab === 'orders' && (
              <button id="btn-open-create-so" className="btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={15} />
                <span>Buat Sales Order</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUBTAB 1: SALES ORDERS */}
      {activeSubTab === 'orders' && (
        <div className="glass-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Sales Order</th>
                  <th>Tanggal</th>
                  <th>Customer (Pembeli)</th>
                  <th>Gudang Asal</th>
                  <th>Rincian Barang & Fulfillment</th>
                  <th>Total Nilai</th>
                  <th>Status Operasional</th>
                  <th style={{ textAlign: 'right' }}>Tindakan Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalesOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {loading ? 'Memuat data Sales Order...' : 'Belum ada dokumen Sales Order yang terdaftar.'}
                    </td>
                  </tr>
                ) : (
                  filteredSalesOrders.map((so) => {
                    const isFullyShipped = so.status === 'SHIPPED';
                    const isPacked = so.status === 'PACKED';
                    const isPicking = so.status === 'PICKING' || so.status === 'CONFIRMED';
                    const isPending = so.status === 'PENDING';
                    const items = so.soItems || so.items || [];

                    return (
                      <tr key={so.id}>
                        <td>
                          <strong>{so.soNumber || so.orderNumber}</strong>
                          {(so.note || so.notes) && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Catatan: {so.note || so.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(so.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {so.customer?.name || `Customer #${so.customerId}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {so.customer?.city || so.customer?.address || '-'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                            <WarehouseIcon size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{so.warehouse?.name || `Gudang #${so.warehouseId}`}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {items.map((it) => {
                              const qty = it.qty ?? it.quantity ?? 0;
                              return (
                                <div key={it.id} style={{ fontSize: '0.78rem' }}>
                                  <span style={{ fontWeight: 500 }}>{it.product?.name || `Item #${it.productId}`}</span>:{' '}
                                  <span className="tabular-num" style={{ color: 'var(--text-secondary)' }}>
                                    Pesanan {qty} {it.product?.uom || 'unit'} | Pick: {it.pickedQty} | Pack: {it.packedQty}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }} className="tabular-num">
                          {formatRupiah(Number(so.totalAmount))}
                        </td>
                        <td>{getSoStatusBadge(so.status)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {isPending && (
                              <button
                                className="btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                                onClick={() => handleConfirmOrder(so)}
                              >
                                <CheckCircle2 size={13} />
                                <span>Konfirmasi</span>
                              </button>
                            )}

                            {isPicking && (
                              <button
                                className="btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#0369a1', borderColor: '#bae6fd' }}
                                onClick={() => openPickingModal(so)}
                              >
                                <Boxes size={13} />
                                <span>Ambil (Pick)</span>
                              </button>
                            )}

                            {(so.status === 'PICKING' || isPacked) && (
                              <button
                                className="btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#6d28d9', borderColor: '#ddd6fe' }}
                                onClick={() => openPackingModal(so)}
                              >
                                <PackageCheck size={13} />
                                <span>Kemas (Pack)</span>
                              </button>
                            )}

                            {isPacked && (
                              <button
                                className="btn-primary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                onClick={() => openShippingModal(so)}
                              >
                                <Truck size={13} />
                                <span>Kirim & Surat Jalan</span>
                              </button>
                            )}

                            {isFullyShipped && (
                              <button
                                className="btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                onClick={() => {
                                  const doObj = so.deliveryOrder || (so.deliveryOrders && so.deliveryOrders[0]) || deliveryOrders.find((d) => d.salesOrderId === so.id);
                                  if (doObj) {
                                    setSelectedDo(doObj);
                                  } else {
                                    onShowToast('Dokumen Surat Jalan sedang dimuat', 'info');
                                  }
                                }}
                              >
                                <FileText size={13} />
                                <span>Lihat Surat Jalan</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DELIVERY ORDERS (SURAT JALAN KELUAR) */}
      {activeSubTab === 'delivery' && (
        <div className="glass-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Surat Jalan (DO)</th>
                  <th>Ref. Sales Order</th>
                  <th>Penerima (Customer)</th>
                  <th>Alamat Pengiriman</th>
                  <th>Pengemudi / Ekspedisi</th>
                  <th>Plat Nomor</th>
                  <th>Waktu Pengiriman</th>
                  <th style={{ textAlign: 'right' }}>Aksi Dokumen</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveryOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {loading ? 'Memuat Surat Jalan...' : 'Belum ada Surat Jalan Keluar yang diterbitkan.'}
                    </td>
                  </tr>
                ) : (
                  filteredDeliveryOrders.map((doDoc) => (
                    <tr key={doDoc.id}>
                      <td>
                        <strong>{doDoc.doNumber}</strong>
                        <div>
                          <span className="badge badge-received" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                            SHIPPED & AUDITED
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {doDoc.salesOrder?.soNumber || doDoc.salesOrder?.orderNumber || `SO #${doDoc.salesOrderId}`}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{doDoc.recipientName}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                        {doDoc.shippingAddress || (doDoc as any).recipientAddress || '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                          <Truck size={14} style={{ color: 'var(--accent-primary)' }} />
                          <span>{doDoc.driverName || (doDoc as any).shippingMethod || 'Logistik Internal'}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {doDoc.vehiclePlate || (doDoc as any).trackingNumber || '-'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(doDoc.createdAt || doDoc.shippedAt || Date.now()).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                          onClick={() => setSelectedDo(doDoc)}
                        >
                          <FileSpreadsheet size={13} />
                          <span>Cetak / Lihat</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE SALES ORDER */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="modal-title">Buat Sales Order Keluar Baru</h3>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSoSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Mitra Pembeli / Customer *</label>
                  <select
                    id="so-select-customer"
                    className="form-input"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                    required
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name} ({c.city || 'Nasional'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Gudang Asal Pengeluaran *</label>
                  <select
                    id="so-select-warehouse"
                    className="form-input"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
                    required
                  >
                    <option value="">-- Pilih Gudang Pemenuhan --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.location || 'Fasilitas'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Instruksi / Catatan Pesanan (Opsional)</label>
                <input
                  id="so-input-notes"
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Pengiriman urgent sebelum jam 17:00, mohon packing kayu"
                  value={soNotes}
                  onChange={(e) => setSoNotes(e.target.value)}
                />
              </div>

              {/* Items Line Editor */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Daftar Barang Pesanan</label>
                  <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '3px 8px' }} onClick={handleAddProductRow}>
                    <Plus size={13} />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Produk</th>
                        <th style={{ padding: '8px 12px', width: '100px', textAlign: 'right' }}>Kuantitas</th>
                        <th style={{ padding: '8px 12px', width: '130px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '8px 12px', width: '130px', textAlign: 'right' }}>Subtotal</th>
                        <th style={{ padding: '8px 12px', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {soItems.map((row, idx) => {
                        const subtotal = (row.quantity || 0) * (row.unitPrice || 0);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 12px' }}>
                              <select
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                value={row.productId}
                                onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                                required
                              >
                                <option value={0}>-- Pilih Produk --</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.sku} - {p.name} ({p.uom})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="number"
                                min={1}
                                className="form-input tabular-num"
                                style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.8rem' }}
                                value={row.quantity}
                                onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                                required
                              />
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <input
                                type="number"
                                min={0}
                                className="form-input tabular-num"
                                style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.8rem' }}
                                value={row.unitPrice}
                                onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                                required
                              />
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }} className="tabular-num">
                              {formatRupiah(subtotal)}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {soItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProductRow(idx)}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                  title="Hapus baris"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          Total Nilai Penjualan:
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }} className="tabular-num">
                          {formatRupiah(calculateSoTotal())}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Batal
                </button>
                <button id="btn-submit-create-so" type="submit" className="btn-primary">
                  Terbitkan Sales Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PICKING MODAL */}
      {pickingOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Boxes size={18} style={{ color: '#0369a1' }} />
                <h3 className="modal-title">Picking List Gudang — {pickingOrder.soNumber || pickingOrder.orderNumber}</h3>
              </div>
              <button className="modal-close" onClick={() => setPickingOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.8rem', color: '#0369a1' }}>
              <strong>Instruksi Staf Gudang:</strong> Ambil barang fisik dari rak/bin sesuai kuantitas order. Masukkan kuantitas yang berhasil diambil.
            </div>

            <form onSubmit={handleSubmitPicking}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button id="btn-quick-pick" type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '3px 8px' }} onClick={handleQuickPickAll}>
                  Pilih Semua (Quick Pick All)
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: 'var(--table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nama Barang & SKU</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '110px' }}>Target Order</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px' }}>Kuantitas Diambil</th>
                  </tr>
                </thead>
                <tbody>
                  {(pickingOrder.soItems || pickingOrder.items || []).map((it) => {
                    const targetQty = it.qty ?? it.quantity ?? 1;
                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{it.product?.name || `Item #${it.productId}`}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SKU: {it.product?.sku}</div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }} className="tabular-num">
                          {targetQty} {it.product?.uom || 'pcs'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <input
                            type="number"
                            min={0}
                            max={targetQty}
                            className="form-input tabular-num"
                            style={{ padding: '4px 8px', textAlign: 'right', width: '90px', fontSize: '0.85rem' }}
                            value={pickQtys[it.productId] ?? 0}
                            onChange={(e) =>
                              setPickQtys({
                                ...pickQtys,
                                [it.productId]: Number(e.target.value),
                              })
                            }
                            required
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <button type="button" className="btn-secondary" onClick={() => setPickingOrder(null)}>
                  Tutup
                </button>
                <button id="btn-save-picking" type="submit" className="btn-primary">
                  Simpan Status Picking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PACKING MODAL */}
      {packingOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PackageCheck size={18} style={{ color: '#6d28d9' }} />
                <h3 className="modal-title">Packing & Pengepakan — {packingOrder.soNumber || packingOrder.orderNumber}</h3>
              </div>
              <button className="modal-close" onClick={() => setPackingOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.8rem', color: '#6d28d9' }}>
              <strong>Instruksi QC & Packing:</strong> Pastikan kualitas fisik barang, label barcode, dan kemasan koli sudah sesuai sebelum diserahkan ke tim ekspedisi.
            </div>

            <form onSubmit={handleSubmitPacking}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button id="btn-quick-pack" type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '3px 8px' }} onClick={handleQuickPackAll}>
                  Kemas Semua (Quick Pack All)
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: 'var(--table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nama Barang</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '100px' }}>Sudah Dipick</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px' }}>Kuantitas Dikemas</th>
                  </tr>
                </thead>
                <tbody>
                  {(packingOrder.soItems || packingOrder.items || []).map((it) => {
                    const maxQty = it.pickedQty || it.qty || it.quantity || 1;
                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{it.product?.name || `Item #${it.productId}`}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: {it.qty ?? it.quantity} {it.product?.uom}</div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }} className="tabular-num">
                          {it.pickedQty} {it.product?.uom || 'pcs'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <input
                            type="number"
                            min={0}
                            max={maxQty}
                            className="form-input tabular-num"
                            style={{ padding: '4px 8px', textAlign: 'right', width: '90px', fontSize: '0.85rem' }}
                            value={packQtys[it.productId] ?? 0}
                            onChange={(e) =>
                              setPackQtys({
                                ...packQtys,
                                [it.productId]: Number(e.target.value),
                              })
                            }
                            required
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <button type="button" className="btn-secondary" onClick={() => setPackingOrder(null)}>
                  Tutup
                </button>
                <button id="btn-save-packing" type="submit" className="btn-primary">
                  Selesaikan Pengepakan (Set PACKED)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SHIPPING & SURAT JALAN DISPATCH */}
      {shippingOrder && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="modal-title">Penerbitan Surat Jalan & Pengiriman Keluar</h3>
              </div>
              <button className="modal-close" onClick={() => setShippingOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.8rem', color: '#92400e' }}>
              <strong>Perhatian Sistem:</strong> Mengonfirmasi langkah ini akan secara otomatis:
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li>Menerbitkan nomor resmi <strong>Surat Jalan Keluar (Delivery Order)</strong>.</li>
                <li><strong>Memotong kuantitas stok fisik</strong> dari gudang terkait.</li>
                <li>Mencatat entri mutasi <strong>Audit Trail bertipe OUT</strong>.</li>
              </ul>
            </div>

            <form onSubmit={handleSubmitShipping}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Nama Penerima / PIC Lokasi Tujuan *</label>
                <input
                  id="ship-recipient-name"
                  type="text"
                  className="form-input"
                  value={shipRecipientName}
                  onChange={(e) => setShipRecipientName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Alamat Lengkap Pengiriman *</label>
                <textarea
                  id="ship-recipient-address"
                  className="form-input"
                  rows={2}
                  value={shipRecipientAddress}
                  onChange={(e) => setShipRecipientAddress(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Metode Logistik / Ekspedisi *</label>
                  <select
                    id="ship-method"
                    className="form-input"
                    value={shipMethod}
                    onChange={(e) => setShipMethod(e.target.value)}
                    required
                  >
                    <option value="Armada Truk Internal Gudang">Armada Truk Internal Gudang</option>
                    <option value="Kurir Logistik JNE Trucking">Kurir Logistik JNE Trucking</option>
                    <option value="Lalamove Van / Pickup">Lalamove Van / Pickup</option>
                    <option value="Ambil Sendiri di Lokasi (Self Pickup)">Ambil Sendiri di Lokasi (Self Pickup)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Nomor Resi / Plat Truk</label>
                  <input
                    id="ship-tracking-number"
                    type="text"
                    className="form-input"
                    placeholder="Contoh: B 9812 WMS / JNE-874291"
                    value={shipTrackingNumber}
                    onChange={(e) => setShipTrackingNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShippingOrder(null)}>
                  Batal
                </button>
                <button id="btn-submit-shipping" type="submit" className="btn-primary">
                  <Send size={14} />
                  <span>Kirim & Terbitkan Surat Jalan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: OFFICIAL PRINTABLE DELIVERY ORDER (SURAT JALAN KELUAR) */}
      {selectedDo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck2 size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Dokumen Surat Jalan Keluar (Delivery Order)</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => window.print()}
                  style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                >
                  <Printer size={14} />
                  <span>Cetak Dokumen</span>
                </button>
                <button id="btn-close-do-modal" className="modal-close" onClick={() => setSelectedDo(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Official Delivery Order Paper View */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '24px', background: '#ffffff', color: '#0f172a' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>PT NEXUS LOGISTIK NUSANTARA</h2>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    Warehouse Fulfillment & Distribution Center
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Kawasan Industri Jababeka Blok C-12, Cikarang, Jawa Barat
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#1e40af' }}>
                    SURAT JALAN PENGIRIMAN
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                    {selectedDo.doNumber}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Tanggal: {new Date(selectedDo.createdAt || selectedDo.shippedAt || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Destination & Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', fontSize: '0.82rem' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    Tujuan Pengiriman / Penerima:
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedDo.recipientName}</div>
                  <div style={{ marginTop: '2px', color: '#334155', lineHeight: '1.4' }}>
                    {selectedDo.shippingAddress || (selectedDo as any).recipientAddress || '-'}
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    Informasi Pengiriman:
                  </div>
                  <div><strong>Referensi SO:</strong> {selectedDo.salesOrder?.soNumber || selectedDo.salesOrder?.orderNumber || `SO #${selectedDo.salesOrderId}`}</div>
                  <div><strong>Pengemudi / Kurir:</strong> {selectedDo.driverName || (selectedDo as any).shippingMethod || 'Logistik Internal'}</div>
                  <div><strong>No. Plat / Resi:</strong> {selectedDo.vehiclePlate || (selectedDo as any).trackingNumber || '-'}</div>
                </div>
              </div>

              {/* Item Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '40px' }}>No.</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Nama Barang & Deskripsi</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '120px' }}>Kode SKU</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', width: '100px' }}>Kuantitas</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '80px' }}>Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedDo.doItems || selectedDo.items || []).length > 0 ? (
                    (selectedDo.doItems || selectedDo.items || []).map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}.</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.product?.name || `Produk #${item.productId}`}</td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{item.product?.sku || '-'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }} className="tabular-num">
                          {item.qty ?? item.quantity ?? 1}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{item.product?.uom || 'pcs'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>
                        Rincian item Surat Jalan tercatat lengkap sesuai pesanan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center', fontSize: '0.78rem', marginTop: '24px' }}>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '50px' }}>Petugas Gudang (Pengirim)</div>
                  <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontWeight: 600 }}>
                    ( Tim Dispatch )
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '50px' }}>Supir / Jasa Kurir</div>
                  <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontWeight: 600 }}>
                    ( {selectedDo.driverName || (selectedDo as any).shippingMethod || 'Pengemudi'} )
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '50px' }}>Penerima Barang</div>
                  <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontWeight: 600 }}>
                    ( {selectedDo.recipientName} )
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
