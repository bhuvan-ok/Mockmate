import { Question } from './question.model.js';
import { ApiError } from '../../utils/ApiError.js';

export const createQuestion = async (data, adminId) => {
  return Question.create({ ...data, createdBy: adminId });
};

export const listQuestionsAdmin = async ({ type, tag, page = 1, limit = 20 }) => {
  const filter = { isActive: true };
  if (type) filter.type = type;
  if (tag) filter.tags = tag;

  const skip = (page - 1) * limit;
  const [questions, total] = await Promise.all([
    Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Question.countDocuments(filter),
  ]);

  return { questions, total, page: Number(page), limit: Number(limit) };
};

export const getQuestionAdmin = async (id) => {
  const question = await Question.findById(id);
  if (!question || !question.isActive) throw new ApiError(404, 'Question not found');
  return question;
};

export const updateQuestion = async (id, data) => {
  const question = await Question.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!question) throw new ApiError(404, 'Question not found');
  return question;
};

export const deleteQuestion = async (id) => {
  const question = await Question.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!question) throw new ApiError(404, 'Question not found');
  return question;
};

// Strips fields a candidate must never see before/during an attempt:
// correct answer, hidden test case expected output, which cases are hidden.
export const toCandidateSafeQuestion = (question) => {
  const q = question.toObject ? question.toObject() : question;

  const safe = {
    _id: q._id,
    type: q.type,
    title: q.title,
    description: q.description,
    difficulty: q.difficulty,
    tags: q.tags,
    hints: q.hints || [],
  };

  if (q.type === 'mcq') {
    safe.options = q.options.map((o) => ({ text: o.text }));
  }

  if (q.type === 'coding') {
    safe.starterCode = q.starterCode;
    safe.timeLimitMs = q.timeLimitMs;
    safe.memoryLimitMb = q.memoryLimitMb;
    safe.testCases = q.testCases
      .filter((tc) => !tc.isHidden)
      .map((tc) => ({ input: tc.input, expectedOutput: tc.expectedOutput }));
    safe.hiddenTestCaseCount = q.testCases.filter((tc) => tc.isHidden).length;
  }

  return safe;
};
