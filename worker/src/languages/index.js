import { config } from '../config.js';

// Marks where the candidate's function gets spliced into driverCode. Keeping
// all #include/using lines in driverCode (ahead of the marker) means the
// candidate's editor never shows or needs import statements — same as
// JavaScript, which never had any to begin with. If a question's driverCode
// doesn't contain the marker, runner.js falls back to appending code before
// driverCode (legacy behavior, still fine for JS).
export const CANDIDATE_CODE_MARKER = '/*__CANDIDATE_CODE__*/';

// compileCommand is optional — only compiled languages need it. runner.js
// runs it once per submission inside the warm container (see runner.js),
// separately from the per-test-case timing budget.
export const languageConfig = {
  javascript: {
    image: config.jsRunnerImage,
    fileName: 'solution.js',
    runCommand: (containerPath) => ['node', containerPath],
  },
  cpp: {
    image: config.cppRunnerImage,
    fileName: 'solution.cpp',
    // Root FS is mounted read-only, so the compiled binary goes to the
    // writable /tmp tmpfs instead.
    compileCommand: (containerPath) => ['g++', '-O2', '-std=c++17', '-o', '/tmp/a.out', containerPath],
    runCommand: () => ['/tmp/a.out'],
  },
};
