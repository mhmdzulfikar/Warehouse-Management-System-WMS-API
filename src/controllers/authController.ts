import { Request, Response } from 'express';
import { registerUser, loginUser, getUserProfile } from '../services/authService';
import { AppError } from '../utils/AppError';

export const register = async (req: Request, res: Response) => {
    const { username, email, password, roleId } = req.body;

    const result = await registerUser({ username, email, password, roleId: Number(roleId) });

    return res.status(201).json({
        success: true,
        message: 'User registered successfully!',
        data: result
    });
};

export const login = async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    const result = await loginUser({ identifier, password });

    return res.status(200).json({
        success: true,
        message: 'Login successful!',
        data: result
    });
};

export const getMe = async (req: Request, res: Response) => {
    // req.user is set by authMiddleware
    if (!req.user) {
        throw new AppError('Unauthorized: User context missing', 401);
    }

    const user = await getUserProfile(req.user.userId);

    return res.status(200).json({
        success: true,
        message: 'Current user profile retrieved successfully',
        data: user
    });
};
