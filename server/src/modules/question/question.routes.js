import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionIdParamSchema,
} from './question.validation.js';
import * as questionController from './question.controller.js';

const router = Router();

router.use(protect, restrictTo('admin'));

router.post('/', validate(createQuestionSchema), questionController.createQuestion);
router.get('/', questionController.listQuestionsAdmin);
router.get('/:id', validate(questionIdParamSchema), questionController.getQuestionAdmin);
router.put('/:id', validate(updateQuestionSchema), questionController.updateQuestion);
router.delete('/:id', validate(questionIdParamSchema), questionController.deleteQuestion);

export default router;
