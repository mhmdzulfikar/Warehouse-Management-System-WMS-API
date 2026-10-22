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
  items: Array<{ productId: number; quantity: number; price: number }>;
}): Promise<PurchaseOrder> => {
  return request<PurchaseOrder>('/api/po', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const apiReceivePurchaseOrder = async (
  poId: number,
  items: Array<{ productId: number; quantity: number }>
): Promise<any> => {
  return request(`/api/po/${poId}/receive`, {
    method: 'POST',
    body: JSON.stringify({ items }),
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
  price: number;
  uom: string;
  minStock?: number;
}): Promise<Product> => {
  return request<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const apiGetSuppliers = async (): Promise<Supplier[]> => {
  return request<Supplier[]>('/api/suppliers');
};

export const apiCreateSupplier = async (payload: {
  name: string;
  contact?: string;
  address?: string;
}): Promise<Supplier> => {
  return request<Supplier>('/api/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const apiGetWarehouses = async (): Promise<Warehouse[]> => {
  return request<Warehouse[]>('/api/warehouses');
};

export const apiCreateWarehouse = async (payload: {
  name: string;
  location?: string;
}): Promise<Warehouse> => {
  return request<Warehouse>('/api/warehouses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Customer APIs
export const apiGetCustomers = async (): Promise<Customer[]> => {
  return request<Customer[]>('/api/customers');
};

export const apiCreateCustomer = async (payload: {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
}): Promise<Customer> => {
  return request<Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Sales Order (Outbound) APIs
export const apiGetSalesOrders = async (): Promise<SalesOrder[]> => {
  return request<SalesOrder[]>('/api/sales-orders');
};

export const apiGetSalesOrderById = async (id: number): Promise<SalesOrder> => {
  return request<SalesOrder>(`/api/sales-orders/${id}`);
};

export const apiCreateSalesOrder = async (payload: {
  customerId: number;
  warehouseId: number;
  notes?: string;
  note?: string;
  items: Array<{ productId: number; quantity: number; unitPrice?: number; price?: number }>;
}): Promise<SalesOrder> => {
  const body = {
    customerId: payload.customerId,
    warehouseId: payload.warehouseId,
    note: payload.note || payload.notes,
    items: payload.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      price: it.price !== undefined ? it.price : (it.unitPrice || 0),
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

