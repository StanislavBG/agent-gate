# Contributing to agent-gate

Thanks for your interest in contributing. agent-gate is the unified CI gate in the [Preflight](https://github.com/StanislavBG/agent-gate) suite — it orchestrates stepproof and agent-comply and produces a single pass/fail verdict.

## Dev setup

```bash
git clone https://github.com/StanislavBG/agent-gate.git
cd agent-gate
npm install
npm test
```

Requires Node.js 18+.

For full integration testing, install the tools that agent-gate shells out to:

```bash
npm install -g stepproof agent-comply
```

Unit tests mock child process output and do not require these to be installed.

## How agent-gate orchestrates stepproof and agent-comply

agent-gate does not implement regression testing or compliance scanning itself — it shells out to `stepproof` and `agent-comply`, collects their results, and produces a unified verdict.

**Gate execution flow:**

1. `agent-gate run` reads `.agent-gate.yaml`
2. Each enabled gate is spawned as a child process in parallel via `src/runner/`
3. `stepproof-gate.ts` calls `stepproof run` and parses its exit code and output
4. `comply-gate.ts` calls `agent-comply scan` and parses its exit code and output
5. `cost-gate.ts` runs offline — reads model config from `.agent-gate.yaml`, estimates cost, compares against budget
6. Results are collected by the runner and passed to the reporter
7. Reporter formats output (terminal, JSON, SARIF, JUnit) and the process exits 0 or 1

The `report` command follows the same path but always exits 0 — it is for inspection, not enforcement.

## Project structure

```
src/
  cli.ts                  Entry point — registers commands with commander
  commands/
    init.ts               Scaffolds .agent-gate.yaml
    run.ts                Wires up runner → reporter → exit code
    report.ts             Same as run but forces exit 0
  config/
    index.ts              Loads and validates .agent-gate.yaml
  gates/
    stepproof-gate.ts     Shells out to stepproof, returns GateResult
    comply-gate.ts        Shells out to agent-comply, returns GateResult
    cost-gate.ts          Offline cost estimation, returns GateResult
  runner/
    index.ts              Runs gates in parallel, collects GateResult[]
  reporter/
    index.ts              Formats GateResult[] as terminal/JSON/SARIF/JUnit
  types/
    index.ts              Shared TypeScript types (GateResult, GateConfig, etc.)
examples/                 Example .agent-gate.yaml configs
tests/                    Vitest test suite
```

## The gate model

Each gate in `src/gates/` implements this interface:

```typescript
interface Gate {
  name: string;
  run(config: GateConfig): Promise<GateResult>;
}

interface GateResult {
  passed: boolean;
  summary: string;
  details?: string;
  durationMs: number;
}
```

To add a new gate:
1. Create `src/gates/<name>.ts` implementing `Gate`
2. Register it in `src/runner/index.ts`
3. Add the config shape to the YAML config type in `src/config/index.ts`
4. Add tests in `tests/`
5. Document in the README under "Three gates"

## Running tests

```bash
npm test
```

Uses [Vitest](https://vitest.dev/). Tests live in `tests/`. Gate tests mock child process output rather than calling real binaries — keep it that way so the suite runs without stepproof or agent-comply installed.

## Building

```bash
npm run build
```

Compiles TypeScript to `dist/` via `tsc`. The `dist/cli.js` entry point is what gets executed when you run `agent-gate` after a global install.

## Running locally without installing

```bash
# Scaffold a config
npm run dev -- init

# Run all gates
npm run dev -- run

# Or after build
node dist/cli.js init
node dist/cli.js run
```

## Config format

`.agent-gate.yaml` drives all behavior. Each top-level key maps to a gate:

```yaml
stepproof:
  scenarios: ./scenarios/       # path to scenario YAML files
  threshold: all                # 'all' or a fraction, e.g. 0.9

comply:
  policy: .agent-comply/policy.yaml  # path to agent-comply policy

cost:
  budget_per_run: "$0.50"       # string with dollar sign
  model_allowlist:              # models expected in this project
    - claude-sonnet-4-6
    - claude-haiku-4-5-20251001
```

Set any gate to `false` to disable it:

```yaml
stepproof: false
```

Config loading and validation live in `src/config/index.ts`.

## PR guidelines

Before opening a pull request:

- **Tests are required.** New gate behavior, new flags, and bug fixes must include tests. PRs without tests will not be merged.
- **TypeScript only.** No JavaScript files in `src/`. Strict mode is on.
- **Exit codes must be correct.** `agent-gate run` must exit `1` when any gate fails and `0` when all pass. `agent-gate report` must always exit `0`. Never break this contract — CI pipelines depend on it.
- **Keep gates independent.** Each gate in `src/gates/` must be self-contained. No cross-gate imports.
- **No new runtime dependencies without discussion.** The core dependency surface should stay small.
- **Named exports throughout.** No default exports in `src/`.
- **Gates run in parallel — no shared mutable state** between gate implementations.

Submitting:
1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes and add tests
4. Run `npm test && npm run build`
5. Open a PR against `main`

## Reporting issues

Open an issue on GitHub with:

- agent-gate version (`agent-gate --version`)
- Node.js version (`node --version`)
- Your `.agent-gate.yaml` (redact any secrets)
- The full terminal output (use `agent-gate run --json` for structured output)
- Expected vs actual behavior

For bugs in stepproof or agent-comply output parsing, include the raw output of the underlying tool as well.

## License

MIT. Contributions are accepted under the same license.
