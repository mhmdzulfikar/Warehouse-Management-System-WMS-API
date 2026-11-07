export const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'WMS Nexus Enterprise • Global Warehouse Management & Telemetry API',
        version: '2.0.0',
        description: 'Production-grade RESTful specification for Multi-Facility WMS, High-Velocity Inbound Goods Receipt (GRN), Outbound Order Fulfillment & Waybill Dispatch, Granular Location Bins, Barcode Tracking, and Dual-Track UDP Telemetry.\n\n⚡ Interactive Developer Studio: Looking for live throughput benchmarking, packet loss simulation, and Autocannon stress testing? Switch to the Telemetry Lab (/studio#telemetry).'
    },
    servers: [
        {
            url: 'http://localhost:5000',
            description: 'Local Development Server'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token obtained from /api/auth/login'
            }
        },
        schemas: {
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Error description here' }
                }
            },
            PaginationMeta: {
                type: 'object',
                properties: {
                    total: { type: 'integer', example: 45 },
                    page: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 10 },
                    totalPages: { type: 'integer', example: 5 }
                }
            }
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ],
    paths: {
        '/api/auth/register': {
            post: {
                tags: ['Authentication'],
                summary: 'Register a new user account',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['username', 'email', 'password', 'roleId'],
                                properties: {
                                    username: { type: 'string', example: 'sarah.supervisor' },
                                    email: { type: 'string', example: 'sarah.supervisor@wms-nexus.io' },
                                    password: { type: 'string', example: 'password123' },
                                    roleId: { type: 'integer', example: 2, description: '1=Admin, 2=Staff Gudang, 3=Purchasing, 4=Manager' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'User successfully registered' },
                    400: { description: 'Validation failed or username/email already taken' }
                }
            }
        },
        '/api/auth/login': {
            post: {
                tags: ['Authentication'],
                summary: 'Login with username or email to get a JWT token',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['identifier', 'password'],
                                properties: {
                                    identifier: { type: 'string', example: 'bapak_manager', description: 'Username or Email' },
                                    password: { type: 'string', example: 'password123' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Login successful, returns JWT token' },
                    401: { description: 'Invalid username/email or password' }
                }
            }
        },
        '/api/auth/me': {
            get: {
                tags: ['Authentication'],
                summary: 'Get current authenticated user profile',
                responses: {
                    200: { description: 'Profile retrieved' },
                    401: { description: 'Unauthorized' }
                }
            }
        },
        '/api/dashboard/stats': {
            get: {
                tags: ['Dashboard (Analytics & KPIs)'],
                summary: 'Get consolidated executive dashboard analytics, KPIs, critical stock alerts, and distribution charts',
                responses: {
                    200: { description: 'Dashboard metrics and analytics retrieved successfully' },
                    401: { description: 'Unauthorized: Missing or invalid token' }
                }
            }
        },
        '/api/products': {
            get: {
                tags: ['Products (Master Data)'],
                summary: 'Get all active products (Paginated & Searchable)',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by product name or SKU' }
                ],
                responses: { 200: { description: 'Products retrieved' } }
            },
            post: {
                tags: ['Products (Master Data)'],
                summary: 'Create a new product (Manager, Admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['sku', 'name', 'uom', 'basePrice'],
                                properties: {
                                    sku: { type: 'string', example: 'SKU-ELEC-SRV-90' },
                                    barcode: { type: 'string', example: '0849312004521' },
                                    name: { type: 'string', example: 'Enterprise Dual-Socket Blade Server Module 2U' },
                                    category: { type: 'string', example: 'Computing & Infrastructure' },
                                    uom: { type: 'string', example: 'unit' },
                                    basePrice: { type: 'number', example: 2450.00 },
                                    minStock: { type: 'integer', example: 15 }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Product created' } }
            }
        },
        '/api/products/{id}': {
            get: {
                tags: ['Products (Master Data)'],
                summary: 'Get single product by ID',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Product found' }, 404: { description: 'Product not found' } }
            },
            put: {
                tags: ['Products (Master Data)'],
                summary: 'Update product details (Manager, Admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    uom: { type: 'string' },
                                    basePrice: { type: 'number' },
                                    minStock: { type: 'integer' }
                                }
                            }
                        }
                    }
                },
                responses: { 200: { description: 'Product updated' } }
            },
            delete: {
                tags: ['Products (Master Data)'],
                summary: 'Soft-delete a product (Manager, Admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Product soft-deleted' } }
            }
        },
        '/api/suppliers': {
            get: {
                tags: ['Suppliers (Master Data)'],
                summary: 'Get all suppliers (Paginated & Searchable)',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    { name: 'search', in: 'query', schema: { type: 'string' } }
                ],
                responses: { 200: { description: 'Suppliers retrieved' } }
            },
            post: {
                tags: ['Suppliers (Master Data)'],
                summary: 'Create a new supplier (Purchasing, Manager, Admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string', example: 'PT Pangan Sejahtera' },
                                    contactInfo: { type: 'string', example: '081299998888' },
                                    address: { type: 'string', example: 'Jl. Merdeka Barat No. 25, Jakarta' }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Supplier created' } }
            }
        },
        '/api/warehouses': {
            get: {
                tags: ['Warehouses (Master Data)'],
                summary: 'Get all warehouses',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    { name: 'search', in: 'query', schema: { type: 'string' } }
                ],
                responses: { 200: { description: 'Warehouses retrieved' } }
            },
            post: {
                tags: ['Warehouses (Master Data)'],
                summary: 'Create a new warehouse (Manager, Admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'location'],
                                properties: {
                                    name: { type: 'string', example: 'Gudang Satelit Tangerang' },
                                    location: { type: 'string', example: 'Kawasan Pergudangan Bitung' }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Warehouse created' } }
            }
        },
        '/api/inventory': {
            get: {
                tags: ['Inventory (Core Stock)'],
                summary: 'Get current stock balance per warehouse and product (Paginated & Filterable)',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                    { name: 'warehouseId', in: 'query', schema: { type: 'integer' } },
                    { name: 'productId', in: 'query', schema: { type: 'integer' } }
                ],
                responses: { 200: { description: 'Inventory stock list' } }
            }
        },
        '/api/inventory/report/{warehouseId}': {
            get: {
                tags: ['Inventory (Core Stock)'],
                summary: 'Get warehouse dashboard report with dynamic minStock critical alert (Manager, Admin)',
                parameters: [
                    { name: 'warehouseId', in: 'path', required: true, schema: { type: 'integer' } }
                ],
                responses: { 200: { description: 'Dashboard report with stock warnings' } }
            }
        },
        '/api/po': {
            get: {
                tags: ['Procurement (Purchase Orders)'],
                summary: 'Get purchase orders list (Paginated & Filterable)',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'] } },
                    { name: 'supplierId', in: 'query', schema: { type: 'integer' } }
                ],
                responses: { 200: { description: 'Purchase orders list' } }
            },
            post: {
                tags: ['Procurement (Purchase Orders)'],
                summary: 'Create a new purchase order (Purchasing, Manager, Admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['supplierId', 'items'],
                                properties: {
                                    supplierId: { type: 'integer', example: 1 },
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['productId', 'qtyOrdered', 'unitPrice'],
                                            properties: {
                                                productId: { type: 'integer', example: 1 },
                                                qtyOrdered: { type: 'integer', example: 50 },
                                                unitPrice: { type: 'number', example: 105000 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Purchase Order created with PENDING status' } }
            }
        },
        '/api/po/{id}/approve': {
            patch: {
                tags: ['Procurement (Purchase Orders)'],
                summary: 'Approve a pending purchase order (Manager, Admin)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: { 200: { description: 'Purchase Order approved' } }
            }
        },
        '/api/po/{id}/receive': {
            post: {
                tags: ['Procurement (Purchase Orders)'],
                summary: 'Receive items from approved PO into warehouse (Supports partial fulfillment)',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['warehouseId'],
                                properties: {
                                    warehouseId: { type: 'integer', example: 1 },
                                    items: {
                                        type: 'array',
                                        description: 'Leave empty or omit to receive all remaining items in bulk',
                                        items: {
                                            type: 'object',
                                            required: ['productId', 'qtyReceived'],
                                            properties: {
                                                productId: { type: 'integer', example: 1 },
                                                qtyReceived: { type: 'integer', example: 25 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Items received and inventory stock increased' } }
            }
        },
        '/api/transactions': {
            get: {
                tags: ['Transactions (Audit Ledger)'],
                summary: 'Get chronological transaction history / ledger (Paginated & Filterable)',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                    { name: 'type', in: 'query', schema: { type: 'string', enum: ['IN', 'OUT', 'ADJUST', 'TRANSFER'] } }
                ],
                responses: { 200: { description: 'Transaction ledger retrieved' } }
            }
        },
        '/api/transactions/in': {
            post: {
                tags: ['Transactions (Audit Ledger)'],
                summary: 'Record manual incoming goods (Staff Gudang, Manager, Admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['warehouseId', 'items'],
                                properties: {
                                    warehouseId: { type: 'integer', example: 1 },
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['productId', 'qty'],
                                            properties: {
                                                productId: { type: 'integer', example: 1 },
                                                qty: { type: 'integer', example: 10 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Transaction IN recorded' } }
            }
        },
        '/api/transactions/out': {
            post: {
                tags: ['Transactions (Audit Ledger)'],
                summary: 'Record manual outgoing goods (Staff Gudang, Manager, Admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['warehouseId', 'items'],
                                properties: {
                                    warehouseId: { type: 'integer', example: 1 },
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['productId', 'qty'],
                                            properties: {
                                                productId: { type: 'integer', example: 1 },
                                                qty: { type: 'integer', example: 5 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Transaction OUT recorded' }, 400: { description: 'Insufficient stock' } }
            }
        },
        '/api/transactions/adjust': {
            post: {
                tags: ['Transactions (Audit Ledger)'],
                summary: 'Perform Stock Opname / Physical Inventory Adjustment (Manager, Admin only)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['warehouseId', 'items'],
                                properties: {
                                    warehouseId: { type: 'integer', example: 1 },
                                    reason: { type: 'string', example: 'Stock Opname Bulanan' },
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['productId', 'actualQty'],
                                            properties: {
                                                productId: { type: 'integer', example: 1 },
                                                actualQty: { type: 'integer', example: 80, description: 'Real physical counted quantity' },
                                                notes: { type: 'string', example: 'Selisih 5 pcs ditemukan di rak belakang' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Stock adjusted and ledger updated' } }
            }
        },
        '/api/transactions/transfer': {
            post: {
                tags: ['Transactions (Audit Ledger)'],
                summary: 'Transfer stock between warehouses (Staff Gudang, Manager, Admin)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['sourceWarehouseId', 'targetWarehouseId', 'items'],
                                properties: {
                                    sourceWarehouseId: { type: 'integer', example: 1 },
                                    targetWarehouseId: { type: 'integer', example: 2 },
                                    notes: { type: 'string', example: 'Permintaan mutasi gudang cabang' },
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['productId', 'qty'],
                                            properties: {
                                                productId: { type: 'integer', example: 1 },
                                                qty: { type: 'integer', example: 10 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: { 201: { description: 'Transfer executed and stock updated across warehouses' } }
            }
        },
        '/api/benchmark/metrics': {
            get: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Get live system health, RSS memory, buffer queue, and packet recovery rates',
                security: [],
                responses: {
                    200: {
                        description: 'System telemetry metrics retrieved successfully'
                    }
                }
            }
        },
        '/api/benchmark/udp-log': {
            get: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Dispatch single fire-and-forget UDP telemetry datagram packet',
                security: [],
                responses: {
                    200: {
                        description: 'UDP datagram dispatched in microsecond time'
                    }
                }
            }
        },
        '/api/benchmark/sync-log': {
            get: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Synchronous blocking PostgreSQL database write (Baseline comparison)',
                security: [],
                responses: {
                    200: {
                        description: 'Synchronous write completed'
                    }
                }
            }
        },
        '/api/benchmark/burst-udp': {
            post: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Fire high-speed burst batch of UDP datagrams in a microsecond server loop',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    count: { type: 'integer', example: 100, description: 'Number of UDP logs to burst (1 - 10000)' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Burst dispatch completed' }
                }
            }
        },
        '/api/benchmark/simulate-loss': {
            post: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Inject artificial sequence jump to trigger Piggyback or TCP NACK self-healing',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    jump: { type: 'integer', example: 3, description: 'Sequence jump count (e.g. 3 for 2 lost pkts, 10 for 9 pkts)' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Simulated loss dispatched and self-healing activated' }
                }
            }
        },
        '/api/benchmark/critical-fallback': {
            post: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Trigger HTTP 500 error log to test Method 2 TCP Fallback Circuit Breaker',
                security: [],
                responses: {
                    200: { description: 'Critical log ingested via TCP Fallback' }
                }
            }
        },
        '/api/benchmark/heartbeat': {
            post: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Send manual Heartbeat signal to reset Watchdog 15s timer',
                security: [],
                responses: {
                    200: { description: 'Heartbeat signal registered' }
                }
            }
        },
        '/api/benchmark/autocannon': {
            post: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Run programmatic Autocannon HTTP load testing against local server',
                security: [],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    target: { type: 'string', enum: ['udp', 'sync'], example: 'udp' },
                                    duration: { type: 'integer', example: 5, description: 'Duration in seconds (2 - 30)' },
                                    connections: { type: 'integer', example: 50, description: 'Concurrent connections (1 - 200)' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Autocannon benchmark completed with ASCII report table' },
                    403: { description: 'Disabled by policy' },
                    429: { description: 'Another benchmark test is already in progress' }
                }
            }
        },
        '/api/benchmark/ring-buffer-stats': {
            get: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Inspect sender-side circular in-memory Ring Buffer status',
                security: [],
                responses: {
                    200: { description: 'Ring buffer capacity and stats returned' }
                }
            }
        },
        '/api/benchmark/logs': {
            delete: {
                tags: ['Telemetry & Benchmarking'],
                summary: 'Purge all persisted telemetry logs from PostgreSQL database',
                security: [],
                responses: {
                    200: { description: 'Logs wiped clean from database' }
                }
            }
        }
    }
};
