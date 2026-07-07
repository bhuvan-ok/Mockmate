import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Dev needs headroom for rapid manual testing; production stays strict.
const scale = env.isDev ? 20 : 1;

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100 * scale,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10 * scale,
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5 * scale,
  standardHeaders: true,
  legacyHeaders: false,
});
