import { Router } from 'express';
import { protect, restrictTo } from '../../middlewares/auth.middleware.js';
import * as adminController from './admin.controller.js';

const router = Router();

router.use(protect, restrictTo('admin'));
router.get('/analytics', adminController.getAnalytics);

export default router;
