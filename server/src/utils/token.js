import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

export const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiry,
  });

export const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiry,
  });

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};
