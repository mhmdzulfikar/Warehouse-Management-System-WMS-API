import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    let statusCode = 500;
    let message = 'Internal Server Error';

    // If it's our custom AppError, use its status and message
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof Error) {
        // Fallback for standard errors (e.g., from Services)
        message = err.message;
        
        // Prisma or specific errors can be caught here and mapped to 400 if needed
        if (message.includes('not found') || message.includes('already in use')) {
            statusCode = 400; // Bad Request
        }
    }

    // Send the standardized JSON response
    res.status(statusCode).json({
        success: false,
        message: message,
        // In production, we might want to hide the stack trace
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
};
