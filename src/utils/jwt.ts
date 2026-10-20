import jwt, { SignOptions } from 'jsonwebtoken';

export interface JwtUserPayload {
    userId: number;
    username: string;
    email: string;
    role: string;
}

const JWT_SECRET: string = process.env.JWT_SECRET || 'wms_default_secret_jwt_key_2026';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '1d') as SignOptions['expiresIn'];

export const signToken = (payload: JwtUserPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JwtUserPayload => {
    return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
};
