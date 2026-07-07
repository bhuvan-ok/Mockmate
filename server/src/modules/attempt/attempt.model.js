import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    type: { type: String, enum: ['mcq', 'coding'], required: true },
    difficultyAtSelection: { type: Number, required: true },

    // MCQ
    selectedOptionIndex: { type: Number, default: null },
    isCorrect: { type: Boolean, default: null },

    // Coding
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', default: null },
    testCasesPassed: { type: Number, default: null },
    testCasesTotal: { type: Number, default: null },

    score: { type: Number, default: 0 }, // 0..100, normalized either way
    answeredAt: { type: Date, default: null },
  },
  { _id: false }
);

const roundSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['mcq', 'coding'], required: true },
    durationSec: { type: Number, required: true },
    targetQuestionCount: { type: Number, required: true },
    tags: [{ type: String }],

    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    startedAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },

    usedQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    items: [itemSchema],
    roundScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    interviewSetId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSet', required: true },
    status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },

    ratingBefore: { type: Number, required: true },
    ratingLive: { type: Number, required: true },

    rounds: [roundSchema],
    currentRoundIndex: { type: Number, default: 0 },

    integrityFlags: {
      tabSwitchCount: { type: Number, default: 0 },
      pasteCount: { type: Number, default: 0 },
    },

    overallScore: { type: Number, default: null },
    completedAt: { type: Date, default: null },
    aiFeedback: { type: String, default: '' }, // cached so Gemini isn't re-called on every report view
  },
  { timestamps: true }
);

export const Attempt = mongoose.model('Attempt', attemptSchema);
