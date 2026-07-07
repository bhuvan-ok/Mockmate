import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { languageConfig, CANDIDATE_CODE_MARKER } from './languages/index.js';

const MAX_OUTPUT_BYTES = 64 * 1024;
const CONTAINER_START_TIMEOUT_MS = 25000;
const COMPILE_TIMEOUT_MS = 20000;
const KILL_TIMEOUT_MS = 5000;
// cc1plus parsing even a handful of STL headers needs real headroom — a
// question's memoryLimitMb (sized for running the candidate's *output*, not
// compiling it) was getting cc1plus OOM-killed well before it could finish.
// The container's single memory cap has to cover both phases, so compiled
// languages get whichever is larger.
const COMPILE_MEMORY_FLOOR_MB = 512;

// Wall-clock timing a `docker exec` call (the old TLE mechanism) conflates
// the candidate's actual CPU usage with Docker's own per-invocation IPC
// overhead — real judges (Codeforces, etc.) measure the sandboxed process's
// CPU time instead, precisely to stay immune to that kind of noise. We do
// the same via cgroup CPU accounting (see readCpuUsageUsec below); the
// wall-clock timeout becomes just a safety net against a genuinely hung
// process, so it needs headroom above the CPU budget rather than being the
// budget itself.
const WALL_CLOCK_SAFETY_PAD_MS = 5000;
const CPU_STAT_TIMEOUT_MS = 8000;

const FLOAT_EPSILON = 1e-6;

const isNumericToken = (token) => token !== '' && !Number.isNaN(Number(token));

// 'float' mode tokenizes both outputs on whitespace and compares token-by-
// token within a small epsilon, so "3" / "3.0" / "3.00" all grade as the
// same answer — a miniature version of the "special judge" pattern real
// judges use for numeric-output problems. Falls back to an exact string
// match whenever token counts differ or either side has a non-numeric
// token, so it can never mask a genuinely wrong answer as correct.
const outputsMatch = (actual, expected, comparator) => {
  if (comparator !== 'float') return actual === expected;

  const actualTokens = actual.split(/\s+/).filter(Boolean);
  const expectedTokens = expected.split(/\s+/).filter(Boolean);
  if (actualTokens.length !== expectedTokens.length) return actual === expected;

  const allNumeric = actualTokens.every(isNumericToken) && expectedTokens.every(isNumericToken);
  if (!allNumeric) return actual === expected;

  return actualTokens.every(
    (token, i) => Math.abs(Number(token) - Number(expectedTokens[i])) <= FLOAT_EPSILON
  );
};

// Runs one `docker` CLI invocation and captures stdout/stderr/exit code,
// optionally feeding stdin and enforcing a timeout that hard-kills the local
// process. Shared by container start, compile, and per-test-case exec calls.
const runDockerCli = (args, { input, timeoutMs } = {}) => {
  return new Promise((resolve) => {
    const proc = spawn('docker', args);
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const startedAt = Date.now();

    const timeoutHandle = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          proc.kill('SIGKILL');
        }, timeoutMs)
      : null;

    proc.stdout.on('data', (chunk) => {
      if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString();
    });

    if (input !== undefined) {
      proc.stdin.write(input ?? '');
      proc.stdin.end();
    }

    proc.on('close', (exitCode) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      resolve({
        stdout: stdout.slice(0, MAX_OUTPUT_BYTES),
        stderr: stderr.slice(0, MAX_OUTPUT_BYTES),
        timedOut,
        exitCode,
        runtimeMs: Date.now() - startedAt,
      });
    });

    proc.on('error', (err) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      resolve({ stdout: '', stderr: err.message, timedOut: false, exitCode: -1, runtimeMs: Date.now() - startedAt });
    });
  });
};

// One warm, network-isolated, resource-capped container is started per
// submission (not per test case) — `docker run` cold-start overhead (which
// can be several seconds, especially on Docker Desktop) is paid once here.
// Each test case then runs via `docker exec` into this already-running
// container, which is far cheaper than creating a fresh one every time.
const startContainer = async ({ image, hostDir, memoryLimitMb }) => {
  const containerName = `mockmate-${randomUUID()}`;
  const result = await runDockerCli(
    [
      'run', '-d', '--rm',
      '--name', containerName,
      '--network', 'none',
      '--memory', `${memoryLimitMb}m`,
      '--memory-swap', `${memoryLimitMb}m`,
      '--cpus', '1',
      '--pids-limit', '128',
      '--read-only',
      // `exec` must be explicit — Docker's tmpfs mounts default to noexec on
      // some configurations, which silently makes a freshly compiled C++
      // binary unrunnable (exit code 126) even though the file exists.
      '--tmpfs', '/tmp:rw,exec,size=64m',
      '-v', `${hostDir}:/sandbox:ro`,
      image,
      'sleep', '600',
    ],
    { timeoutMs: CONTAINER_START_TIMEOUT_MS }
  );
  if (result.exitCode !== 0 || result.timedOut) {
    throw new Error(`Failed to start sandbox container: ${result.stderr || 'timed out'}`);
  }
  return containerName;
};

const killContainer = async (containerName) => {
  if (!containerName) return;
  await runDockerCli(['kill', containerName], { timeoutMs: KILL_TIMEOUT_MS }).catch(() => {});
};

// cgroup v2 exposes each container's own accumulated CPU time at
// /sys/fs/cgroup/cpu.stat *inside* the container, independent of the host's
// cgroup driver — reading it immediately before and after a test case's
// exec and taking the delta gives the CPU microseconds that exec actually
// consumed. Returns null (rather than throwing) on any host where this
// path isn't available (e.g. a cgroup v1 host), so callers can fall back to
// wall-clock timing instead of failing the submission outright.
const readCpuUsageUsec = async (containerName) => {
  const result = await runDockerCli(
    ['exec', containerName, 'sh', '-c', 'cat /sys/fs/cgroup/cpu.stat 2>/dev/null'],
    { timeoutMs: CPU_STAT_TIMEOUT_MS }
  );
  if (result.exitCode !== 0) return null;
  const match = result.stdout.match(/usage_usec (\d+)/);
  return match ? Number(match[1]) : null;
};

export const runSubmission = async ({
  language,
  code,
  driverCode,
  testCases,
  timeLimitMs,
  memoryLimitMb,
  outputComparator = 'exact',
}) => {
  const langConfig = languageConfig[language];
  if (!langConfig) throw new Error(`Unsupported language: ${language}`);

  const hostDir = await mkdtemp(path.join(tmpdir(), 'mockmate-'));
  const solutionPath = path.join(hostDir, langConfig.fileName);
  const containerPath = `/sandbox/${langConfig.fileName}`;

  let containerName = null;

  try {
    // The candidate only ever wrote the function body — driverCode is the
    // hidden per-question harness that parses stdin, calls their function,
    // and prints the result in the exact format testCases.expectedOutput
    // expects. Never shown to the candidate.
    //
    // driverCode carries all #include/using lines for compiled languages, so
    // the candidate's code never needs imports at all — the marker shows
    // where their function gets spliced in, ahead of those includes' first
    // use. Languages without that ordering constraint (JS) can skip the
    // marker and just get code appended before driverCode, as before.
    const fullCode = driverCode?.includes(CANDIDATE_CODE_MARKER)
      ? driverCode.replace(CANDIDATE_CODE_MARKER, code)
      : `${code}\n\n${driverCode || ''}`;
    await writeFile(solutionPath, fullCode, { mode: 0o444 });

    const containerMemoryMb = langConfig.compileCommand
      ? Math.max(memoryLimitMb, COMPILE_MEMORY_FLOOR_MB)
      : memoryLimitMb;

    containerName = await startContainer({ image: langConfig.image, hostDir, memoryLimitMb: containerMemoryMb });

    if (langConfig.compileCommand) {
      const compileResult = await runDockerCli(
        ['exec', containerName, ...langConfig.compileCommand(containerPath)],
        { timeoutMs: COMPILE_TIMEOUT_MS }
      );
      if (compileResult.exitCode !== 0 || compileResult.timedOut) {
        const message = compileResult.timedOut ? 'Compilation timed out' : compileResult.stderr || 'Compilation failed';
        return {
          verdicts: testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: message,
            passed: false,
            verdictType: 'CE',
            runtimeMs: compileResult.runtimeMs,
            isHidden: tc.isHidden,
          })),
          testCasesPassed: 0,
          testCasesTotal: testCases.length,
        };
      }
    }

    const runCommand = langConfig.runCommand(containerPath);
    const verdicts = [];
    // Baseline CPU snapshot for the current container, taken right after it
    // starts (or restarts) so the first test case's delta only reflects its
    // own exec, not container startup. Rolls forward to each exec's "after"
    // reading so every test case pays for exactly one extra `docker exec`,
    // not two.
    let cpuBaselineUsec = await readCpuUsageUsec(containerName);

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = await runDockerCli(['exec', '-i', containerName, ...runCommand], {
        input: testCase.input,
        timeoutMs: timeLimitMs + WALL_CLOCK_SAFETY_PAD_MS,
      });

      let verdictType;
      let actualOutput;
      let measuredMs = result.runtimeMs;

      if (result.timedOut) {
        // The wall-clock safety net fired — the process hung well past any
        // reasonable budget, so it's TLE regardless of what CPU accounting
        // would say.
        verdictType = 'TLE';
        actualOutput = 'Time limit exceeded';
      } else {
        const cpuAfterUsec = await readCpuUsageUsec(containerName);
        const cpuTimeMs =
          cpuBaselineUsec !== null && cpuAfterUsec !== null
            ? Math.max(0, Math.round((cpuAfterUsec - cpuBaselineUsec) / 1000))
            : null;
        cpuBaselineUsec = cpuAfterUsec;
        // Prefer measured CPU time; fall back to wall-clock (the old
        // behavior) on hosts where cgroup v2 CPU accounting isn't readable.
        measuredMs = cpuTimeMs !== null ? cpuTimeMs : result.runtimeMs;

        if (measuredMs > timeLimitMs) {
          verdictType = 'TLE';
          actualOutput = 'Time limit exceeded';
        } else if (result.exitCode !== 0) {
          // The kernel OOM killer SIGKILLs a process that exceeds the
          // container's memory cap, which docker exec reports as exit code
          // 137 (128 + SIGKILL) — any other non-zero exit is a genuine crash.
          verdictType = result.exitCode === 137 ? 'MLE' : 'RE';
          actualOutput = result.stderr || `Process exited with code ${result.exitCode}`;
        } else if (result.stdout.length >= MAX_OUTPUT_BYTES) {
          // runDockerCli caps stdout mid-stream and hard-slices it to
          // MAX_OUTPUT_BYTES — landing exactly on that cap means output was
          // truncated, not that the program happened to print that many bytes.
          verdictType = 'OLE';
          actualOutput = result.stdout.trim();
        } else {
          actualOutput = result.stdout.trim();
          verdictType = outputsMatch(actualOutput, testCase.expectedOutput.trim(), outputComparator)
            ? 'AC'
            : 'WA';
        }
      }

      const passed = verdictType === 'AC';

      verdicts.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
        verdictType,
        runtimeMs: measuredMs,
        isHidden: testCase.isHidden,
      });

      // A timed-out `docker exec` only kills the local CLI client — the
      // process it started keeps running inside the container. Retire the
      // container and start a clean one (recompiling if needed) so a
      // runaway process from one test case can never eat into the next
      // test case's timing or resources.
      if (result.timedOut && i < testCases.length - 1) {
        await killContainer(containerName);
        containerName = await startContainer({ image: langConfig.image, hostDir, memoryLimitMb: containerMemoryMb });
        if (langConfig.compileCommand) {
          await runDockerCli(['exec', containerName, ...langConfig.compileCommand(containerPath)], {
            timeoutMs: COMPILE_TIMEOUT_MS,
          });
        }
        cpuBaselineUsec = await readCpuUsageUsec(containerName);
      }
    }

    const testCasesPassed = verdicts.filter((v) => v.passed).length;
    return { verdicts, testCasesPassed, testCasesTotal: verdicts.length };
  } finally {
    await killContainer(containerName);
    await rm(hostDir, { recursive: true, force: true });
  }
};
