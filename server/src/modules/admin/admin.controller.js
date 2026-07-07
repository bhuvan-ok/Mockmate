import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as adminService from './admin.service.js';

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminService.getAnalytics();
  res.status(200).json(new ApiResponse(200, analytics));
});
