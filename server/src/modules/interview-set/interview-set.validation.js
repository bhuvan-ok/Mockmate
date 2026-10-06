import { z } from 'zod';

const roundSchema = z.object({
  type: z.enum(['mcq', 'coding']),
  durationSec: z.number().int().min(30),
  questionCount: z.number().int().min(1),
  tags: z.array(z.string().trim()).optional().default([]),
});

const createBodySchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().optional().default(''),
  rounds: z.array(roundSchema).min(1),
});

export const createInterviewSetSchema = z.object({
  body: createBodySchema,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

// Partial derivation of the create schema — every field optional so a PUT
// can update just a subset, but `rounds` (when present) still goes through
// the same per-round validation as create instead of being schema-less.
export const updateInterviewSetSchema = z.object({
  body: createBodySchema.partial(),
  params: z.object({ id: z.string().length(24) }),
  query: z.object({}).optional(),
});

export const interviewSetIdParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ id: z.string().length(24) }),
  query: z.object({}).optional(),
});
