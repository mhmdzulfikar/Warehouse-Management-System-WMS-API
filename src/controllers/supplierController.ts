import { Request, Response } from 'express';
import { 
    getAllSuppliers, 
    getSupplierById, 
    createSupplier, 
    updateSupplier, 
    deleteSupplier 
} from '../services/supplierService';
import { AppError } from '../utils/AppError';

// ==========================================
// 1. GET ALL SUPPLIERS (READ)
// ==========================================
export const fetchAllSuppliers = async (req: Request, res: Response) => {
    const suppliers = await getAllSuppliers();
    return res.status(200).json({ 
        success: true, 
        message: 'Successfully retrieved all active suppliers', 
        data: suppliers 
    });
};

// ==========================================
// 2. GET SINGLE SUPPLIER BY ID (READ)
// ==========================================
export const fetchSupplierById = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const supplier = await getSupplierById(Number(id));
    return res.status(200).json({ 
        success: true, 
        message: 'Successfully retrieved supplier data', 
        data: supplier 
    });
};

// ==========================================
// 3. CREATE NEW SUPPLIER (CREATE)
// ==========================================
export const addSupplier = async (req: Request, res: Response) => {
    const { name, contactInfo, address } = req.body;

    const newSupplier = await createSupplier(name, contactInfo, address);
    return res.status(201).json({ 
        success: true, 
        message: 'Supplier successfully created!', 
        data: newSupplier 
    });
};

// ==========================================
// 4. UPDATE SUPPLIER (UPDATE)
// ==========================================
export const editSupplier = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const updatedSupplier = await updateSupplier(Number(id), data);
    return res.status(200).json({ 
        success: true, 
        message: 'Supplier successfully updated!', 
        data: updatedSupplier 
    });
};

// ==========================================
// 5. DELETE SUPPLIER (SOFT DELETE)
// ==========================================
export const removeSupplier = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    await deleteSupplier(Number(id));
    return res.status(200).json({ 
        success: true, 
        message: `Supplier with ID ${id} has been successfully deleted.` 
    });
};
