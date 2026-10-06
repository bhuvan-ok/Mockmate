import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../modules/auth/user.model.js';
import { Question } from '../modules/question/question.model.js';
import { InterviewSet } from '../modules/interview-set/interview-set.model.js';
import mongoose from 'mongoose';
import {
  genLongestSubstringCase,
  genProductExceptSelfCase,
  genLongestPalindromeCase,
  genMergeIntervalsCase,
  genKthLargestCase,
  genMaxSubArrayCase,
  genSearchRotatedCase,
  wordBreakStressCase,
  genMaxAreaCase,
  coinChangeStressCase,
} from './testCaseGenerators.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mockmate.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'MockMate Admin';

const opt = (text) => ({ text });

const mcqQuestions = [
  // --- DSA / Complexity ---
  {
    type: 'mcq',
    title: 'Array Access Time Complexity',
    description: 'What is the time complexity of accessing an element by index in an array?',
    difficulty: 1100,
    tags: ['dsa'],
    options: [opt('O(1)'), opt('O(n)'), opt('O(log n)'), opt('O(n^2)')],
    correctOptionIndex: 0,
    hints: ['Arrays store elements in contiguous memory — what can you compute directly from an index and the element size?'],
  },
  {
    type: 'mcq',
    title: 'Binary Search Complexity',
    description: 'What is the time complexity of binary search on a sorted array of n elements?',
    difficulty: 1150,
    tags: ['dsa'],
    options: [opt('O(n)'), opt('O(log n)'), opt('O(n log n)'), opt('O(1)')],
    correctOptionIndex: 1,
    hints: ['Each comparison eliminates half of the remaining search space — how many times can you halve n?'],
  },
  {
    type: 'mcq',
    title: 'Stack vs Queue',
    description: 'Which data structure follows Last-In-First-Out (LIFO) ordering?',
    difficulty: 1100,
    tags: ['dsa'],
    options: [opt('Queue'), opt('Stack'), opt('Linked List'), opt('Heap')],
    correctOptionIndex: 1,
    hints: ['Think of a stack of plates — you can only take one off the top, the same place you last put one down.'],
  },
  {
    type: 'mcq',
    title: 'Hash Map Lookup Complexity',
    description: 'What is the average-case time complexity of a lookup in a hash map?',
    difficulty: 1200,
    tags: ['dsa'],
    options: [opt('O(1)'), opt('O(log n)'), opt('O(n)'), opt('O(n log n)')],
    correctOptionIndex: 0,
    hints: ['A good hash function spreads keys evenly across buckets, so lookup does not depend on how many items are stored.'],
  },
  {
    type: 'mcq',
    title: 'Quicksort Worst Case',
    description: 'What is the worst-case time complexity of quicksort?',
    difficulty: 1300,
    tags: ['dsa'],
    options: [opt('O(n log n)'), opt('O(n)'), opt('O(n^2)'), opt('O(log n)')],
    correctOptionIndex: 2,
    negativeMarking: true,
    hints: ['Think about what happens when the chosen pivot is always the smallest or largest remaining element.'],
  },

  // --- OOP ---
  {
    type: 'mcq',
    title: 'Encapsulation',
    description: 'Encapsulation in OOP is primarily used to:',
    difficulty: 1150,
    tags: ['oop'],
    options: [
      opt('Bundle data and methods together while restricting direct access to internals'),
      opt('Allow a class to inherit from multiple parents'),
      opt('Convert one data type into another automatically'),
      opt('Speed up compilation'),
    ],
    correctOptionIndex: 0,
    hints: ['This is about "information hiding" — controlling how external code can touch an object\'s internal state.'],
  },
  {
    type: 'mcq',
    title: 'Method Overriding',
    description:
      'Which OOP concept allows a subclass to provide its own implementation of a method already defined in its superclass?',
    difficulty: 1250,
    tags: ['oop'],
    options: [opt('Method overloading'), opt('Method overriding'), opt('Encapsulation'), opt('Abstraction')],
    correctOptionIndex: 1,
    hints: ['This redefines existing behavior in a subclass — it is not about adding a new signature for the same name.'],
  },
  {
    type: 'mcq',
    title: 'Composition over Inheritance',
    description: '"Favor composition over inheritance" generally means preferring a design where:',
    difficulty: 1350,
    tags: ['oop'],
    options: [
      opt('Classes inherit from as many base classes as possible'),
      opt('Objects are built by combining ("has-a") other objects rather than extending ("is-a") a base class'),
      opt('All methods must be static'),
      opt('Interfaces are avoided entirely'),
    ],
    correctOptionIndex: 1,
    negativeMarking: true,
    hints: ['Composition means one object holds a reference to another ("has-a") instead of extending it ("is-a").'],
  },
  {
    type: 'mcq',
    title: 'Abstract Class',
    description: 'What best describes an abstract class?',
    difficulty: 1300,
    tags: ['oop'],
    options: [
      opt('It can never contain any implemented methods'),
      opt('It cannot be instantiated directly and may contain abstract (unimplemented) methods'),
      opt('It is identical to an interface in every language'),
      opt('It can only be used with primitive data types'),
    ],
    correctOptionIndex: 1,
    hints: ['An abstract class can mix fully implemented methods with unimplemented ones — the key restriction is on instantiation.'],
  },

  // --- DBMS ---
  {
    type: 'mcq',
    title: 'Primary Key',
    description: 'A primary key in a relational database table is used to:',
    difficulty: 1100,
    tags: ['dbms'],
    options: [
      opt('Uniquely identify each record in the table'),
      opt('Store duplicate values for indexing'),
      opt('Link two unrelated tables randomly'),
      opt('Encrypt sensitive columns'),
    ],
    correctOptionIndex: 0,
    hints: ['Think about what guarantees no two rows in the table can ever be confused with one another.'],
  },
  {
    type: 'mcq',
    title: 'Normalization',
    description: 'Which normal form specifically removes transitive dependencies on the primary key?',
    difficulty: 1400,
    tags: ['dbms'],
    options: [opt('1NF'), opt('2NF'), opt('3NF'), opt('BCNF')],
    correctOptionIndex: 2,
    negativeMarking: true,
    hints: ['A transitive dependency looks like A → B → C, where C depends on B rather than directly on the primary key A.'],
  },
  {
    type: 'mcq',
    title: 'SQL Joins',
    description:
      'Which SQL join returns all rows from both tables, matching where possible and NULLs where no match exists?',
    difficulty: 1350,
    tags: ['dbms'],
    options: [opt('INNER JOIN'), opt('LEFT JOIN'), opt('FULL OUTER JOIN'), opt('CROSS JOIN')],
    correctOptionIndex: 2,
    hints: ['This join must keep every row from both sides, even the ones with nothing to match on the other side.'],
  },
  {
    type: 'mcq',
    title: 'ACID Properties',
    description: 'Which ACID property guarantees a transaction is treated as an all-or-nothing unit of work?',
    difficulty: 1300,
    tags: ['dbms'],
    options: [opt('Atomicity'), opt('Consistency'), opt('Isolation'), opt('Durability')],
    correctOptionIndex: 0,
    hints: ['The name of this property is a strong clue — think about what "atomic" means in this context.'],
  },

  // --- OS / Networking ---
  {
    type: 'mcq',
    title: 'Process vs Thread',
    description: 'What is a key difference between a process and a thread?',
    difficulty: 1250,
    tags: ['os'],
    options: [
      opt('Threads within the same process share its memory space; separate processes do not'),
      opt('Processes always run faster than threads'),
      opt('A thread can outlive the process that created it in every OS'),
      opt('Threads cannot be scheduled by the OS'),
    ],
    correctOptionIndex: 0,
    hints: ['Threads within a process are lightweight partly because of what they are able to share with each other.'],
  },
  {
    type: 'mcq',
    title: 'Deadlock Conditions',
    description: 'Which of the following is NOT one of the four necessary conditions for deadlock?',
    difficulty: 1450,
    tags: ['os'],
    options: [opt('Mutual exclusion'), opt('Hold and wait'), opt('Preemption'), opt('Circular wait')],
    correctOptionIndex: 2,
    negativeMarking: true,
    hints: ['The real four conditions are mutual exclusion, hold-and-wait, NO preemption, and circular wait — read the options carefully.'],
  },
  {
    type: 'mcq',
    title: 'TCP vs UDP',
    description: 'Which statement correctly distinguishes TCP from UDP?',
    difficulty: 1200,
    tags: ['networking'],
    options: [
      opt('TCP is connection-oriented and reliable; UDP is connectionless and does not guarantee delivery'),
      opt('UDP guarantees ordered delivery while TCP does not'),
      opt('TCP and UDP are both connectionless'),
      opt('UDP has higher overhead than TCP due to handshaking'),
    ],
    correctOptionIndex: 0,
    hints: ['One of these protocols performs a handshake and retransmits lost packets; the other just sends and forgets.'],
  },
  {
    type: 'mcq',
    title: 'HTTP Status Codes',
    description: 'An HTTP 404 status code means:',
    difficulty: 1050,
    tags: ['networking', 'http'],
    options: [opt('Server error'), opt('Unauthorized'), opt('Not Found'), opt('Redirect')],
    correctOptionIndex: 2,
    hints: ['4xx codes signal client-side errors — this specific one is about a missing resource.'],
  },

  // --- JavaScript ---
  {
    type: 'mcq',
    title: 'Closures',
    description: 'A closure in JavaScript is best described as:',
    difficulty: 1350,
    tags: ['javascript'],
    options: [
      opt('A function that retains access to its lexical scope even after the outer function has returned'),
      opt('A way to permanently freeze an object'),
      opt('A built-in method for deep-cloning arrays'),
      opt('A syntax error caused by nested functions'),
    ],
    correctOptionIndex: 0,
    hints: ['Think about what a nested function keeps access to, even after its parent function has already finished running.'],
  },
  {
    type: 'mcq',
    title: 'Hoisting',
    description: 'In JavaScript, hoisting moves which of the following to the top of their scope?',
    difficulty: 1300,
    tags: ['javascript'],
    options: [
      opt('Only function expressions'),
      opt('var declarations (not their assigned values) and function declarations'),
      opt('let and const declarations along with their values'),
      opt('Nothing — JavaScript never hoists anything'),
    ],
    correctOptionIndex: 1,
    hints: ['Only the declaration moves — think about the difference between declaring a variable and assigning it a value.'],
  },
  {
    type: 'mcq',
    title: 'Arrow Functions and this',
    description: 'How does `this` behave inside a JavaScript arrow function?',
    difficulty: 1400,
    tags: ['javascript'],
    options: [
      opt('Arrow functions get their own `this` bound to the object they are called on'),
      opt('Arrow functions do not have their own `this` — they inherit it from the enclosing lexical scope'),
      opt('`this` is always undefined inside an arrow function'),
      opt('Arrow functions cannot be used as callbacks'),
    ],
    correctOptionIndex: 1,
    negativeMarking: true,
    hints: ['Look at where the arrow function is textually written, not where or how it gets called.'],
  },
  {
    type: 'mcq',
    title: 'Event Loop',
    description:
      'Given both a pending Promise callback (microtask) and a pending setTimeout callback (macrotask), which runs first once the call stack is empty?',
    difficulty: 1500,
    tags: ['javascript'],
    options: [
      opt('The setTimeout callback always runs first'),
      opt('The microtask queue is fully drained before the next macrotask runs'),
      opt('They run in the order they were registered, regardless of type'),
      opt('It is undefined behavior and varies by engine'),
    ],
    correctOptionIndex: 1,
    negativeMarking: true,
    hints: ['One of the two queues is always fully emptied before the engine even looks at the other one.'],
  },
  {
    type: 'mcq',
    title: 'Equality Operators',
    description: 'What is the key difference between `==` and `===` in JavaScript?',
    difficulty: 1150,
    tags: ['javascript'],
    options: [
      opt('`==` performs type coercion before comparing; `===` does not'),
      opt('`===` performs type coercion before comparing; `==` does not'),
      opt('They are functionally identical'),
      opt('`==` only works on numbers'),
    ],
    correctOptionIndex: 0,
    hints: ['One of these operators tries to convert both operands to the same type before comparing them.'],
  },
  {
    type: 'mcq',
    title: 'var, let, and const',
    description: 'What is the main scoping difference between `var` and `let`/`const`?',
    difficulty: 1200,
    tags: ['javascript'],
    options: [
      opt('`var` is block-scoped; `let`/`const` are function-scoped'),
      opt('`var` is function-scoped; `let`/`const` are block-scoped'),
      opt('There is no scoping difference between them'),
      opt('`var` cannot be reassigned, but `let` can'),
    ],
    correctOptionIndex: 1,
    hints: ['Try declaring each inside an `if` block or a `for` loop — does the variable leak outside of it?'],
  },
  {
    type: 'mcq',
    title: 'Prototypal Inheritance',
    description: 'JavaScript objects primarily achieve inheritance through:',
    difficulty: 1450,
    tags: ['javascript'],
    options: [
      opt('Class-based inheritance identical to Java'),
      opt('A prototype chain, where objects inherit properties/methods directly from other objects'),
      opt('Copying all properties at object creation time only'),
      opt('Interfaces, similar to TypeScript'),
    ],
    correctOptionIndex: 1,
    hints: ['Every object has an internal link to another object it can fall back on for properties it does not have itself.'],
  },
  {
    type: 'mcq',
    title: 'Async/Await',
    description: 'What does a JavaScript `async` function always return?',
    difficulty: 1350,
    tags: ['javascript'],
    options: [opt('A Promise'), opt('undefined'), opt('The raw resolved value directly'), opt('A callback function')],
    correctOptionIndex: 0,
    hints: ['Even a function with no `await` inside it and a plain `return 5;` still wraps its result in something.'],
  },
  {
    type: 'mcq',
    title: 'JSON.stringify Behavior',
    description: 'When you call `JSON.stringify()` on an object with a property whose value is `undefined`, that property is:',
    difficulty: 1500,
    tags: ['javascript'],
    options: [
      opt('Omitted entirely from the resulting JSON string'),
      opt('Converted to the string "undefined"'),
      opt('Converted to null'),
      opt('Causes JSON.stringify to throw an error'),
    ],
    correctOptionIndex: 0,
    negativeMarking: true,
    hints: ['Compare this to how `JSON.stringify` treats a property whose value is a function — the two are handled the same way.'],
  },

  // --- General SDE ---
  {
    type: 'mcq',
    title: 'REST Principles',
    description: 'Which principle is central to REST architecture, meaning the server does not store client session state between requests?',
    difficulty: 1250,
    tags: ['sde', 'http'],
    options: [opt('Statelessness'), opt('Caching only'), opt('Layered security'), opt('Code on demand')],
    correctOptionIndex: 0,
    hints: ['The server should not need to remember anything about a client between one request and the next.'],
  },
  {
    type: 'mcq',
    title: 'Idempotent HTTP Methods',
    description: 'Which of these HTTP methods is generally NOT idempotent?',
    difficulty: 1400,
    tags: ['sde', 'http'],
    options: [opt('GET'), opt('PUT'), opt('DELETE'), opt('POST')],
    correctOptionIndex: 3,
    negativeMarking: true,
    hints: ['Idempotent means calling it once or a hundred times leaves the server in the same end state — which method\'s whole job is to create something new each call?'],
  },
  {
    type: 'mcq',
    title: 'Git Merge vs Rebase',
    description: 'What is the key difference between `git merge` and `git rebase`?',
    difficulty: 1300,
    tags: ['sde', 'git'],
    options: [
      opt('Merge preserves history with a merge commit; rebase rewrites commit history to appear linear'),
      opt('Rebase always deletes the target branch'),
      opt('Merge and rebase produce identical commit histories'),
      opt('Rebase can only be used on remote branches'),
    ],
    correctOptionIndex: 0,
    hints: ['One command preserves exactly what happened and when; the other rewrites history to look like a straight line.'],
  },
  {
    type: 'mcq',
    title: 'Sorting Algorithm Complexity',
    description: 'Which of these sorting algorithms has O(n log n) average-case time complexity?',
    difficulty: 1200,
    tags: ['dsa', 'sde'],
    options: [opt('Bubble Sort'), opt('Insertion Sort'), opt('Merge Sort'), opt('Selection Sort')],
    correctOptionIndex: 2,
    hints: ['Three of these four are O(n^2) on average — which one works by repeatedly dividing the array in half?'],
  },
];

// Every coding question follows the same contract: starterCode is ONLY the
// function stub the candidate sees and edits — zero imports/includes in
// either language. driverCode is a hidden per-language harness (never shown)
// that owns every #include/using line (for cpp) ahead of a
// `/*__CANDIDATE_CODE__*/` marker, reads stdin in a fixed plain-text format,
// calls the candidate's function by its given name/signature, and prints the
// result in a format that exactly matches testCases.expectedOutput.
const codingQuestions = [
  {
    type: 'coding',
    title: 'Longest Substring Without Repeating Characters',
    description:
      'Given a string s, find the length of the longest substring without repeating characters.\n\n' +
      'Example 1:\nInput: "abcabcbb"\nOutput: 3\nExplanation: The answer is "abc", with length 3.\n\n' +
      'Example 2:\nInput: "bbbbb"\nOutput: 1\nExplanation: The answer is "b", with length 1.\n\n' +
      'Implement lengthOfLongestSubstring(s) — do not rename it or change its signature.',
    difficulty: 1300,
    tags: ['strings', 'sliding-window'],
    hints: [
      'Think about a sliding window over the string, expanding the right edge and shrinking the left edge whenever a repeat is found.',
      'A hash set (or a map from character to its last seen index) lets you shrink the window in O(1) instead of rescanning it.',
    ],
    starterCode: {
      javascript:
        '/**\n * @param {string} s\n * @return {number}\n */\nfunction lengthOfLongestSubstring(s) {\n  // write your logic here\n}\n',
      cpp: 'int lengthOfLongestSubstring(string s) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __s = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n')[0];\nconsole.log(lengthOfLongestSubstring(__s));\n",
      cpp:
        '#include <iostream>\n#include <string>\n#include <unordered_set>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    string s;\n    getline(cin, s);\n    cout << lengthOfLongestSubstring(s) << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: 'abcabcbb', expectedOutput: '3', isHidden: false },
      { input: 'bbbbb', expectedOutput: '1', isHidden: false },
      { input: 'pwwkew', expectedOutput: '3', isHidden: true },
      genLongestSubstringCase(),
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
  {
    type: 'coding',
    title: 'Product of Array Except Self',
    description:
      'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all ' +
      'elements of nums except nums[i]. Do not use division, and solve it in O(n) time.\n\n' +
      'Example:\nInput: [1, 2, 3, 4]\nOutput: [24, 12, 8, 6]\n\n' +
      'Implement productExceptSelf(nums) — return the array in the same order as the input.',
    difficulty: 1350,
    tags: ['arrays'],
    hints: [
      'Without division, think about computing prefix products (everything to the left) and suffix products (everything to the right) separately.',
      'Build the prefix products in one left-to-right pass, then fold in the suffix products in a second right-to-left pass using a single running variable.',
    ],
    starterCode: {
      javascript:
        '/**\n * @param {number[]} nums\n * @return {number[]}\n */\nfunction productExceptSelf(nums) {\n  // write your logic here\n}\n',
      cpp: 'vector<int> productExceptSelf(vector<int>& nums) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __nums = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(productExceptSelf(__nums).join(' '));\n",
      cpp:
        '#include <iostream>\n#include <vector>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    vector<int> nums;\n    int x;\n    while (cin >> x) nums.push_back(x);\n    vector<int> result = productExceptSelf(nums);\n    for (size_t i = 0; i < result.size(); i++) {\n        cout << result[i];\n        if (i + 1 < result.size()) cout << " ";\n    }\n    cout << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: '1 2 3 4', expectedOutput: '24 12 8 6', isHidden: false },
      { input: '2 3', expectedOutput: '3 2', isHidden: false },
      { input: '-1 1 0 -3 3', expectedOutput: '0 0 9 0 0', isHidden: true },
      genProductExceptSelfCase(),
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
  {
    type: 'coding',
    title: 'Longest Palindromic Substring',
    description:
      'Given a string s, return the longest palindromic substring in s. If there are multiple substrings of the ' +
      'maximum length, return the one that starts first (leftmost).\n\n' +
      'Example:\nInput: "babad"\nOutput: "bab"\n\n' +
      'Implement longestPalindrome(s).',
    difficulty: 1400,
    tags: ['strings'],
    hints: [
      'Every palindrome has a center — try expanding outward from each possible center (including between two characters, for even-length palindromes).',
      'There are 2n-1 possible centers for a string of length n; expanding from each one costs O(n), so the whole approach is O(n^2).',
    ],
    starterCode: {
      javascript:
        '/**\n * @param {string} s\n * @return {string}\n */\nfunction longestPalindrome(s) {\n  // write your logic here\n}\n',
      cpp: 'string longestPalindrome(string s) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __s = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n')[0];\nconsole.log(longestPalindrome(__s));\n",
      cpp:
        '#include <iostream>\n#include <string>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    string s;\n    getline(cin, s);\n    cout << longestPalindrome(s) << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: 'babad', expectedOutput: 'bab', isHidden: false },
      { input: 'cbbd', expectedOutput: 'bb', isHidden: false },
      { input: 'a', expectedOutput: 'a', isHidden: true },
      genLongestPalindromeCase(),
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
  {
    type: 'coding',
    title: 'Merge Intervals',
    description:
      'Given an array of intervals where intervals[i] = [start, end], merge all overlapping intervals and return ' +
      'the result sorted by start.\n\n' +
      'Example:\nInput: [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]\n\n' +
      'Implement mergeIntervals(intervals).',
    difficulty: 1400,
    tags: ['arrays', 'sorting'],
    hints: [
      'Sort the intervals by start time first — real overlaps can then only happen between intervals that are now next to each other.',
      'Walk the sorted intervals and merge the current one into the last interval of your result whenever its start is <= that interval\'s end.',
    ],
    starterCode: {
      javascript:
        '/**\n * @param {number[][]} intervals\n * @return {number[][]}\n */\nfunction mergeIntervals(intervals) {\n  // write your logic here\n}\n',
      cpp: 'vector<vector<int>> mergeIntervals(vector<vector<int>>& intervals) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __nums = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split(/\\s+/).map(Number);\nconst __intervals = [];\nfor (let i = 0; i < __nums.length; i += 2) __intervals.push([__nums[i], __nums[i + 1]]);\nconst __result = mergeIntervals(__intervals);\nconsole.log(__result.map((pair) => pair.join(' ')).join(' '));\n",
      cpp:
        '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    vector<int> nums;\n    int x;\n    while (cin >> x) nums.push_back(x);\n    vector<vector<int>> intervals;\n    for (size_t i = 0; i + 1 < nums.size(); i += 2) intervals.push_back({nums[i], nums[i + 1]});\n    vector<vector<int>> result = mergeIntervals(intervals);\n    for (size_t i = 0; i < result.size(); i++) {\n        cout << result[i][0] << " " << result[i][1];\n        if (i + 1 < result.size()) cout << " ";\n    }\n    cout << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: '1 3 2 6 8 10 15 18', expectedOutput: '1 6 8 10 15 18', isHidden: false },
      { input: '1 4 4 5', expectedOutput: '1 5', isHidden: false },
      { input: '1 4 0 4', expectedOutput: '0 4', isHidden: true },
      genMergeIntervalsCase(),
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
  {
    type: 'coding',
    title: 'Kth Largest Element in an Array',
    description:
      'Given an integer array nums and an integer k, return the kth largest element in the array (not the kth ' +
      'distinct element).\n\n' +
      'Example:\nInput: nums = [3,2,1,5,6,4], k = 2\nOutput: 5\n\n' +
      'Implement findKthLargest(nums, k). Input format: first line is nums, second line is k.',
    difficulty: 1350,
    tags: ['arrays', 'sorting'],
    hints: [
      'Sorting works but does more than you need — think about a min-heap that never grows past size k.',
      'Quickselect (a partition-based approach similar to quicksort) can find the kth largest in average O(n) time.',
    ],
    starterCode: {
      javascript:
        '/**\n * @param {number[]} nums\n * @param {number} k\n * @return {number}\n */\nfunction findKthLargest(nums, k) {\n  // write your logic here\n}\n',
      cpp: 'int findKthLargest(vector<int>& nums, int k) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');\nconst __nums = __lines[0].trim().split(/\\s+/).map(Number);\nconst __k = Number(__lines[1].trim());\nconsole.log(findKthLargest(__nums, __k));\n",
      cpp:
        '#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <sstream>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    string line1;\n    getline(cin, line1);\n    istringstream iss(line1);\n    vector<int> nums;\n    int x;\n    while (iss >> x) nums.push_back(x);\n    int k;\n    cin >> k;\n    cout << findKthLargest(nums, k) << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: '3 2 1 5 6 4\n2', expectedOutput: '5', isHidden: false },
      { input: '1 2\n1', expectedOutput: '2', isHidden: false },
      { input: '3 2 3 1 2 4 5 5 6\n4', expectedOutput: '4', isHidden: true },
      genKthLargestCase(),
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
  {
    type: 'coding',
    title: 'Maximum Subarray',
    description:
      "Given an integer array nums, find the contiguous subarray with the largest sum, and return its sum " +
      "(Kadane's Algorithm).\n\nExample:\nInput: [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: [4,-1,2,1] has the largest sum = 6.\n\n" +
      'Implement maxSubArray(nums).',
    difficulty: 1250,
    tags: ['arrays', 'dp'],
    hints: [
      'At each position, decide: extend the running subarray, or start a fresh one here — whichever gives the bigger sum.',
      "This is Kadane's Algorithm: keep a running sum that resets to just the current element whenever it would otherwise go negative.",
    ],
    starterCode: {
      javascript:
        '/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction maxSubArray(nums) {\n  // write your logic here\n}\n',
      cpp: 'int maxSubArray(vector<int>& nums) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __nums = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(maxSubArray(__nums));\n",
      cpp:
        '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    vector<int> nums;\n    int x;\n    while (cin >> x) nums.push_back(x);\n    cout << maxSubArray(nums) << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: '-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: false },
      { input: '1', expectedOutput: '1', isHidden: false },
      { input: '5 4 -1 7 8', expectedOutput: '23', isHidden: true },
      genMaxSubArrayCase(),
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
  {
    type: 'coding',
    title: 'Search in Rotated Sorted Array',
    description:
      'Given a sorted array that has been rotated at an unknown pivot, and a target value, return the index of ' +
      'target if it exists, otherwise -1. Aim for O(log n) time.\n\n' +
      'Example:\nInput: nums = [4,5,6,7,0,1,2], target = 0\nOutput: 4\n\n' +
      'Implement searchRotatedArray(nums, target). Input format: first line is nums, second line is target.',
    difficulty: 1450,
    tags: ['arrays', 'binary-search'],
    hints: [
      'At least one half of the array, split at the midpoint, is always fully sorted — figure out which half that is first.',
      'Once you know which half is sorted, you can tell in O(1) whether the target falls inside that half\'s value range.',
    ],
    starterCode: {
      javascript:
        '/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nfunction searchRotatedArray(nums, target) {\n  // write your logic here\n}\n',
      cpp: 'int searchRotatedArray(vector<int>& nums, int target) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');\nconst __nums = __lines[0].trim().split(/\\s+/).map(Number);\nconst __target = Number(__lines[1].trim());\nconsole.log(searchRotatedArray(__nums, __target));\n",
      cpp:
        '#include <iostream>\n#include <vector>\n#include <sstream>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    string line1;\n    getline(cin, line1);\n    istringstream iss(line1);\n    vector<int> nums;\n    int x;\n    while (iss >> x) nums.push_back(x);\n    int target;\n    cin >> target;\n    cout << searchRotatedArray(nums, target) << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: '4 5 6 7 0 1 2\n0', expectedOutput: '4', isHidden: false },
      { input: '4 5 6 7 0 1 2\n3', expectedOutput: '-1', isHidden: false },
      { input: '1\n0', expectedOutput: '-1', isHidden: true },
      genSearchRotatedCase(),
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
  {
    type: 'coding',
    title: 'Word Break',
    description:
      'Given a string s and a dictionary of words wordDict, return true if s can be segmented into a ' +
      'space-separated sequence of one or more dictionary words.\n\n' +
      'Example:\nInput: s = "leetcode", wordDict = ["leet", "code"]\nOutput: true\n\n' +
      'Implement wordBreak(s, wordDict). Input format: first line is s, second line is the dictionary words ' +
      'space-separated.',
    difficulty: 1500,
    tags: ['strings', 'dp'],
    hints: [
      'Think of it as DP over prefixes: dp[i] = true if s[0..i) can be fully segmented using words from the dictionary.',
      'For each i, check every j < i — dp[i] is true if dp[j] is true and s[j..i) is itself a dictionary word.',
    ],
    starterCode: {
      javascript:
        '/**\n * @param {string} s\n * @param {string[]} wordDict\n * @return {boolean}\n */\nfunction wordBreak(s, wordDict) {\n  // write your logic here\n}\n',
      cpp: 'bool wordBreak(string s, vector<string>& wordDict) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');\nconst __s = __lines[0].trim();\nconst __wordDict = __lines[1].trim().split(/\\s+/);\nconsole.log(wordBreak(__s, __wordDict) ? 'true' : 'false');\n",
      cpp:
        '#include <iostream>\n#include <string>\n#include <vector>\n#include <unordered_set>\n#include <sstream>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    string s;\n    getline(cin, s);\n    string line2;\n    getline(cin, line2);\n    istringstream iss(line2);\n    vector<string> wordDict;\n    string w;\n    while (iss >> w) wordDict.push_back(w);\n    cout << (wordBreak(s, wordDict) ? "true" : "false") << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: 'leetcode\nleet code', expectedOutput: 'true', isHidden: false },
      { input: 'applepenapple\napple pen', expectedOutput: 'true', isHidden: false },
      { input: 'catsandog\ncats dog sand and cat', expectedOutput: 'false', isHidden: true },
      wordBreakStressCase,
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
  {
    type: 'coding',
    title: 'Container With Most Water',
    description:
      'Given an array height where height[i] is the height of a vertical line at position i, find two lines that ' +
      'together with the x-axis form a container holding the most water. Return the maximum area.\n\n' +
      'Example:\nInput: [1,8,6,2,5,4,8,3,7]\nOutput: 49\n\n' +
      'Implement maxArea(height).',
    difficulty: 1350,
    tags: ['arrays', 'two-pointers'],
    hints: [
      'Start with two pointers at the far ends of the array — the area is always limited by the shorter of the two lines.',
      'Moving the pointer at the taller line can only shrink the width without ever helping the height, so always move the shorter one inward.',
    ],
    starterCode: {
      javascript:
        '/**\n * @param {number[]} height\n * @return {number}\n */\nfunction maxArea(height) {\n  // write your logic here\n}\n',
      cpp: 'int maxArea(vector<int>& height) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __height = require('fs').readFileSync('/dev/stdin', 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(maxArea(__height));\n",
      cpp:
        '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    vector<int> height;\n    int x;\n    while (cin >> x) height.push_back(x);\n    cout << maxArea(height) << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: '1 8 6 2 5 4 8 3 7', expectedOutput: '49', isHidden: false },
      { input: '1 1', expectedOutput: '1', isHidden: false },
      { input: '4 3 2 1 4', expectedOutput: '16', isHidden: true },
      genMaxAreaCase(),
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
  {
    type: 'coding',
    title: 'Coin Change',
    description:
      'Given an array of coin denominations and a target amount, return the fewest number of coins needed to make ' +
      'up that amount. If it cannot be made, return -1.\n\n' +
      'Example:\nInput: coins = [1,2,5], amount = 11\nOutput: 3 (5 + 5 + 1)\n\n' +
      'Implement coinChange(coins, amount). Input format: first line is coins, second line is amount.',
    difficulty: 1500,
    tags: ['dp'],
    hints: [
      'This is a classic unbounded-knapsack DP problem: dp[a] = fewest coins needed to make amount a.',
      'dp[0] = 0, and dp[a] = 1 + min(dp[a - coin]) over every coin <= a that has a valid (reachable) dp value.',
    ],
    starterCode: {
      javascript:
        '/**\n * @param {number[]} coins\n * @param {number} amount\n * @return {number}\n */\nfunction coinChange(coins, amount) {\n  // write your logic here\n}\n',
      cpp: 'int coinChange(vector<int>& coins, int amount) {\n    // write your logic here\n}\n',
    },
    driverCode: {
      javascript:
        "const __lines = require('fs').readFileSync('/dev/stdin', 'utf8').split('\\n');\nconst __coins = __lines[0].trim().split(/\\s+/).map(Number);\nconst __amount = Number(__lines[1].trim());\nconsole.log(coinChange(__coins, __amount));\n",
      cpp:
        '#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <sstream>\nusing namespace std;\n\n/*__CANDIDATE_CODE__*/\n\nint main() {\n    string line1;\n    getline(cin, line1);\n    istringstream iss(line1);\n    vector<int> coins;\n    int x;\n    while (iss >> x) coins.push_back(x);\n    int amount;\n    cin >> amount;\n    cout << coinChange(coins, amount) << endl;\n    return 0;\n}\n',
    },
    testCases: [
      { input: '1 2 5\n11', expectedOutput: '3', isHidden: false },
      { input: '2\n3', expectedOutput: '-1', isHidden: false },
      { input: '1\n0', expectedOutput: '0', isHidden: true },
      coinChangeStressCase,
    ],
    timeLimitMs: 10000,
    memoryLimitMb: 128,
  },
];

const run = async () => {
  await connectDB();

  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
    });
    console.log(`Created admin account: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
  }

  await Question.deleteMany({});
  const created = await Question.insertMany(
    [...mcqQuestions, ...codingQuestions].map((q) => ({ ...q, createdBy: admin._id }))
  );
  console.log(`Seeded ${created.length} questions (${mcqQuestions.length} MCQ, ${codingQuestions.length} coding)`);

  await InterviewSet.deleteMany({});
  await InterviewSet.create({
    title: 'CS Fundamentals + Coding Screen',
    description:
      '10 CS fundamentals/JavaScript MCQs, then 2 adaptive, medium-difficulty LeetCode-style coding questions ' +
      '(JavaScript or C++).',
    rounds: [
      { type: 'mcq', durationSec: 900, questionCount: 10, tags: [] },
      { type: 'coding', durationSec: 2400, questionCount: 2, tags: [] },
    ],
    createdBy: admin._id,
  });
  console.log('Seeded 1 interview set: "CS Fundamentals + Coding Screen"');

  await mongoose.disconnect();
  console.log('Seed complete.');
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
