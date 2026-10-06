import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyWorkerSecret } from '../../middlewares/workerAuth.middleware.js';
import { submissionLimiter } from '../../middlewares/rateLimit.middleware.js';
import {
  createSubmissionSchema,
  submissionIdParamSchema,
  workerResultSchema,
} from './submission.validation.js';
import * as submissionController from './submission.controller.js';

const router = Router();

router.post(
  '/internal/:id/result',
  verifyWorkerSecret,
  validate(workerResultSchema),
  submissionController.receiveWorkerResult
);

router.use(protect);
router.post(
  '/',
  submissionLimiter,
  validate(createSubmissionSchema),
  submissionController.createSubmission
);
router.get('/:id', validate(submissionIdParamSchema), submissionController.getSubmission);

export default router;
