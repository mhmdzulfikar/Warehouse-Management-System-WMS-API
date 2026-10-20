import { Request, Response } from 'express';
import { getAllInventory, getWarehouseDashboardReport } from '../services/inventoryService';

// Function to fetch all warehouse stock data along with its product details
export const getInventoryStock = async (req: Request, res: Response) => {
    const { page, limit, warehouseId, productId } = req.query;

    const result = await getAllInventory({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        productId: productId ? Number(productId) : undefined
    });

    return res.status(200).json({
        success: true,
        message: 'Successfully retrieved warehouse stock data',
        data: result.data,
        pagination: result.pagination
    });
};

export const getDashboardReport = async (req: Request, res: Response) => {
    const { warehouseId } = req.params;
    const report = await getWarehouseDashboardReport(Number(warehouseId));

    return res.status(200).json({
        success: true,
        message: 'Successfully retrieved warehouse dashboard report',
        data: report
    });
};