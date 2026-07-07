import { config } from './config.js';

// Bounds how long a single job can be stuck waiting on the server before
// BullMQ sees a failure and frees this worker's concurrency slot — without
// this, a hung/unreachable server would stall the queue indefinitely (with
// concurrency: 2, just two hung callbacks would stop all grading).
const POST_RESULT_TIMEOUT_MS = 15000;

export const postResult = async (submissionId, result) => {
  const url = `${config.serverUrl}/api/v1/submissions/internal/${submissionId}/result`;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), POST_RESULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': config.workerCallbackSecret,
      },
      body: JSON.stringify(result),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Server rejected result for ${submissionId}: ${res.status} ${body}`);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Timed out posting result for ${submissionId} after ${POST_RESULT_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }
};
