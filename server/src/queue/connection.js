import IORedis from 'ioredis';
import { env } from '../config/env.js';

// BullMQ requires this exact option — without it, blocking commands used
// internally by the queue/worker throw on connection.
export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});
