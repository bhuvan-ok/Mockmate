import { Submission } from './submission.model.js';
import { Question } from '../question/question.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { enqueueSubmission } from '../../queue/submissionQueue.js';
import * as attemptService from '../attempt/attempt.service.js';

// If the worker crashes/restarts mid-job, its BullMQ job is lost (attempts: 1,
// no retry) and the Submission would stay "queued" forever, permanently
// blocking resubmission. Past this age we treat it as abandoned and let a
// fresh submission through instead of leaving the candidate stuck.
const STALE_SUBMISSION_MS = 2 * 60 * 1000;

export const createSubmission = async (
  candidateId,
  { attemptId, language, code, mode, customInput }
) => {
  const { round, item } = await attemptService.getCurrentItemContext(attemptId, candidateId);

  if (round.type !== 'coding') throw new ApiError(400, 'Current round is not a coding round');
  if (item.answeredAt) throw new ApiError(409, 'This question has already been graded');

  if (mode === 'submit') {
    const pending = await Submission.findOne({
      attemptId,
      questionId: item.questionId,
      mode: 'submit',
      status: { $in: ['queued', 'running'] },
      createdAt: { $gte: new Date(Date.now() - STALE_SUBMISSION_MS) },
    });
    if (pending) throw new ApiError(409, 'A submission is already being graded for this question');
  }

  const question = await Question.findById(item.questionId);
  if (!question) throw new ApiError(404, 'Question not found');

  // 'custom' is a single ad-hoc run against candidate-supplied stdin (like
  // LeetCode's "Testcase" panel) — there's no expected output to grade
  // against, the candidate just wants to see what their code prints.
  const testCases =
    mode === 'submit'
      ? question.testCases
      : mode === 'custom'
        ? [{ input: customInput || '', expectedOutput: '', isHidden: false }]
        : question.testCases.filter((tc) => !tc.isHidden);
  if (testCases.length === 0) throw new ApiError(400, 'No test cases available to run against');

  const submission = await Submission.create({
    attemptId,
    questionId: item.questionId,
    candidateId,
    mode,
    language,
    code,
    customInput: mode === 'custom' ? customInput || '' : undefined,
    testCasesTotal: testCases.length,
  });

  await enqueueSubmission({
    submissionId: submission._id.toString(),
    language,
    code,
    driverCode: question.driverCode?.[language] || '',
    testCases: testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isHidden: tc.isHidden,
    })),
    timeLimitMs: question.timeLimitMs,
    memoryLimitMb: question.memoryLimitMb,
  });

  return { submissionId: submission._id, status: submission.status };
};

// Candidate-safe view — hidden test cases only ever reveal pass/fail, never
// their input/expected/actual output.
export const getSubmission = async (id, candidateId) => {
  const submission = await Submission.findOne({ _id: id, candidateId });
  if (!submission) throw new ApiError(404, 'Submission not found');

  return {
    _id: submission._id,
    status: submission.status,
    mode: submission.mode,
    language: submission.language,
    code: submission.code,
    testCasesPassed: submission.testCasesPassed,
    testCasesTotal: submission.testCasesTotal,
    errorMessage: submission.errorMessage,
    verdicts: submission.verdicts.map((v) =>
      v.isHidden
        ? { passed: v.passed, isHidden: true }
        : {
            input: v.input,
            expectedOutput: v.expectedOutput,
            actualOutput: v.actualOutput,
            passed: v.passed,
            runtimeMs: v.runtimeMs,
            isHidden: false,
          }
    ),
  };
};

// Called only from the internal worker-callback route (secret-guarded).
export const handleWorkerResult = async (
  submissionId,
  { status, verdicts, testCasesPassed, testCasesTotal, errorMessage }
) => {
  const submission = await Submission.findById(submissionId);
  if (!submission) throw new ApiError(404, 'Submission not found');

  submission.status = status;
  submission.verdicts = verdicts;
  submission.testCasesPassed = testCasesPassed;
  submission.testCasesTotal = testCasesTotal || submission.testCasesTotal;
  submission.errorMessage = errorMessage;
  await submission.save();

  if (status === 'completed' && submission.mode === 'submit') {
    await attemptService.resolveCodingSubmission({
      attemptId: submission.attemptId,
      questionId: submission.questionId,
      submissionId: submission._id,
      testCasesPassed,
      testCasesTotal: submission.testCasesTotal,
    });
  }

  return submission;
};
