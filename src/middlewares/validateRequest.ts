import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

// Middleware to validate request body against a Zod schema
export const validateRequest = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // parseAsync will throw a ZodError if validation fails
            // We reassign req.body to the parsed result so it also cleans up unknown fields if configured
            req.body = await schema.parseAsync(req.body);
            next(); // Validation passed, proceed to the Controller!
        } catch (error) {
            if (error instanceof ZodError) {
                // Extract and combine all Zod error messages into one string
                const errorMessages = error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
                next(new AppError(`Validation failed - ${errorMessages}`, 400));
            } else {
                next(error);
            }
        }
    };
};
