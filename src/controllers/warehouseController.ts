import { Request, Response } from 'express';
import { 
    getAllWarehouses, 
    getWarehouseById, 
    createWarehouse, 
    updateWarehouse, 
    deleteWarehouse 
} from '../services/warehouseService';

// ==========================================
// 1. GET ALL WAREHOUSES (READ - PAGINATED & SEARCHABLE)
// ==========================================
export const fetchAllWarehouses = async (req: Request, res: Response) => {
    const { page, limit, search } = req.query;

    const result = await getAllWarehouses({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string | undefined
    });

    return res.status(200).json({ 
        success: true, 
        message: 'Successfully retrieved warehouses', 
        data: result.data,
        pagination: result.pagination
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
    
    await deleteWarehouse(Number(id));
    return res.status(200).json({ 
        success: true, 
        message: `Warehouse with ID ${id} has been successfully deleted.` 
    });
};
