import dotenv from 'dotenv';

dotenv.config();

export const config = {
  redisUrl: process.env.REDIS_URL,
  serverUrl: process.env.SERVER_URL,
  workerCallbackSecret: process.env.WORKER_CALLBACK_SECRET,
  jsRunnerImage: process.env.JS_RUNNER_IMAGE || 'mockmate-runner-js:latest',
  cppRunnerImage: process.env.CPP_RUNNER_IMAGE || 'mockmate-runner-cpp:latest',
};

const required = ['redisUrl', 'serverUrl', 'workerCallbackSecret'];
for (const key of required) {
  if (!config[key]) {
    throw new Error(`Missing required env var for "${key}" — check your .env file`);
  }
}
