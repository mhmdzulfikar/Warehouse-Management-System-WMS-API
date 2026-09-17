import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import inventoryRoutes from './routes/inventoryRoutes';
import poRouter from './routes/poRoutes';
import transactionRoutes from './routes/transactionRoutes';
import productRoutes from './routes/productRoutes';
import supplierRoutes from './routes/supplierRoutes';
import warehouseRoutes from './routes/warehouseRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Service Routers
app.use('/api/inventory', inventoryRoutes);
app.use('/api/po', poRouter);
app.use('/api/transactions', transactionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/warehouses', warehouseRoutes);

// Test Endpoint
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'WMS & Procurement API is running smoothly!' });
});

// Global Error Handler (MUST BE LAST MIDDLEWARE)
app.use(errorHandler);

// Run Server
app.listen(PORT, () => {
    console.log(`Backend server is active at http://localhost:${PORT}`);
});