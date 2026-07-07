import * as attemptService from '../attempt/attempt.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateText } from './gemini.client.js';

// AI is used for exactly one thing now: a post-round plain-language feedback
// summary, generated once the whole attempt is scored. In-round hints are
// handwritten per question (see question.model.js `hints`) and served
// directly off the candidate-safe question payload — no AI call, no gating,
// no per-question network round-trip.
const buildFeedbackPrompt = (attempt) => {
  const roundsSummary = attempt.rounds
    .map(
      (r, i) =>
        `Round ${i + 1} (${r.type}): scored ${r.roundScore}/100 across ${
          r.items.filter((it) => it.answeredAt).length
        }/${r.targetQuestionCount} questions answered.`
    )
    .join('\n');

  return [
    'You are a mock-interview coach writing brief, constructive feedback for a candidate who just finished a timed mock interview.',
    `Overall score: ${attempt.overallScore}/100.`,
    `Skill rating moved from ${attempt.ratingBefore} to ${attempt.ratingLive} during this attempt.`,
    roundsSummary,
    `Tab switches during the test: ${attempt.integrityFlags.tabSwitchCount}. Paste events: ${attempt.integrityFlags.pasteCount}.`,
    'Write a short (under 120 words), encouraging but honest performance summary covering strengths, one concrete area to improve, and a suggested next difficulty level to try.',
  ].join('\n\n');
};

export const getFeedback = async (attemptId, candidateId) => {
  const attempt = await attemptService.getAttemptDoc(attemptId, candidateId);
  if (attempt.status !== 'completed') {
    throw new ApiError(400, 'Feedback is available once the attempt is completed');
  }

  if (attempt.aiFeedback) return { feedback: attempt.aiFeedback, cached: true };

  const feedback = await generateText(buildFeedbackPrompt(attempt));
  attempt.aiFeedback = feedback;
  await attempt.save();

  return { feedback, cached: false };
};
