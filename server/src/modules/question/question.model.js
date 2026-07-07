import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['mcq', 'coding'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    difficulty: { type: Number, required: true, min: 800, max: 2400 },
    tags: [{ type: String, trim: true }],
    // Handwritten, LeetCode-style progressive hints (candidate reveals them
    // one at a time, no AI call involved) — kept short deliberately, 1-2 per
    // question is the norm.
    hints: [{ type: String, trim: true }],

    // MCQ-only fields
    options: {
      type: [optionSchema],
      validate: {
        validator: function (arr) {
          return this.type !== 'mcq' || arr.length >= 2;
        },
        message: 'MCQ questions need at least 2 options',
      },
    },
    correctOptionIndex: { type: Number },
    negativeMarking: { type: Boolean, default: false },

    // Coding-only fields — starterCode is ONLY the function stub shown to the
    // candidate (LeetCode-style, zero imports/includes in either language);
    // driverCode is a hidden per-language harness that parses stdin, calls
    // the candidate's function, and prints the result. For cpp, driverCode
    // also owns every #include/using line, with a `/*__CANDIDATE_CODE__*/`
    // marker showing where the candidate's function gets spliced in — this
    // keeps all imports out of the user-visible/editable runtime for both
    // languages. The worker composes the final source from code + driverCode
    // before compile/run — candidates never see or edit driverCode.
    starterCode: {
      javascript: { type: String, default: '' },
      cpp: { type: String, default: '' },
    },
    driverCode: {
      javascript: { type: String, default: '' },
      cpp: { type: String, default: '' },
    },
    testCases: {
      type: [testCaseSchema],
      validate: {
        validator: function (arr) {
          return this.type !== 'coding' || arr.length >= 1;
        },
        message: 'Coding questions need at least 1 test case',
      },
    },
    // The worker execs into a warm per-submission container, but on some
    // Windows/Docker Desktop setups every single `docker` CLI invocation
    // (even `docker ps`) carries several seconds of fixed overhead — this
    // default absorbs that reliably. Production on a native Linux Docker
    // host has no equivalent tax and could safely run much tighter.
    timeLimitMs: { type: Number, default: 10000 },
    memoryLimitMb: { type: Number, default: 128 },
    // 'exact' = trimmed string match (default). 'float' = tokenize both
    // outputs on whitespace and compare numerically with a small epsilon —
    // for questions whose expected output is numeric, so "3" and "3.0"
    // both grade as correct. Falls back to exact match if either side has
    // a non-numeric token.
    outputComparator: { type: String, enum: ['exact', 'float'], default: 'exact' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Question = mongoose.model('Question', questionSchema);
