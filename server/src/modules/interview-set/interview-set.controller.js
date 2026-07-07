import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as interviewSetService from './interview-set.service.js';

export const createInterviewSet = asyncHandler(async (req, res) => {
  const set = await interviewSetService.createInterviewSet(req.body, req.user.id);
  res.status(201).json(new ApiResponse(201, set, 'Interview set created'));
});

export const listInterviewSetsAdmin = asyncHandler(async (req, res) => {
  const sets = await interviewSetService.listInterviewSetsAdmin();
  res.status(200).json(new ApiResponse(200, sets));
});

export const getInterviewSetAdmin = asyncHandler(async (req, res) => {
  const set = await interviewSetService.getInterviewSetAdmin(req.params.id);
  res.status(200).json(new ApiResponse(200, set));
});

export const updateInterviewSet = asyncHandler(async (req, res) => {
  const set = await interviewSetService.updateInterviewSet(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, set, 'Interview set updated'));
});

export const deleteInterviewSet = asyncHandler(async (req, res) => {
  await interviewSetService.deleteInterviewSet(req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Interview set deleted'));
});

export const listInterviewSetsForCandidate = asyncHandler(async (req, res) => {
  const sets = await interviewSetService.listInterviewSetsForCandidate();
  res.status(200).json(new ApiResponse(200, sets));
});

export const getInterviewSetForCandidate = asyncHandler(async (req, res) => {
  const set = await interviewSetService.getInterviewSetForCandidate(req.params.id);
  res.status(200).json(new ApiResponse(200, set));
});
