import { z } from 'zod';

export const startAttemptSchema = z.object({
  body: z.object({ interviewSetId: z.string().length(24) }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const attemptIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ attemptId: z.string().length(24) }),
  query: z.object({}).optional(),
});

export const mcqAnswerSchema = z.object({
  body: z.object({ selectedOptionIndex: z.number().int().min(0) }),
  params: z.object({ attemptId: z.string().length(24) }),
  query: z.object({}).optional(),
});

export const integrityEventSchema = z.object({
  body: z.object({ type: z.enum(['tab-switch', 'paste']) }),
  params: z.object({ attemptId: z.string().length(24) }),
  query: z.object({}).optional(),
});
