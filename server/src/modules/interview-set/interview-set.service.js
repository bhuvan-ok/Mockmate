import { InterviewSet } from './interview-set.model.js';
import { ApiError } from '../../utils/ApiError.js';

export const createInterviewSet = async (data, adminId) => {
  return InterviewSet.create({ ...data, createdBy: adminId });
};

export const listInterviewSetsAdmin = async () => {
  return InterviewSet.find({ isActive: true }).sort({ createdAt: -1 });
};

export const getInterviewSetAdmin = async (id) => {
  const set = await InterviewSet.findById(id);
  if (!set || !set.isActive) throw new ApiError(404, 'Interview set not found');
  return set;
};

export const updateInterviewSet = async (id, data) => {
  const set = await InterviewSet.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!set) throw new ApiError(404, 'Interview set not found');
  return set;
};

export const deleteInterviewSet = async (id) => {
  const set = await InterviewSet.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!set) throw new ApiError(404, 'Interview set not found');
  return set;
};

// Candidate-facing list: round shape only, no question IDs exposed up front.
export const listInterviewSetsForCandidate = async () => {
  const sets = await InterviewSet.find({ isActive: true }).sort({ createdAt: -1 });
  return sets.map((set) => ({
    _id: set._id,
    title: set.title,
    description: set.description,
    rounds: set.rounds.map((r) => ({
      type: r.type,
      durationSec: r.durationSec,
      questionCount: r.questionCount,
      tags: r.tags,
    })),
  }));
};

export const getInterviewSetForCandidate = async (id) => {
  const set = await InterviewSet.findById(id);
  if (!set || !set.isActive) throw new ApiError(404, 'Interview set not found');
  return {
    _id: set._id,
    title: set.title,
    description: set.description,
    rounds: set.rounds.map((r) => ({
      type: r.type,
      durationSec: r.durationSec,
      questionCount: r.questionCount,
      tags: r.tags,
    })),
  };
};
