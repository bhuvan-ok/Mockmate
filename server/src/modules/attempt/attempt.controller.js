import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as attemptService from './attempt.service.js';

export const startAttempt = asyncHandler(async (req, res) => {
  const state = await attemptService.startAttempt(req.user.id, req.body.interviewSetId);
  res.status(201).json(new ApiResponse(201, state, 'Attempt started'));
});

export const listMyAttempts = asyncHandler(async (req, res) => {
  const result = await attemptService.listMyAttempts(req.user.id, req.query);
  res.status(200).json(new ApiResponse(200, result));
});

export const getCurrentState = asyncHandler(async (req, res) => {
  const state = await attemptService.getCurrentState(req.params.attemptId, req.user.id);
  res.status(200).json(new ApiResponse(200, state));
});

export const submitMcqAnswer = asyncHandler(async (req, res) => {
  const state = await attemptService.submitMcqAnswer(
    req.params.attemptId,
    req.user.id,
    req.body.selectedOptionIndex
  );
  res.status(200).json(new ApiResponse(200, state));
});

export const endAttempt = asyncHandler(async (req, res) => {
  const result = await attemptService.endAttemptEarly(req.params.attemptId, req.user.id);
  res.status(200).json(new ApiResponse(200, result, 'Attempt ended'));
});

export const logIntegrityEvent = asyncHandler(async (req, res) => {
  const flags = await attemptService.logIntegrityEvent(
    req.params.attemptId,
    req.user.id,
    req.body.type
  );
  res.status(200).json(new ApiResponse(200, flags));
});

export const getReport = asyncHandler(async (req, res) => {
  const report = await attemptService.getReport(req.params.attemptId, req.user.id);
  res.status(200).json(new ApiResponse(200, report));
});

export const listAttemptsAdmin = asyncHandler(async (req, res) => {
  const result = await attemptService.listAttemptsAdmin(req.query);
  res.status(200).json(new ApiResponse(200, result));
});

export const getAttemptAdmin = asyncHandler(async (req, res) => {
  const attempt = await attemptService.getAttemptAdmin(req.params.attemptId);
  res.status(200).json(new ApiResponse(200, attempt));
});
