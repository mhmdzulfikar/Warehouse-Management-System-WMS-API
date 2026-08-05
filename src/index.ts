import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import inventoryRoutes from './routes/inventoryRoutes';
import poRouter from './routes/poRoutes';
import transactionRoutes from './routes/transactionRoutes';

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

// Endpoint Tes
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'WMS & Procurement API is running smoothly!' });
});

// Jalankan Server
app.listen(PORT, () => {
    console.log(`Server backend aktif di http://localhost:${PORT}`);
});