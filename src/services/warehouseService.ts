import prisma from '../config/prisma';

// ==========================================
// 1. GET ALL WAREHOUSES (READ)
// ==========================================
export const getAllWarehouses = async () => {
    return await prisma.warehouse.findMany();
};

// ==========================================
// 2. GET SINGLE WAREHOUSE BY ID (READ)
// ==========================================
export const getWarehouseById = async (id: number) => {
    const warehouse = await prisma.warehouse.findUnique({
        where: { id: Number(id) }
    });

    if (!warehouse) {
        throw new Error(`Warehouse with ID ${id} not found.`);
    }

    return warehouse;
};

// ==========================================
// 3. CREATE NEW WAREHOUSE (CREATE)
// ==========================================
export const createWarehouse = async (name: string, location: string) => {
    return await prisma.warehouse.create({
        data: {
            name,
            location
        }
    });
};

// ==========================================
// 4. UPDATE WAREHOUSE (UPDATE)
// ==========================================
export const updateWarehouse = async (id: number, data: { name?: string, location?: string }) => {
    // Ensure the warehouse exists before updating
    await getWarehouseById(id);

    return await prisma.warehouse.update({
        where: { id: Number(id) },
        data: {
            name: data.name,
            location: data.location
        }
    });
};

// ==========================================
// 5. DELETE WAREHOUSE (HARD DELETE)
// ==========================================
export const deleteWarehouse = async (id: number) => {
    // Ensure the warehouse exists
    await getWarehouseById(id);

    // Hard delete. This might fail if the warehouse has existing inventory/transactions 
    // due to foreign key constraints. In a real world app, we should use Soft Delete here too.
    return await prisma.warehouse.delete({
        where: { id: Number(id) }
    });
};
