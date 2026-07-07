import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

export const submissionQueue = new Queue('code-submissions', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // a code submission isn't safe to silently retry — surface failures instead
    removeOnComplete: 500,
    removeOnFail: 500,
  },
});

export const enqueueSubmission = async ({
  submissionId,
  language,
  code,
  driverCode,
  testCases,
  timeLimitMs,
  memoryLimitMb,
}) => {
  await submissionQueue.add('execute', {
    submissionId,
    language,
    code,
    driverCode,
    testCases,
    timeLimitMs,
    memoryLimitMb,
  });
};
