import { z } from 'zod';

const roundSchema = z.object({
  type: z.enum(['mcq', 'coding']),
  durationSec: z.number().int().min(30),
  questionCount: z.number().int().min(1),
  tags: z.array(z.string().trim()).optional().default([]),
});

export const createInterviewSetSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3),
    description: z.string().trim().optional().default(''),
    rounds: z.array(roundSchema).min(1),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateInterviewSetSchema = z.object({
  body: z.object({}).passthrough(),
  params: z.object({ id: z.string().length(24) }),
  query: z.object({}).optional(),
});

export const interviewSetIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().length(24) }),
  query: z.object({}).optional(),
});
