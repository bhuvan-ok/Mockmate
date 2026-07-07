import { Worker } from 'bullmq';
import { redisConnection } from './connection.js';
import { runSubmission } from './runner.js';
import { postResult } from './resultClient.js';

const worker = new Worker(
  'code-submissions',
  async (job) => {
    const {
      submissionId,
      language,
      code,
      driverCode,
      testCases,
      timeLimitMs,
      memoryLimitMb,
      outputComparator,
    } = job.data;

    try {
      const { verdicts, testCasesPassed, testCasesTotal } = await runSubmission({
        language,
        code,
        driverCode,
        testCases,
        timeLimitMs,
        memoryLimitMb,
        outputComparator,
      });

      await postResult(submissionId, {
        status: 'completed',
        verdicts,
        testCasesPassed,
        testCasesTotal,
        errorMessage: '',
      });
    } catch (err) {
      console.error(`Submission ${submissionId} failed:`, err);
      await postResult(submissionId, {
        status: 'error',
        verdicts: [],
        testCasesPassed: 0,
        testCasesTotal: testCases.length,
        errorMessage: err.message,
      }).catch((postErr) => console.error('Failed to report error to server:', postErr));
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // matches a modest free-tier VM's CPU budget
  }
);

worker.on('completed', (job) => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err));
worker.on('error', (err) => console.error('Worker/Redis connection error:', err));

console.log('MockMate sandbox worker listening for submissions...');
