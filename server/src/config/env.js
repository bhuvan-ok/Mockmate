import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  port: Number(process.env.PORT) || 5000,

  mongoUri: process.env.MONGO_URI,

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',

  clientUrl: process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'),

  redisUrl: process.env.REDIS_URL,

  workerCallbackSecret: process.env.WORKER_CALLBACK_SECRET,

  geminiApiKey: process.env.GEMINI_API_KEY || '',
};

const required = ['mongoUri', 'jwtAccessSecret', 'jwtRefreshSecret', 'workerCallbackSecret', 'clientUrl'];

for (const key of required) {
  if (!env[key]) {
    throw new Error(`Missing required env var for "${key}" — check your .env file`);
  }
}
