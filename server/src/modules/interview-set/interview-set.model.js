import mongoose from 'mongoose';

const roundSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['mcq', 'coding'], required: true },
    durationSec: { type: Number, required: true, min: 30 },
    // Adaptive rounds pull from a question pool rather than a fixed list —
    // the attempt engine picks each next question by matching the candidate's
    // live Elo rating against available difficulties (see attempt/elo.js).
    questionCount: { type: Number, required: true, min: 1 },
    tags: [{ type: String, trim: true }],
  },
  { _id: false }
);

const interviewSetSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    rounds: {
      type: [roundSchema],
      validate: { validator: (arr) => arr.length >= 1, message: 'At least one round is required' },
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const InterviewSet = mongoose.model('InterviewSet', interviewSetSchema);
