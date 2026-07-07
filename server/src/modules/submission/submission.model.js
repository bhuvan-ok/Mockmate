import mongoose from 'mongoose';

const verdictSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
    actualOutput: { type: String, default: '' },
    passed: { type: Boolean, required: true },
    // AC = Accepted, WA = Wrong Answer, TLE = Time Limit Exceeded,
    // RE = Runtime Error, MLE = Memory Limit Exceeded, CE = Compilation
    // Error, OLE = Output Limit Exceeded — same vocabulary real judges use,
    // computed by the worker (worker/src/runner.js).
    verdictType: {
      type: String,
      enum: ['AC', 'WA', 'TLE', 'RE', 'MLE', 'CE', 'OLE'],
      default: 'WA',
    },
    runtimeMs: { type: Number, default: 0 },
    isHidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    mode: { type: String, enum: ['run', 'submit', 'custom'], required: true },
    language: { type: String, enum: ['javascript', 'cpp'], required: true },
    code: { type: String, required: true },
    customInput: { type: String, default: '' },

    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'error'],
      default: 'queued',
    },
    verdicts: [verdictSchema],
    testCasesPassed: { type: Number, default: 0 },
    testCasesTotal: { type: Number, default: 0 },
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Submission = mongoose.model('Submission', submissionSchema);
