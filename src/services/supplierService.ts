import prisma from '../config/prisma';

// ==========================================
// 1. GET ALL SUPPLIERS (READ)
// ==========================================
export const getAllSuppliers = async () => {
    // We only fetch suppliers that are not soft-deleted
    return await prisma.supplier.findMany({
        where: {
            deletedAt: null 
        }
    });
};

// ==========================================
// 2. GET SINGLE SUPPLIER BY ID (READ)
// ==========================================
export const getSupplierById = async (id: number) => {
    const supplier = await prisma.supplier.findUnique({
        where: { id: Number(id) }
    });

    if (!supplier || supplier.deletedAt !== null) {
        throw new Error(`Supplier with ID ${id} not found or has been deleted.`);
    }

    return supplier;
};

// ==========================================
// 3. CREATE NEW SUPPLIER (CREATE)
// ==========================================
export const createSupplier = async (name: string, contactInfo?: string, address?: string) => {
    return await prisma.supplier.create({
        data: {
            name,
            contactInfo,
            address
        }
    });
};

// ==========================================
// 4. UPDATE SUPPLIER (UPDATE)
// ==========================================
export const updateSupplier = async (id: number, data: any) => {
    // Ensure the supplier exists before updating
    await getSupplierById(id);

    return await prisma.supplier.update({
        where: { id: Number(id) },
        data: {
            name: data.name,
            contactInfo: data.contactInfo,
            address: data.address
        }
    });
};

// ==========================================
// 5. DELETE SUPPLIER (SOFT DELETE)
// ==========================================
export const deleteSupplier = async (id: number) => {
    // Ensure the supplier exists
    await getSupplierById(id);

    // Soft delete by updating `deletedAt`
    return await prisma.supplier.update({
        where: { id: Number(id) },
        data: {
            deletedAt: new Date()
        }
    });
};
