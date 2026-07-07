import cron from 'node-cron';
import { sweepExpiredRounds } from '../modules/attempt/attempt.service.js';

// Belt-and-braces alongside the lazy per-request expiry check in
// attempt.service.js — catches attempts whose round deadline passed while no
// one was actively polling the API.
export const startAttemptSweeper = () => {
  cron.schedule('*/15 * * * * *', async () => {
    try {
      await sweepExpiredRounds();
    } catch (err) {
      console.error('Attempt sweeper error:', err);
    }
  });
};
