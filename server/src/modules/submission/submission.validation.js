import { z } from 'zod';

export const createSubmissionSchema = z.object({
  body: z.object({
    attemptId: z.string().length(24),
    language: z.enum(['javascript', 'cpp']),
    code: z.string().min(1, 'Code cannot be empty').max(20000),
    mode: z.enum(['run', 'submit', 'custom']),
    // Only used when mode is 'custom' — a candidate-supplied stdin for a
    // single ad-hoc run against their own input, same as LeetCode's
    // "Testcase" panel. Ignored otherwise.
    customInput: z.string().max(10000).optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const submissionIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().length(24) }),
  query: z.object({}).optional(),
});

export const workerResultSchema = z.object({
  body: z.object({
    status: z.enum(['completed', 'error']),
    verdicts: z
      .array(
        z.object({
          input: z.string().optional().default(''),
          expectedOutput: z.string().optional().default(''),
          actualOutput: z.string().optional().default(''),
          passed: z.boolean(),
          verdictType: z.enum(['AC', 'WA', 'TLE', 'RE', 'MLE', 'CE', 'OLE']).optional().default('WA'),
          runtimeMs: z.number().optional().default(0),
          isHidden: z.boolean().optional().default(false),
        })
      )
      .optional()
      .default([]),
    testCasesPassed: z.number().int().min(0).optional().default(0),
    testCasesTotal: z.number().int().min(0).optional().default(0),
    errorMessage: z.string().optional().default(''),
  }),
  params: z.object({ id: z.string().length(24) }),
  query: z.object({}).optional(),
});
