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

export const runSubmission = async ({
  language,
  code,
  driverCode,
  testCases,
  timeLimitMs,
  memoryLimitMb,
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

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = await runDockerCli(['exec', '-i', containerName, ...runCommand], {
        input: testCase.input,
        timeoutMs: timeLimitMs,
      });

      const actualOutput = result.timedOut
        ? 'Time limit exceeded'
        : result.exitCode !== 0
          ? result.stderr || `Process exited with code ${result.exitCode}`
          : result.stdout.trim();

      const passed = !result.timedOut && result.exitCode === 0 && actualOutput === testCase.expectedOutput.trim();

      verdicts.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
        runtimeMs: result.runtimeMs,
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
      }
    }

    const testCasesPassed = verdicts.filter((v) => v.passed).length;
    return { verdicts, testCasesPassed, testCasesTotal: verdicts.length };
  } finally {
    await killContainer(containerName);
    await rm(hostDir, { recursive: true, force: true });
  }
};
