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
import customerRoutes from './routes/customerRoutes';
import salesOrderRoutes from './routes/salesOrderRoutes';
import deliveryOrderRoutes from './routes/deliveryOrderRoutes';
import benchmarkRoutes from './routes/benchmarkRoutes';
import { telemetryMiddleware } from './middlewares/telemetryMiddleware';
import { startHeartbeat } from './utils/udpLogger';
import { startAggregator } from './aggregator';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable 2-space pretty-printed JSON responses
app.set('json spaces', 2);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dual-Track Telemetry (Global UDP Log Dispatcher)
app.use(telemetryMiddleware);

// Serve Frontend Static Web Application
app.use(express.static(path.resolve(process.cwd(), 'public')));
app.use('/dashboard', express.static(path.resolve(process.cwd(), 'public')));

// Unified Developer & Testing Hub (/studio)
app.get('/studio', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(process.cwd(), 'public/studio.html'));
});

// Auto-Redirects for legacy URLs
app.get('/benchmark', (_req: Request, res: Response) => {
    res.redirect('/studio#telemetry');
});
app.get('/telemetry-studio', (_req: Request, res: Response) => {
    res.redirect('/studio#telemetry');
});
app.get('/api-docs', (req: Request, res: Response, next) => {
    if (req.accepts('html')) {
        return res.redirect('/studio#api');
    }
    next();
});

// Swagger Specification JSON & Standalone Assets
app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
});
try {
    const swaggerDistPath = require('swagger-ui-dist').getAbsoluteFSPath();
    app.use('/swagger-dist', express.static(swaggerDistPath));
} catch (e) {
    console.warn('[SWAGGER] swagger-ui-dist asset mapping skipped');
}

// Swagger Interactive Documentation Fallback
app.use('/api-docs/raw', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Service Routers
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/po', poRouter);
app.use('/api/transactions', transactionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/delivery-orders', deliveryOrderRoutes);
app.use('/api/benchmark', benchmarkRoutes);

// Health Endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', message: 'WMS & Procurement API is running smoothly!' });
});

// Global Error Handler (MUST BE LAST MIDDLEWARE)
app.use(errorHandler);

// Run Server & Start UDP Heartbeat & Embedded Aggregator Daemon
app.listen(PORT, () => {
    console.log(`Backend server is active at http://localhost:${PORT}`);
    try {
        startAggregator();
    } catch (e: any) {
        console.warn('[Aggregator] Could not start embedded UDP server (might run as separate process):', e.message);
    }
    startHeartbeat(5000);
});