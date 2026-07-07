#!/usr/bin/env bash
# Builds the sandboxed language runner images used by ../src/runner.js.
# Run this once on the worker VM (and again whenever a Dockerfile changes).
set -euo pipefail
cd "$(dirname "$0")"

docker build -t mockmate-runner-js:latest -f javascript.Dockerfile .
docker build -t mockmate-runner-cpp:latest -f cpp.Dockerfile .

echo "Built mockmate-runner-js:latest and mockmate-runner-cpp:latest"
