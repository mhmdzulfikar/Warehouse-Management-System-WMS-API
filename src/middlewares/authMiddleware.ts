import { Request, Response, NextFunction } from 'express';

// 1. Login Checker Security Guard (Middleware)
export const checkIsLoggedIn = (req: Request, res: Response, next: NextFunction): void => {
    // We treat 'x-user-id' in the header as the ID Card
    const userId = req.headers['x-user-id'];

    if (!userId) {
        // No ID Card? Kick them out! (401 Unauthorized)
        res.status(401).json({
            success: false,
            message: 'Access Denied: You are not logged in! (Missing x-user-id in header)'
        });
        return;
    }

    // If they brought their ID Card, they can proceed!
    next();
};

// 2. Specific Role Checker Security Guard (Only Manager)
export const checkIsManager = (req: Request, res: Response, next: NextFunction): void => {
    // We check the role from the 'x-role' header
    const role = req.headers['x-role'];

    if (role !== 'MANAGER') {
        // Brought the ID Card but not a Manager? Kick them out! (403 Forbidden)
        res.status(403).json({
            success: false,
            message: 'Access Forbidden: This feature is only for MANAGER!'
        });
        return;
    }

    // If the role is really MANAGER, proceed to the Controller!
    next();
};