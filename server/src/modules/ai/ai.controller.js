import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as aiService from './ai.service.js';

export const getFeedback = asyncHandler(async (req, res) => {
  const feedback = await aiService.getFeedback(req.params.attemptId, req.user.id);
  res.status(200).json(new ApiResponse(200, feedback));
});
