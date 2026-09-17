export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Indicates this is a known, expected error (e.g. 404, 400)

        // Capture the stack trace, keeping the constructor call out of it
        Error.captureStackTrace(this, this.constructor);
    }
}
