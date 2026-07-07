import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { attemptIdParamSchema } from '../attempt/attempt.validation.js';
import * as aiController from './ai.controller.js';

const router = Router();

router.use(protect);
router.get('/:attemptId/feedback', validate(attemptIdParamSchema), aiController.getFeedback);

export default router;
