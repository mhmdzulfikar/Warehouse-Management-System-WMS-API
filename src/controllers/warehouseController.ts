import { Request, Response } from 'express';
import { 
    getAllWarehouses, 
    getWarehouseById, 
    createWarehouse, 
    updateWarehouse, 
    deleteWarehouse 
} from '../services/warehouseService';
import { AppError } from '../utils/AppError';

// ==========================================
// 1. GET ALL WAREHOUSES (READ)
// ==========================================
export const fetchAllWarehouses = async (req: Request, res: Response) => {
    const warehouses = await getAllWarehouses();
    return res.status(200).json({ 
        success: true, 
        message: 'Successfully retrieved all warehouses', 
        data: warehouses 
    });
};

// ==========================================
// 2. GET SINGLE WAREHOUSE BY ID (READ)
// ==========================================
export const fetchWarehouseById = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const warehouse = await getWarehouseById(Number(id));
    return res.status(200).json({ 
        success: true, 
        message: 'Successfully retrieved warehouse data', 
        data: warehouse 
    });
};

// ==========================================
// 3. CREATE NEW WAREHOUSE (CREATE)
// ==========================================
export const addWarehouse = async (req: Request, res: Response) => {
    const { name, location } = req.body;

    const newWarehouse = await createWarehouse(name, location);
    return res.status(201).json({ 
        success: true, 
        message: 'Warehouse successfully created!', 
        data: newWarehouse 
    });
};

// ==========================================
// 4. UPDATE WAREHOUSE (UPDATE)
// ==========================================
export const editWarehouse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const updatedWarehouse = await updateWarehouse(Number(id), data);
    return res.status(200).json({ 
        success: true, 
        message: 'Warehouse successfully updated!', 
        data: updatedWarehouse 
    });
};

// ==========================================
// 5. DELETE WAREHOUSE
// ==========================================
export const removeWarehouse = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // If it fails due to existing inventories, the Prisma error will bubble up 
    // and be caught by our global error handler which can map it.
    await deleteWarehouse(Number(id));
    return res.status(200).json({ 
        success: true, 
        message: `Warehouse with ID ${id} has been successfully deleted.` 
    });
};
