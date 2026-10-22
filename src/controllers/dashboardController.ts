import { Request, Response } from 'express';
import { getDashboardSummary } from '../services/dashboardService';

export const getDashboardStats = async (req: Request, res: Response) => {
    const summary = await getDashboardSummary();

    return res.status(200).json({
        success: true,
        message: 'Dashboard analytics summary retrieved successfully',
        data: summary
    });
};
