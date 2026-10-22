export interface User {
  id: number;
  username: string;
  email: string;
  role: 'Manager' | 'Purchasing' | 'Staff Gudang' | string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  uom: string;
  minStock?: number;
}

export interface Supplier {
  id: number;
  name: string;
  contact?: string;
  address?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  location?: string;
}

export interface InventoryItem {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  product?: Product;
  warehouse?: Warehouse;
}

export interface PurchaseOrderItem {
  id: number;
  productId: number;
  quantity: number;
  receivedQty: number;
  price: number;
  product?: Product;
}

export interface PurchaseOrder {
  id: number;
  supplierId: number;
  warehouseId?: number;
  userId: number;
  status: 'PENDING' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | string;
  createdAt: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
  totalAmount?: number;
}

export interface TransactionItem {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number;
  product?: { name: string; sku: string };
  warehouse?: { name: string };
}

export interface Transaction {
  id: number;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST' | string;
  referenceType?: string;
  referenceId?: number;
  note?: string;
  timestamp: string;
  user?: { username: string };
  items?: TransactionItem[];
}

export interface CriticalStockItem {
  inventoryId: number;
  productId: number;
  productName: string;
  sku: string;
  uom: string;
  warehouseId: number;
  warehouseName: string;
  currentQty: number;
  minStock: number;
  shortage: number;
  status: 'CRITICAL_LOW' | 'OUT_OF_STOCK';
}

export interface DashboardMetrics {
  totalProducts: number;
  totalWarehouses: number;
  totalSuppliers: number;
  totalStockUnits: number;
  totalStockValue: number;
  criticalStockCount: number;
  pendingPoCount: number;
  partiallyReceivedPoCount: number;
  todayTransactionsCount: number;
}

export interface DashboardStats {
  metrics: DashboardMetrics;
  warehouseDistribution: Array<{
    id: number;
    name: string;
    totalItems: number;
    uniqueProducts: number;
  }>;
  transactionTypeCounts: {
    IN: number;
    OUT: number;
    ADJUST: number;
    TRANSFER: number;
  };
  criticalStocks: CriticalStockItem[];
  recentPurchaseOrders: Array<{
    id: number;
    supplierName: string;
    createdByUser: string;
    status: string;
    createdAt: string;
    totalItemsCount: number;
    totalAmount: number;
  }>;
  recentTransactions: Array<{
    id: number;
    type: string;
    referenceType: string;
    createdByUser: string;
    timestamp: string;
    itemCount: number;
    items: Array<{
      productName: string;
      warehouseName: string;
      qtyChange: number;
    }>;
  }>;
}
