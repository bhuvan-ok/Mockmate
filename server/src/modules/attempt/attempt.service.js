import { Attempt } from './attempt.model.js';
import { InterviewSet } from '../interview-set/interview-set.model.js';
import { Question } from '../question/question.model.js';
import { User } from '../auth/user.model.js';
import { toCandidateSafeQuestion } from '../question/question.service.js';
import { updateRating, pickClosestByDifficulty } from './elo.js';
import { ApiError } from '../../utils/ApiError.js';

// Pulls the next question for a round from the pool of not-yet-used questions
// matching the round's type/tags, choosing the one closest to the candidate's
// current live rating. Returns false if the pool is exhausted early.
const pickAndPushNextQuestion = async (attempt, roundIndex) => {
  const round = attempt.rounds[roundIndex];

  const filter = {
    type: round.type,
    isActive: true,
    _id: { $nin: round.usedQuestionIds },
  };
  if (round.tags?.length) filter.tags = { $in: round.tags };

  const pool = await Question.find(filter);
  const picked = pickClosestByDifficulty(attempt.ratingLive, pool);
  if (!picked) return false;

  round.usedQuestionIds.push(picked._id);
  round.items.push({
    questionId: picked._id,
    type: picked.type,
    difficultyAtSelection: picked.difficulty,
  });
  return true;
};

const startRound = async (attempt, roundIndex) => {
  const round = attempt.rounds[roundIndex];
  round.status = 'in-progress';
  round.startedAt = new Date();
  round.endsAt = new Date(Date.now() + round.durationSec * 1000);
  const added = await pickAndPushNextQuestion(attempt, roundIndex);
  if (!added) {
    // No questions available for this round's type/tags at all.
    round.status = 'completed';
    round.roundScore = 0;
  }
};

const completeRound = async (attempt, roundIndex) => {
  const round = attempt.rounds[roundIndex];
  round.status = 'completed';
  // Unanswered/unresolved items score 0 but still count in the denominator —
  // mirrors a real auto-submit-on-timeout: skipped questions cost you.
  const earnedTotal = round.items.reduce((sum, item) => sum + (item.score || 0), 0);
  round.roundScore = round.targetQuestionCount
    ? Math.round(earnedTotal / round.targetQuestionCount)
    : 0;

  const nextIndex = roundIndex + 1;
  if (nextIndex < attempt.rounds.length) {
    attempt.currentRoundIndex = nextIndex;
    await startRound(attempt, nextIndex);
  } else {
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    const scoredRounds = attempt.rounds.filter((r) => r.status === 'completed');
    attempt.overallScore = scoredRounds.length
      ? Math.round(scoredRounds.reduce((sum, r) => sum + r.roundScore, 0) / scoredRounds.length)
      : 0;
    await User.findByIdAndUpdate(attempt.candidateId, { rating: attempt.ratingLive });
  }
};

const advanceAfterAnswer = async (attempt, roundIndex) => {
  const round = attempt.rounds[roundIndex];
  const stillHasTime = round.endsAt > new Date();
  const stillNeedsQuestions = round.items.length < round.targetQuestionCount;

  if (stillHasTime && stillNeedsQuestions) {
    const added = await pickAndPushNextQuestion(attempt, roundIndex);
    if (added) return;
  }
  await completeRound(attempt, roundIndex);
};

// Lazy expiry check — a safety net alongside the cron sweeper so a round
// never reads as "in progress" past its deadline even if the sweep hasn't
// ticked yet. Mutates and does NOT persist; caller is responsible for
// committing the change atomically (see commitAttempt below).
const checkAndHandleExpiry = async (attempt) => {
  if (attempt.status === 'completed') return false;
  const round = attempt.rounds[attempt.currentRoundIndex];
  if (round.status === 'in-progress' && round.endsAt && round.endsAt <= new Date()) {
    await completeRound(attempt, attempt.currentRoundIndex);
    return true;
  }
  return false;
};

// Captures the fields used as an optimistic-concurrency guard before any
// in-memory mutation begins. `status` and `currentRoundIndex` are exactly
// the fields every terminal-state transition below changes, so a mismatch
// at commit time means another path (cron sweep, lazy expiry check, or the
// worker's result callback) already raced ahead and terminalized this
// round/attempt first.
const captureGuard = (attempt) => ({
  status: attempt.status,
  currentRoundIndex: attempt.currentRoundIndex,
});

// Persists whatever mutations were made to `attempt` in memory via a single
// conditional atomic update, guarded by the state captured before the
// read-modify-write began. Returns the updated document, or null if another
// path already changed status/currentRoundIndex first — a lost race, not an
// error, since the doc's terminal state was already established by
// whichever path won and the loser's now-stale mutation must not overwrite
// it. Deliberately excludes `integrityFlags`, which is owned exclusively by
// logIntegrityEvent's own atomic $inc and must never be clobbered by a
// stale in-memory copy read before that increment happened.
const commitAttempt = async (attempt, guard) => {
  const snapshot = attempt.toObject();
  return Attempt.findOneAndUpdate(
    { _id: attempt._id, status: guard.status, currentRoundIndex: guard.currentRoundIndex },
    {
      $set: {
        status: snapshot.status,
        completedAt: snapshot.completedAt,
        currentRoundIndex: snapshot.currentRoundIndex,
        ratingLive: snapshot.ratingLive,
        overallScore: snapshot.overallScore,
        rounds: snapshot.rounds,
      },
    },
    { new: true }
  );
};

// Builds a read-only review entry for a question the candidate has already
// answered in the current round — lets the client offer Prev/Next navigation
// across the round without letting anyone rewrite a locked-in answer (the
// adaptive engine already used that answer to pick the next question, so
// changing it after the fact would invalidate the rating update).
const buildHistoryEntry = async (item, index) => {
  const question = await Question.findById(item.questionId);
  const entry = {
    questionNumber: index + 1,
    question: toCandidateSafeQuestion(question),
    score: item.score,
    answeredAt: item.answeredAt,
  };

  if (item.type === 'mcq') {
    entry.selectedOptionIndex = item.selectedOptionIndex;
    entry.isCorrect = item.isCorrect;
    // Safe to reveal now — this exact question instance is already answered
    // and locked; the candidate can never see it again in this attempt.
    entry.correctOptionIndex = question.correctOptionIndex;
  } else {
    entry.submissionId = item.submissionId;
    entry.testCasesPassed = item.testCasesPassed;
    entry.testCasesTotal = item.testCasesTotal;
  }

  return entry;
};

const buildCurrentStateResponse = async (attempt) => {
  if (attempt.status === 'completed') {
    return { attemptId: attempt._id, status: 'completed' };
  }

  const roundIndex = attempt.currentRoundIndex;
  const round = attempt.rounds[roundIndex];
  const currentItem = round.items[round.items.length - 1];
  const question = await Question.findById(currentItem.questionId);

  const answeredItems = round.items.slice(0, -1);
  const history = await Promise.all(answeredItems.map((item, i) => buildHistoryEntry(item, i)));

  return {
    attemptId: attempt._id,
    status: 'in-progress',
    roundIndex,
    roundType: round.type,
    questionNumber: round.items.length,
    targetQuestionCount: round.targetQuestionCount,
    timeRemainingSec: Math.max(0, Math.floor((round.endsAt - Date.now()) / 1000)),
    question: toCandidateSafeQuestion(question),
    alreadyAnswered: Boolean(currentItem.answeredAt),
    history,
  };
};

export const startAttempt = async (candidateId, interviewSetId) => {
  const interviewSet = await InterviewSet.findById(interviewSetId);
  if (!interviewSet || !interviewSet.isActive) throw new ApiError(404, 'Interview set not found');

  const existing = await Attempt.findOne({ candidateId, interviewSetId, status: 'in-progress' });
  if (existing) return buildCurrentStateResponse(existing);

  const candidate = await User.findById(candidateId);

  const attempt = new Attempt({
    candidateId,
    interviewSetId,
    ratingBefore: candidate.rating,
    ratingLive: candidate.rating,
    rounds: interviewSet.rounds.map((r) => ({
      type: r.type,
      durationSec: r.durationSec,
      targetQuestionCount: r.questionCount,
      tags: r.tags,
    })),
  });

  await startRound(attempt, 0);
  await attempt.save();
  return buildCurrentStateResponse(attempt);
};

// Shared by submission.service.js and ai.service.js so both act on the exact
// same "current question" the candidate is looking at, without duplicating
// the attempt/round/item lookup logic.
export const getCurrentItemContext = async (attemptId, candidateId) => {
  const attempt = await Attempt.findOne({ _id: attemptId, candidateId });
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  if (attempt.status === 'completed') throw new ApiError(409, 'This attempt has already ended');

  const round = attempt.rounds[attempt.currentRoundIndex];
  const item = round.items[round.items.length - 1];
  return { attempt, round, item };
};

export const getCurrentState = async (attemptId, candidateId) => {
  const attempt = await Attempt.findOne({ _id: attemptId, candidateId });
  if (!attempt) throw new ApiError(404, 'Attempt not found');

  const guard = captureGuard(attempt);
  const expired = await checkAndHandleExpiry(attempt);
  if (!expired) return buildCurrentStateResponse(attempt);

  const committed = await commitAttempt(attempt, guard);
  // Lost race: the cron sweep (or a concurrent request for the same
  // attempt) already expired this round first — its write is authoritative,
  // so re-read rather than clobber it with our now-stale in-memory copy.
  return buildCurrentStateResponse(committed || (await Attempt.findById(attemptId)));
};

export const submitMcqAnswer = async (attemptId, candidateId, selectedOptionIndex) => {
  const attempt = await Attempt.findOne({ _id: attemptId, candidateId });
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  if (attempt.status === 'completed') throw new ApiError(409, 'This attempt has already ended');

  const guard = captureGuard(attempt);

  if (await checkAndHandleExpiry(attempt)) {
    // Best-effort: whether this commit lands or a racing sweep/lazy-check
    // already beat it to the same expiry, the round is over either way.
    await commitAttempt(attempt, guard);
    throw new ApiError(409, 'This round has already ended');
  }

  const round = attempt.rounds[attempt.currentRoundIndex];
  if (round.type !== 'mcq') throw new ApiError(400, 'Current round is not an MCQ round');

  const item = round.items[round.items.length - 1];
  if (item.answeredAt) throw new ApiError(409, 'This question has already been answered');

  const question = await Question.findById(item.questionId);
  if (selectedOptionIndex < 0 || selectedOptionIndex >= question.options.length) {
    throw new ApiError(400, 'selectedOptionIndex is out of range for this question');
  }
  const isCorrect = selectedOptionIndex === question.correctOptionIndex;
  const actualScore = isCorrect ? 1 : 0;

  item.selectedOptionIndex = selectedOptionIndex;
  item.isCorrect = isCorrect;
  item.score = isCorrect ? 100 : question.negativeMarking ? -25 : 0;
  item.answeredAt = new Date();

  attempt.ratingLive = updateRating(attempt.ratingLive, question.difficulty, actualScore);
  await advanceAfterAnswer(attempt, attempt.currentRoundIndex);

  const committed = await commitAttempt(attempt, guard);
  if (!committed) throw new ApiError(409, 'This round has already ended');

  return buildCurrentStateResponse(committed);
};

// Called by the submission module once the sandbox worker posts back a
// verdict for a "submit" (not "run") coding action.
export const resolveCodingSubmission = async ({
  attemptId,
  questionId,
  submissionId,
  testCasesPassed,
  testCasesTotal,
}) => {
  const attempt = await Attempt.findById(attemptId);
  if (!attempt || attempt.status === 'completed') return;

  const round = attempt.rounds[attempt.currentRoundIndex];
  const item = round.items.find(
    (i) => i.questionId.toString() === questionId.toString() && !i.answeredAt
  );
  if (!item) return; // stale or duplicate callback

  const guard = captureGuard(attempt);

  const question = await Question.findById(questionId);
  const actualScore = testCasesTotal > 0 ? testCasesPassed / testCasesTotal : 0;

  item.submissionId = submissionId;
  item.testCasesPassed = testCasesPassed;
  item.testCasesTotal = testCasesTotal;
  item.score = Math.round(actualScore * 100);
  item.answeredAt = new Date();

  attempt.ratingLive = updateRating(attempt.ratingLive, question.difficulty, actualScore);
  await advanceAfterAnswer(attempt, attempt.currentRoundIndex);

  // Lost race is a safe no-op here: another path (the cron sweep, or a
  // duplicate/late worker callback for the same submission) already
  // terminalized this round/attempt first, so its write already stands —
  // there's nothing left to apply this verdict to.
  await commitAttempt(attempt, guard);
};

// Candidate-initiated early finish — the candidate can walk away from a
// timed attempt at any point instead of waiting out the clock. Behaves like
// an early timeout: the current round is scored on whatever was answered
// (skipped/revealed-but-unanswered questions still cost you, same as
// completeRound), rounds never reached stay 'pending' and are excluded from
// the overall average — nothing "counts against" a round you never started.
export const endAttemptEarly = async (attemptId, candidateId) => {
  const attempt = await Attempt.findOne({ _id: attemptId, candidateId });
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  if (attempt.status === 'completed') throw new ApiError(409, 'This attempt has already ended');

  const currentRound = attempt.rounds[attempt.currentRoundIndex];
  if (currentRound.status === 'in-progress') {
    currentRound.status = 'completed';
    const earnedTotal = currentRound.items.reduce((sum, item) => sum + (item.score || 0), 0);
    currentRound.roundScore = currentRound.targetQuestionCount
      ? Math.round(earnedTotal / currentRound.targetQuestionCount)
      : 0;
  }

  attempt.status = 'completed';
  attempt.completedAt = new Date();
  const scoredRounds = attempt.rounds.filter((r) => r.status === 'completed');
  attempt.overallScore = scoredRounds.length
    ? Math.round(scoredRounds.reduce((sum, r) => sum + r.roundScore, 0) / scoredRounds.length)
    : 0;
  await User.findByIdAndUpdate(attempt.candidateId, { rating: attempt.ratingLive });

  await attempt.save();
  return { attemptId: attempt._id, status: 'completed' };
};

export const logIntegrityEvent = async (attemptId, candidateId, type) => {
  const field = type === 'paste' ? 'integrityFlags.pasteCount' : 'integrityFlags.tabSwitchCount';
  const attempt = await Attempt.findOneAndUpdate(
    { _id: attemptId, candidateId },
    { $inc: { [field]: 1 } },
    { new: true }
  );
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  return attempt.integrityFlags;
};

// Used by ai.service.js — feedback only makes sense once everything is scored.
export const getAttemptDoc = async (attemptId, candidateId) => {
  const attempt = await Attempt.findOne({ _id: attemptId, candidateId });
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  return attempt;
};

export const getReport = async (attemptId, candidateId) => {
  const attempt = await Attempt.findOne({ _id: attemptId, candidateId }).populate(
    'interviewSetId',
    'title'
  );
  if (!attempt) throw new ApiError(404, 'Attempt not found');

  return {
    attemptId: attempt._id,
    interviewSet: attempt.interviewSetId,
    status: attempt.status,
    ratingBefore: attempt.ratingBefore,
    ratingAfter: attempt.ratingLive,
    overallScore: attempt.overallScore,
    integrityFlags: attempt.integrityFlags,
    rounds: attempt.rounds.map((r) => ({
      type: r.type,
      roundScore: r.roundScore,
      questionsAnswered: r.items.filter((i) => i.answeredAt).length,
      targetQuestionCount: r.targetQuestionCount,
      tags: r.tags,
    })),
  };
};

// Runs on a schedule (see jobs/attemptSweeper.js) — catches rounds whose
// deadline passed while nobody had the app open to trigger the lazy check.
export const sweepExpiredRounds = async () => {
  const now = new Date();
  const candidates = await Attempt.find({
    status: 'in-progress',
    'rounds.status': 'in-progress',
    'rounds.endsAt': { $lte: now },
  });

  let expiredCount = 0;
  for (const attempt of candidates) {
    const guard = captureGuard(attempt);
    const expired = await checkAndHandleExpiry(attempt);
    if (!expired) continue;

    // Lost race is a safe no-op: a concurrent lazy expiry check (from a
    // GET request) or the worker's callback finishing the round's last item
    // already terminalized this attempt first.
    const committed = await commitAttempt(attempt, guard);
    if (committed) expiredCount++;
  }
  return expiredCount;
};

// Candidate-facing history — otherwise a completed attempt's report becomes
// unreachable the moment the candidate navigates away from the auto-redirect.
export const listMyAttempts = async (candidateId, { page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [attempts, total] = await Promise.all([
    Attempt.find({ candidateId })
      .populate('interviewSetId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Attempt.countDocuments({ candidateId }),
  ]);

  return {
    attempts: attempts.map((a) => ({
      attemptId: a._id,
      interviewSet: a.interviewSetId,
      status: a.status,
      overallScore: a.overallScore,
      ratingBefore: a.ratingBefore,
      ratingAfter: a.ratingLive,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
    })),
    total,
    page: Number(page),
    limit: Number(limit),
  };
};

export const listAttemptsAdmin = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [attempts, total] = await Promise.all([
    Attempt.find()
      .populate('candidateId', 'name email')
      .populate('interviewSetId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Attempt.countDocuments(),
  ]);
  return { attempts, total, page: Number(page), limit: Number(limit) };
};

export const getAttemptAdmin = async (id) => {
  const attempt = await Attempt.findById(id)
    .populate('candidateId', 'name email')
    .populate('interviewSetId', 'title');
  if (!attempt) throw new ApiError(404, 'Attempt not found');
  return attempt;
};
