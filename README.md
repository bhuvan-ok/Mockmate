# MockMate — AI Mock Interview Platform

MockMate is a timed, proctored mock-interview platform for practicing technical interviews:
adaptive-difficulty MCQ rounds and LeetCode-style coding rounds graded by real code execution in
isolated Docker sandboxes, with hand-authored hints and Gemini-powered post-round feedback.

## Features

- **Sandboxed code execution** — candidate submissions (JavaScript & C++) run in per-submission
  Docker containers with no network access, hard memory/CPU/pids limits, a read-only root
  filesystem, and a non-root user. Grading is decoupled from the request cycle via a BullMQ/Redis
  job queue between the API and a separate sandbox worker.
- **Function-signature judging** — candidates implement just the function (LeetCode-style); a
  hidden per-question driver parses stdin, calls the function, and prints the result for
  comparison against expected output, with per-test-case pass/fail, runtime, and hidden test
  cases.
- **Adaptive difficulty (Elo-style)** — each candidate has a live rating; the next question is
  picked by closest difficulty match, CAT-style, and both the candidate's and the question's
  ratings adjust after every answer.
- **Server-authoritative timers** — every round's `startedAt`/`durationSec` lives in the database,
  never trusted from the client; a server-side sweep auto-submits any round whose time has
  expired.
- **Hints & AI feedback** — hand-authored, LeetCode-style hints ship inline with the
  candidate-safe question payload and are revealed progressively (one at a time, at the
  candidate's own pace) entirely client-side, with no AI call or server round-trip involved.
  Gemini is used only for a post-round plain-language feedback summary, generated once per
  attempt and cached.
- **Anti-cheat signals** — tab-switch/blur and paste events are logged per attempt and surfaced on
  the results report and admin attempts list (disclosed to the candidate, never used to
  auto-disqualify).
- **Admin dashboard** — question bank CRUD (MCQ + coding, with per-language driver code and test
  cases), interview-set builder, attempts list with integrity flags, and analytics.

## Tech stack

| Layer | Stack |
|---|---|
| Client | React 19, Vite, Redux Toolkit, React Router, Tailwind CSS, Monaco Editor, Recharts |
| Server | Node.js, Express, MongoDB/Mongoose, BullMQ, Zod, JWT auth |
| Worker | Node.js, BullMQ consumer, Docker (spawned via CLI, not dockerode) |
| Infra | MongoDB Atlas, Upstash Redis, Vercel (client), Render (API), a Docker-capable VM (worker) |

## Structure

```
mock interview/
├── client/   React + Vite frontend
├── server/   Node/Express API — auth, questions, interview sets, attempts, submissions, AI
└── worker/   Sandbox execution service — runs candidate code in Docker containers
```

Each module follows a feature-based layout: the server groups files per feature under
`server/src/modules/[feature]/` (model, controller, service, routes, validation), the client
groups per feature under `client/src/features/[feature]/`.

## Architecture

**Coding submission flow:** candidate writes code in Monaco → client POSTs to the server, which
creates a `Submission` (status `queued`) and enqueues a BullMQ job → the worker (on its own host)
pulls the job, starts a resource-capped Docker container per submission, runs each test case via
`docker exec`, then posts the verdict back to a secret-guarded internal server route → the client
polls for the result.

**Round lifecycle:** an admin builds an `InterviewSet` (ordered rounds with tag/count-based
question pools, not fixed lists, so adaptive selection has room to work). Starting an `Attempt`
stamps `startedAt` per round; a cron sweep auto-submits any round that's timed out; MCQ rounds
grade on submit, coding rounds grade via the worker's verdict, and the Elo rating updates as each
question resolves.

## Local development

Requirements: Node 20+, MongoDB (local or Atlas), Redis (local or Upstash), Docker Desktop (for
the worker only).

### 1. Server

```bash
cd server
cp .env.example .env   # fill in MONGO_URI, JWT secrets, REDIS_URL, WORKER_CALLBACK_SECRET
npm install
npm run seed            # creates an admin account + sample questions/interview set
npm run dev              # http://localhost:5000
```

Seed defaults to `admin@mockmate.dev` / `ChangeMe123!` unless `ADMIN_EMAIL`/`ADMIN_PASSWORD` are
set in the environment before running `npm run seed`.

### 2. Client

```bash
cd client
cp .env.example .env    # VITE_API_URL=http://localhost:5000/api/v1
npm install
npm run dev               # http://localhost:5173
```

### 3. Worker (requires Docker Desktop running locally)

```bash
cd worker/docker
./build.sh                # builds mockmate-runner-js and mockmate-runner-cpp images
cd ..
cp .env.example .env      # REDIS_URL, SERVER_URL=http://localhost:5000, WORKER_CALLBACK_SECRET (must match server's)
npm install
npm start
```

Submit a coding question from the client and the worker will pick the job off the queue, run it
in a container, and post the verdict back to the server.

## Deployment (all free-tier)

| Service | Where |
|---|---|
| Client | Vercel — set `VITE_API_URL` to the deployed server URL |
| Server | Render — set all vars from `server/.env.example` |
| Worker | A small always-on Docker-capable host (a free-tier VM, or any always-on machine) — Render/Vercel can't run arbitrary containers on demand |
| Database | MongoDB Atlas M0 |
| Queue | Upstash Redis (free tier) |

`WORKER_CALLBACK_SECRET` must be identical on the server and the worker — it's how the worker
authenticates its result callback without a full auth flow.

On the worker host: install Docker, get the `worker/` directory onto it, run
`worker/docker/build.sh` once, then run the worker as a long-lived process (e.g. via `pm2` or a
`systemd` unit) so it survives reboots and restarts on crash.
