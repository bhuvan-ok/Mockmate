import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as submissionService from './submission.service.js';

export const createSubmission = asyncHandler(async (req, res) => {
  const result = await submissionService.createSubmission(req.user.id, req.body);
  res.status(202).json(new ApiResponse(202, result, 'Submission queued'));
});

export const getSubmission = asyncHandler(async (req, res) => {
  const submission = await submissionService.getSubmission(req.params.id, req.user.id);
  res.status(200).json(new ApiResponse(200, submission));
});

export const receiveWorkerResult = asyncHandler(async (req, res) => {
  await submissionService.handleWorkerResult(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, null, 'Result recorded'));
});
