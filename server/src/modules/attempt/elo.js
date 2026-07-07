const K_FACTOR = 32;
const MIN_RATING = 800;
const MAX_RATING = 2400;

const clamp = (value) => Math.max(MIN_RATING, Math.min(MAX_RATING, value));

// Standard Elo expected-score formula: probability the candidate "beats" this
// question's difficulty, given the current rating gap.
export const expectedScore = (candidateRating, questionDifficulty) =>
  1 / (1 + 10 ** ((questionDifficulty - candidateRating) / 400));

// actualScore is 1/0 for MCQ (correct/incorrect) or a 0..1 fraction of test
// cases passed for coding questions — partial credit shifts rating less than
// a full pass/fail would.
export const updateRating = (candidateRating, questionDifficulty, actualScore) => {
  const expected = expectedScore(candidateRating, questionDifficulty);
  const updated = candidateRating + K_FACTOR * (actualScore - expected);
  return Math.round(clamp(updated));
};

// Picks the pool question whose difficulty is closest to the candidate's
// current rating — this is what makes each next question "adaptive."
// Ties are broken randomly so repeat attempts don't always see the same order.
export const pickClosestByDifficulty = (candidateRating, pool) => {
  if (pool.length === 0) return null;

  let minDistance = Infinity;
  let candidates = [];

  for (const question of pool) {
    const distance = Math.abs(question.difficulty - candidateRating);
    if (distance < minDistance) {
      minDistance = distance;
      candidates = [question];
    } else if (distance === minDistance) {
      candidates.push(question);
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
};
