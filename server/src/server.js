import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { startAttemptSweeper } from './jobs/attemptSweeper.js';

const start = async () => {
  await connectDB();
  startAttemptSweeper();

  app.listen(env.port, () => {
    console.log(`MockMate server listening on port ${env.port} (${env.nodeEnv})`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
