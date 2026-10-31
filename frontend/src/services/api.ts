import {
  AuthResponse,
  Customer,
  DashboardStats,
  DeliveryOrder,
  InventoryItem,
  Product,
  PurchaseOrder,
  SalesOrder,
  Supplier,
  Transaction,
  User,
  Warehouse,
} from '../types';

let currentToken: string | null = localStorage.getItem('wms_token');

export const setAuthToken = (token: string | null) => {
  currentToken = token;
  if (token) {
    localStorage.setItem('wms_token', token);
  } else {
    localStorage.removeItem('wms_token');
  }
};

export const getAuthToken = () => currentToken;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    setAuthToken(null);
    localStorage.removeItem('wms_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Session expired or unauthorized. Please login again.');
  }

  if (!res.ok) {
    throw new Error(json.message || `API Error (${res.status})`);
  }

  return json.data !== undefined ? json.data : json;
}

// Auth API
export const apiLogin = async (identifier: string, password: string): Promise<AuthResponse> => {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
};

export const apiGetMe = async (): Promise<User> => {
  return request<User>('/api/auth/me');
};

// Dashboard API
export const apiGetDashboardStats = async (): Promise<DashboardStats> => {
  return request<DashboardStats>('/api/dashboard/stats');
};

// Inventory API
export const apiGetInventory = async (warehouseId?: number): Promise<InventoryItem[]> => {
  const query = warehouseId ? `?warehouseId=${warehouseId}` : '';
  return request<InventoryItem[]>(`/api/inventory${query}`);
};

// Purchase Orders API
export const apiGetPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  return request<PurchaseOrder[]>('/api/po');
};

export const apiCreatePurchaseOrder = async (payload: {
  supplierId: number;
  warehouseId?: number;
  items: Array<{ productId: number; quantity?: number; qtyOrdered?: number; price?: number; unitPrice?: number }>;
}): Promise<PurchaseOrder> => {
  const body = {
    supplierId: payload.supplierId,
    items: payload.items.map((i) => ({
      productId: i.productId,
      qtyOrdered: i.qtyOrdered ?? i.quantity ?? 1,
      unitPrice: i.unitPrice ?? i.price ?? 0,
    })),
  };
  return request<PurchaseOrder>('/api/po', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const apiApprovePurchaseOrder = async (poId: number): Promise<any> => {
  return request(`/api/po/${poId}/approve`, {
    method: 'PATCH',
  });
};

export const apiReceivePurchaseOrder = async (
  poId: number,
  items: Array<{ productId: number; quantity?: number; qtyReceived?: number }>,
  warehouseId: number = 1
): Promise<any> => {
  const body = {
    warehouseId,
    items: items.map((i) => ({
      productId: i.productId,
      qtyReceived: i.qtyReceived ?? i.quantity ?? 1,
    })),
  };
  return request(`/api/po/${poId}/receive`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// Transactions API
export const apiGetTransactions = async (): Promise<Transaction[]> => {
  return request<Transaction[]>('/api/transactions');
};

export const apiTransferStock = async (payload: {
  fromWarehouseId: number;
  toWarehouseId: number;
  items: Array<{ productId: number; quantity: number }>;
  note?: string;
}): Promise<any> => {
  return request('/api/transactions/transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const apiAdjustStockOpname = async (payload: {
  warehouseId: number;
  items: Array<{ productId: number; physicalQty: number; reason: string }>;
  note?: string;
}): Promise<any> => {
  return request('/api/transactions/adjust', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Master Data APIs
export const apiGetProducts = async (): Promise<Product[]> => {
  return request<Product[]>('/api/products');
};

export const apiCreateProduct = async (payload: {
  name: string;
  sku: string;
  price?: number;
  basePrice?: number;
  uom: string;
  minStock?: number;
  barcode?: string;
  category?: string;
  weightKg?: number;
  storageTemp?: string;
}): Promise<Product> => {
  return request<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      basePrice: payload.basePrice ?? payload.price ?? 0,
    }),
  });
};

export const apiGetSuppliers = async (): Promise<Supplier[]> => {
  return request<Supplier[]>('/api/suppliers');
};

export const apiCreateSupplier = async (payload: {
  name: string;
  contact?: string;
  contactInfo?: string;
  address?: string;
}): Promise<Supplier> => {
  return request<Supplier>('/api/suppliers', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      contactInfo: payload.contactInfo ?? payload.contact,
      address: payload.address,
    }),
  });
};

export const apiGetWarehouses = async (): Promise<Warehouse[]> => {
  return request<Warehouse[]>('/api/warehouses');
};

export const apiCreateWarehouse = async (payload: {
  name: string;
  location?: string;
  code?: string;
  zoneType?: string;
}): Promise<Warehouse> => {
  return request<Warehouse>('/api/warehouses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Customers APIs
export const apiGetCustomers = async (): Promise<Customer[]> => {
  return request<Customer[]>('/api/customers');
};

export const apiCreateCustomer = async (payload: {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  contactInfo?: string;
  address?: string;
  city?: string;
}): Promise<Customer> => {
  return request<Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Sales Orders (Outbound) APIs
export const apiGetSalesOrders = async (): Promise<SalesOrder[]> => {
  return request<SalesOrder[]>('/api/sales-orders');
};

export const apiGetSalesOrderById = async (id: number): Promise<SalesOrder> => {
  return request<SalesOrder>(`/api/sales-orders/${id}`);
};

export const apiCreateSalesOrder = async (payload: {
  customerId: number;
  warehouseId: number;
  shippingAddress?: string;
  note?: string;
  items: Array<{ productId: number; quantity: number; unitPrice: number }>;
}): Promise<SalesOrder> => {
  const body = {
    customerId: payload.customerId,
    warehouseId: payload.warehouseId,
    shippingAddress: payload.shippingAddress,
    note: payload.note,
    items: payload.items.map((i) => ({
      productId: i.productId,
      qty: i.quantity,
      unitPrice: i.unitPrice,
    })),
  };
  return request<SalesOrder>('/api/sales-orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const apiConfirmSalesOrder = async (id: number): Promise<SalesOrder> => {
  return request<SalesOrder>(`/api/sales-orders/${id}/confirm`, {
    method: 'POST',
  });
};

export const apiPickSalesOrder = async (
  id: number,
  items: Array<{ productId: number; pickedQty: number }>
): Promise<SalesOrder> => {
  return request<SalesOrder>(`/api/sales-orders/${id}/pick`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
};

export const apiPackSalesOrder = async (
  id: number,
  items: Array<{ productId: number; packedQty: number }>
): Promise<SalesOrder> => {
  return request<SalesOrder>(`/api/sales-orders/${id}/pack`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
};

export const apiShipSalesOrder = async (
  id: number,
  payload: {
    driverName?: string;
    vehiclePlate?: string;
    recipientName?: string;
    recipientAddress?: string;
    shippingMethod?: string;
    trackingNumber?: string;
    note?: string;
    items?: Array<{ productId: number; quantity: number }>;
  }
): Promise<DeliveryOrder> => {
  return request<DeliveryOrder>(`/api/sales-orders/${id}/ship`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Delivery Orders (Surat Jalan Keluar) APIs
export const apiGetDeliveryOrders = async (): Promise<DeliveryOrder[]> => {
  return request<DeliveryOrder[]>('/api/delivery-orders');
};

export const apiGetDeliveryOrderById = async (id: number): Promise<DeliveryOrder> => {
  return request<DeliveryOrder>(`/api/delivery-orders/${id}`);
};
