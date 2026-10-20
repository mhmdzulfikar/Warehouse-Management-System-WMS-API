import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { signToken, JwtUserPayload } from '../utils/jwt';

export interface RegisterInput {
    username: string;
    email: string;
    password: string;
    roleId: number;
}

export interface LoginInput {
    identifier: string; // email or username
    password: string;
}

export const registerUser = async (input: RegisterInput) => {
    // 1. Check if username or email is already taken
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { username: input.username },
                { email: input.email }
            ]
        }
    });

    if (existingUser) {
        if (existingUser.username === input.username) {
            throw new AppError(`Username '${input.username}' is already taken!`, 400);
        }
        if (existingUser.email === input.email) {
            throw new AppError(`Email '${input.email}' is already registered!`, 400);
        }
    }

    // 2. Check if the specified role exists
    const role = await prisma.role.findUnique({
        where: { id: input.roleId }
    });

    if (!role) {
        throw new AppError(`Role with ID ${input.roleId} not found!`, 404);
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // 4. Create user in the database
    const user = await prisma.user.create({
        data: {
            username: input.username,
            email: input.email,
            password: hashedPassword,
            roleId: input.roleId
        },
        include: {
            role: true
        }
    });

    // 5. Generate JWT token
    const tokenPayload: JwtUserPayload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name
    };

    const token = signToken(tokenPayload);

    return {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role.name
        },
        token
    };
};

export const loginUser = async (input: LoginInput) => {
    // 1. Find user by username or email
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { username: input.identifier },
                { email: input.identifier }
            ]
        },
        include: {
            role: true
        }
    });

    if (!user) {
        throw new AppError('Invalid username/email or password', 401);
    }

    // 2. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
        throw new AppError('Invalid username/email or password', 401);
    }

    // 3. Generate JWT token
    const tokenPayload: JwtUserPayload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name
    };

    const token = signToken(tokenPayload);

    return {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role.name
        },
        token
    };
};

export const getUserProfile = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: true
        }
    });

    if (!user) {
        throw new AppError(`User with ID ${userId} not found`, 404);
    }

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name
    };
};
