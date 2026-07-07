import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as questionService from './question.service.js';

export const createQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.createQuestion(req.body, req.user.id);
  res.status(201).json(new ApiResponse(201, question, 'Question created'));
});

export const listQuestionsAdmin = asyncHandler(async (req, res) => {
  const result = await questionService.listQuestionsAdmin(req.query);
  res.status(200).json(new ApiResponse(200, result));
});

export const getQuestionAdmin = asyncHandler(async (req, res) => {
  const question = await questionService.getQuestionAdmin(req.params.id);
  res.status(200).json(new ApiResponse(200, question));
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.updateQuestion(req.params.id, req.body);
  res.status(200).json(new ApiResponse(200, question, 'Question updated'));
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  await questionService.deleteQuestion(req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Question deleted'));
});
