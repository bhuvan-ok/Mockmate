import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { generalLimiter, authLimiter, aiLimiter } from './middlewares/rateLimit.middleware.js';

import authRoutes from './modules/auth/auth.routes.js';
import questionRoutes from './modules/question/question.routes.js';
import interviewSetRoutes from './modules/interview-set/interview-set.routes.js';
import attemptRoutes from './modules/attempt/attempt.routes.js';
import submissionRoutes from './modules/submission/submission.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (env.isDev) app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/v1', generalLimiter);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/interview-sets', interviewSetRoutes);
app.use('/api/v1/attempts', attemptRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/ai', aiLimiter, aiRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
