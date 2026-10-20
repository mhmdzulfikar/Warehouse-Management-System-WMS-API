import { Request, Response } from 'express';
import { getAllInventory, getWarehouseDashboardReport } from '../services/inventoryService';

// Function to fetch all warehouse stock data along with its product details
export const getInventoryStock = async (req: Request, res: Response) => {
    const inventories = await getAllInventory();

    return res.status(200).json({
        success: true,
        message: 'Successfully retrieved warehouse stock data',
        data: inventories,
    });
};

export const getDashboardReport = async (req: Request, res: Response) => {
    const { warehouseId } = req.params;
    const report = await getWarehouseDashboardReport(Number(warehouseId));

    return res.status(200).json({
        success: true,
        message: "Successfully retrieved warehouse dashboard report",
        data: report
    });
};