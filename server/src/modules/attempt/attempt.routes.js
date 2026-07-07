import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  startAttemptSchema,
  attemptIdParamSchema,
  mcqAnswerSchema,
  integrityEventSchema,
} from './attempt.validation.js';
import * as attemptController from './attempt.controller.js';

const router = Router();

router.use(protect);

router.post('/', validate(startAttemptSchema), attemptController.startAttempt);
router.get('/', attemptController.listMyAttempts);
router.get('/admin', restrictTo('admin'), attemptController.listAttemptsAdmin);
router.get(
  '/admin/:attemptId',
  restrictTo('admin'),
  validate(attemptIdParamSchema),
  attemptController.getAttemptAdmin
);

router.get('/:attemptId', validate(attemptIdParamSchema), attemptController.getCurrentState);
router.get('/:attemptId/report', validate(attemptIdParamSchema), attemptController.getReport);
router.post(
  '/:attemptId/mcq-answer',
  validate(mcqAnswerSchema),
  attemptController.submitMcqAnswer
);
router.post('/:attemptId/end', validate(attemptIdParamSchema), attemptController.endAttempt);
router.post(
  '/:attemptId/integrity-event',
  validate(integrityEventSchema),
  attemptController.logIntegrityEvent
);

export default router;
