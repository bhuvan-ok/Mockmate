import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createInterviewSetSchema,
  updateInterviewSetSchema,
  interviewSetIdParamSchema,
} from './interview-set.validation.js';
import * as interviewSetController from './interview-set.controller.js';

const router = Router();

router.use(protect);

router.get('/', interviewSetController.listInterviewSetsForCandidate);
router.get(
  '/:id',
  validate(interviewSetIdParamSchema),
  interviewSetController.getInterviewSetForCandidate
);

router.post(
  '/admin',
  restrictTo('admin'),
  validate(createInterviewSetSchema),
  interviewSetController.createInterviewSet
);
router.get('/admin/all', restrictTo('admin'), interviewSetController.listInterviewSetsAdmin);
router.get(
  '/admin/:id',
  restrictTo('admin'),
  validate(interviewSetIdParamSchema),
  interviewSetController.getInterviewSetAdmin
);
router.put(
  '/admin/:id',
  restrictTo('admin'),
  validate(updateInterviewSetSchema),
  interviewSetController.updateInterviewSet
);
router.delete(
  '/admin/:id',
  restrictTo('admin'),
  validate(interviewSetIdParamSchema),
  interviewSetController.deleteInterviewSet
);

export default router;
