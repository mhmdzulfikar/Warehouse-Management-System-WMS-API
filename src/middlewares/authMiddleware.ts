import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtUserPayload } from '../utils/jwt';

// 1. JWT Authentication Guard
export const checkIsLoggedIn = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Fallback for legacy headers in development mode only
        const legacyUserId = req.headers['x-user-id'];
        const legacyRole = req.headers['x-role'];
        if (legacyUserId) {
            req.user = {
                userId: Number(legacyUserId),
                username: `user_${legacyUserId}`,
                email: `user${legacyUserId}@wms.local`,
                role: (legacyRole as string) || 'Staff Gudang'
            };
            return next();
        }

        res.status(401).json({
            success: false,
            message: 'Access Denied: Missing or invalid Bearer token in Authorization header'
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error: any) {
        res.status(401).json({
            success: false,
            message: 'Access Denied: Token is invalid or has expired'
        });
        return;
    }
};

// 2. Generic Role-Based Authorization Guard
export const checkRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Access Denied: You are not authenticated'
            });
            return;
        }

        const userRole = req.user.role.toUpperCase();
        const isAllowed = allowedRoles.some(role => role.toUpperCase() === userRole);

        if (!isAllowed) {
            res.status(403).json({
                success: false,
                message: `Access Forbidden: This feature requires role [${allowedRoles.join(', ')}]! Your role is '${req.user.role}'`
            });
            return;
        }

        next();
    };
};

// 3. Convenience Guards
export const checkIsManager = checkRole(['Manager', 'Admin']);
export const checkIsAdmin = checkRole(['Admin']);