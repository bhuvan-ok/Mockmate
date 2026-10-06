// Generates one large, TLE-forcing hidden test case per coding question:
// sized so a correct optimal-complexity solution finishes in milliseconds
// while a naive worse-complexity solution blows past the question's
// timeLimitMs. Inputs use a seeded PRNG (mulberry32) so reseeding always
// reproduces the exact same test data; expected outputs are computed here
// with a trusted reference implementation of each intended algorithm — at
// these sizes even an O(n^2) reference runs instantly.
//
// Sizes were calibrated by benchmarking real naive solutions against actual
// Docker (not just complexity math) — a first pass sized purely from
// theoretical ops/sec produced multi-MB test cases, some large enough to
// risk exceeding Upstash's free-tier per-request size limit. Live
// benchmarking showed genuinely naive solutions (e.g. splice()-heavy
// interval merging) are far slower per "operation" than raw arithmetic, so
// much smaller n was enough for a strong TLE margin — current sizes are the
// smallest each case that gave at least ~2x margin over a 10s time limit,
// verified against real optimal/naive solutions in worker/runner.js.

const mulberry32 = (seed) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

const bigTestCase = (input, expectedOutput) => ({ input, expectedOutput, isHidden: true });

// Longest Substring Without Repeating Characters — O(n) vs O(n^2)
export const genLongestSubstringCase = () => {
  const rng = mulberry32(1);
  const n = 150000;
  let s = '';
  for (let i = 0; i < n; i++) s += String.fromCharCode(97 + Math.floor(rng() * 26));
  let start = 0;
  let maxLen = 0;
  const lastIndex = new Map();
  for (let end = 0; end < s.length; end++) {
    const c = s[end];
    if (lastIndex.has(c) && lastIndex.get(c) >= start) start = lastIndex.get(c) + 1;
    lastIndex.set(c, end);
    maxLen = Math.max(maxLen, end - start + 1);
  }
  return bigTestCase(s, String(maxLen));
};

// Product of Array Except Self — O(n) vs O(n^2). Values are mostly 1 with a
// single distinguished value so the expected output is trivial to state
// exactly (no overflow risk at this array size) and the payload stays tiny.
export const genProductExceptSelfCase = () => {
  const rng = mulberry32(2);
  const n = 150000;
  const specialIdx = randInt(rng, 0, n - 1);
  const nums = new Array(n).fill(1);
  nums[specialIdx] = 7;
  const answer = nums.map((_, i) => (i === specialIdx ? 1 : 7));
  return bigTestCase(nums.join(' '), answer.join(' '));
};

// Longest Palindromic Substring — the intended solution is already O(n^2)
// (center expansion); a naive check-every-substring approach is O(n^3).
// n=7000 keeps the O(n^2) reference instant while making O(n^3) intractable.
export const genLongestPalindromeCase = () => {
  const rng = mulberry32(3);
  const n = 7000;
  const alphabet = 'abcd';
  let s = '';
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(rng() * alphabet.length)];
  let start = 0;
  let maxLen = 1;
  for (let i = 0; i < s.length; i++) {
    for (const [l0, r0] of [
      [i, i],
      [i, i + 1],
    ]) {
      let l = l0;
      let r = r0;
      while (l >= 0 && r < s.length && s[l] === s[r]) {
        l--;
        r++;
      }
      const len = r - l - 1;
      if (len > maxLen) {
        maxLen = len;
        start = l + 1;
      }
    }
  }
  return bigTestCase(s, s.substr(start, maxLen));
};

// Merge Intervals — O(n log n) sort-and-merge vs O(n^2) pairwise comparison.
// n=10000 is deliberately modest: a genuinely naive (repeated-scan-and-
// splice) implementation already took ~11.5s at n=8000 in benchmarking —
// splice() is itself O(n), so this class of naive solution is much slower
// than raw arithmetic per element.
export const genMergeIntervalsCase = () => {
  const rng = mulberry32(4);
  const n = 10000;
  const intervals = [];
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const start = cursor + randInt(rng, 0, 2);
    const end = start + randInt(rng, 1, 5);
    intervals.push([start, end]);
    cursor = start + randInt(rng, 1, 4);
  }
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of sorted) {
    if (merged.length && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    } else {
      merged.push([s, e]);
    }
  }
  const input = intervals.flat().join(' ');
  const expectedOutput = merged.map((pair) => pair.join(' ')).join(' ');
  return bigTestCase(input, expectedOutput);
};

// Kth Largest Element — O(n log n) sort (or O(n) quickselect) vs an O(n*k)
// repeated-selection approach, worst-cased by picking k ~= n/2. Values kept
// to 3 digits (magnitude doesn't affect operation count) to keep the
// payload compact.
export const genKthLargestCase = () => {
  const rng = mulberry32(5);
  const n = 180000;
  const nums = Array.from({ length: n }, () => randInt(rng, 1, 999));
  const k = Math.floor(n / 2);
  const sorted = [...nums].sort((a, b) => b - a);
  const input = `${nums.join(' ')}\n${k}`;
  return bigTestCase(input, String(sorted[k - 1]));
};

// Maximum Subarray (Kadane's) — O(n) vs O(n^2). Values kept to 2 digits to
// keep the payload compact.
export const genMaxSubArrayCase = () => {
  const rng = mulberry32(6);
  const n = 150000;
  const nums = Array.from({ length: n }, () => randInt(rng, -99, 99));
  let maxSoFar = nums[0];
  let maxEndingHere = nums[0];
  for (let i = 1; i < nums.length; i++) {
    maxEndingHere = Math.max(nums[i], maxEndingHere + nums[i]);
    maxSoFar = Math.max(maxSoFar, maxEndingHere);
  }
  return bigTestCase(nums.join(' '), String(maxSoFar));
};

// Search in Rotated Sorted Array — O(log n) vs O(n). NOTE: this is the one
// problem here where a genuine TLE guarantee isn't practically achievable —
// the gap between O(log n) and O(n) is too small in absolute terms at any
// array size reasonable to store/transfer (O(n) at a few million elements
// still runs in low milliseconds). Sized for large-N realism, not a
// guaranteed TLE.
export const genSearchRotatedCase = () => {
  const rng = mulberry32(7);
  const n = 50000;
  const rotation = randInt(rng, 1, n - 1);
  const sorted = Array.from({ length: n }, (_, i) => i * 2);
  const rotated = [...sorted.slice(rotation), ...sorted.slice(0, rotation)];
  const targetOriginalIndex = randInt(rng, 0, n - 1);
  const target = sorted[targetOriginalIndex];
  const expectedIndex = (targetOriginalIndex - rotation + n) % n;
  const input = `${rotated.join(' ')}\n${target}`;
  return bigTestCase(input, String(expectedIndex));
};

// Word Break — the textbook catastrophic-backtracking input: a run of 'a's
// followed by a character the dictionary can never consume. A naive
// unmemoized recursive solution explores an exponential number of
// segmentations before concluding it's impossible; the O(n^2) DP solution
// evaluates it in microseconds. Small and exact by construction.
export const wordBreakStressCase = bigTestCase('a'.repeat(100) + 'b\na aa', 'false');

// Container With Most Water — O(n) two-pointer vs O(n^2) all-pairs. Values
// kept to 3 digits to keep the payload compact.
export const genMaxAreaCase = () => {
  const rng = mulberry32(9);
  const n = 150000;
  const height = Array.from({ length: n }, () => randInt(rng, 1, 999));
  let l = 0;
  let r = height.length - 1;
  let best = 0;
  while (l < r) {
    const h = Math.min(height[l], height[r]);
    best = Math.max(best, h * (r - l));
    if (height[l] < height[r]) l++;
    else r--;
  }
  return bigTestCase(height.join(' '), String(best));
};

// Coin Change — another textbook catastrophic case for unmemoized
// recursion: coins=[1,2,5], amount=40 explodes to billions of recursive
// calls without memoization, while the O(amount*coins) DP is instant.
export const coinChangeStressCase = bigTestCase('1 2 5\n40', '8');
