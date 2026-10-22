import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swagger';
import path from 'path';
import dashboardRoutes from './routes/dashboardRoutes';
import authRoutes from './routes/authRoutes';
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

// Serve Frontend Static Web Application
app.use(express.static(path.resolve(process.cwd(), 'public')));
app.use('/dashboard', express.static(path.resolve(process.cwd(), 'public')));

// Swagger Interactive Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Service Routers
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/po', poRouter);
app.use('/api/transactions', transactionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/warehouses', warehouseRoutes);

// Health Endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', message: 'WMS & Procurement API is running smoothly!' });
});

// Global Error Handler (MUST BE LAST MIDDLEWARE)
app.use(errorHandler);

// Run Server
app.listen(PORT, () => {
    console.log(`Backend server is active at http://localhost:${PORT}`);
});