import { timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Guards the internal worker-callback routes — these aren't reachable by a
// candidate's browser, only by the sandbox worker service posting a verdict.
// Uses a length check + timingSafeEqual (not `!==`) so a byte-by-byte string
// comparison can't leak how many leading characters of the secret an
// attacker has guessed correctly via response-time differences.
export const verifyWorkerSecret = (req, res, next) => {
  const secret = req.headers['x-worker-secret'];
  const provided = Buffer.from(typeof secret === 'string' ? secret : '');
  const expected = Buffer.from(env.workerCallbackSecret);

  const isValid = provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!isValid) {
    throw new ApiError(401, 'Invalid worker credentials');
  }
  next();
};
