import { Request, Response } from 'express';
import { 
    getAllProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct 
} from '../services/productService';

// ==========================================
// 1. GET ALL PRODUCTS (READ - PAGINATED & SEARCHABLE)
// ==========================================
export const fetchAllProducts = async (req: Request, res: Response) => {
    const { page, limit, search } = req.query;

    const result = await getAllProducts({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string | undefined
    });

    return res.status(200).json({ 
        success: true, 
        message: 'Successfully retrieved active products', 
        data: result.data,
        pagination: result.pagination
    });
};

// ==========================================
// 2. GET SINGLE PRODUCT BY ID (READ)
// ==========================================
export const fetchProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const product = await getProductById(Number(id));
    return res.status(200).json({ 
        success: true, 
        message: 'Successfully retrieved product data', 
        data: product 
    });
};

// ==========================================
// 3. CREATE NEW PRODUCT (CREATE)
// ==========================================
export const addProduct = async (req: Request, res: Response) => {
    const { sku, name, uom, basePrice, minStock } = req.body;

    const newProduct = await createProduct(
        sku,
        name,
        uom,
        Number(basePrice),
        minStock !== undefined ? Number(minStock) : undefined
    );

    return res.status(201).json({ 
        success: true, 
        message: 'Product successfully created!', 
        data: newProduct 
    });
};

// ==========================================
// 4. UPDATE PRODUCT (UPDATE)
// ==========================================
export const editProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    const updatedProduct = await updateProduct(Number(id), data);
    return res.status(200).json({ 
        success: true, 
        message: 'Product successfully updated!', 
        data: updatedProduct 
    });
};

// ==========================================
// 5. DELETE PRODUCT (SOFT DELETE)
// ==========================================
export const removeProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    await deleteProduct(Number(id));
    return res.status(200).json({ 
        success: true, 
        message: `Product with ID ${id} has been successfully deleted (Soft Delete).` 
    });
};
