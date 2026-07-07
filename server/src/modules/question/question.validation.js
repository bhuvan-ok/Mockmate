import { z } from 'zod';

const baseFields = {
  title: z.string().trim().min(3),
  description: z.string().trim().min(10),
  difficulty: z.number().min(800).max(2400),
  tags: z.array(z.string().trim()).optional().default([]),
  // Handwritten, LeetCode-style hints — short and few by design (1-2 is typical).
  hints: z.array(z.string().trim().min(1)).max(5).optional().default([]),
};

const mcqSchema = z.object({
  type: z.literal('mcq'),
  ...baseFields,
  options: z.array(z.object({ text: z.string().trim().min(1) })).min(2),
  correctOptionIndex: z.number().int().min(0),
  negativeMarking: z.boolean().optional().default(false),
});

const codingSchema = z.object({
  type: z.literal('coding'),
  ...baseFields,
  starterCode: z
    .object({ javascript: z.string().optional(), cpp: z.string().optional() })
    .optional()
    .default({}),
  // Hidden harness appended to the candidate's function-only submission
  // before compile/run — parses stdin, calls their function, prints output.
  // Never shown to the candidate; keeps starterCode limited to just the
  // function stub they're meant to implement.
  driverCode: z
    .object({ javascript: z.string().optional(), cpp: z.string().optional() })
    .optional()
    .default({}),
  testCases: z
    .array(
      z.object({
        input: z.string().optional().default(''),
        expectedOutput: z.string().min(1),
        isHidden: z.boolean().optional().default(false),
      })
    )
    .min(1),
  timeLimitMs: z.number().int().positive().max(15000).optional().default(6000),
  memoryLimitMb: z.number().int().positive().max(512).optional().default(128),
});

export const createQuestionSchema = z.object({
  body: z.discriminatedUnion('type', [mcqSchema, codingSchema]).superRefine((data, ctx) => {
    if (data.type === 'mcq' && data.correctOptionIndex >= data.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correctOptionIndex must reference a valid option',
        path: ['correctOptionIndex'],
      });
    }
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateQuestionSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ id: z.string().length(24) }),
  query: z.object({}).optional(),
});

export const questionIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().length(24) }),
  query: z.object({}).optional(),
});
