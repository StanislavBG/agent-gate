# Contributing to agent-gate

Thanks for your interest in contributing. agent-gate is the unified CI gate in the [Preflight](https://github.com/StanislavBG/agent-gate) suite — it orchestrates stepproof and agent-comply and produces a single pass/fail verdict.

## Dev setup

```bash
git clone https://github.com/StanislavBG/agent-gate
cd agent-gate
npm install

# agent-gate shells out to stepproof and agent-comply — install them for full integration testing
npm install -g github:StanislavBG/stepproof github:StanislavBG/agent-comply
```

## Running tests

```bash
npm test
```

All tests use [vitest](https://vitest.dev/). Tests live in `./tests/`.

## Building

```bash
npm run build
```

TypeScript is compiled to `./dist/`. The CLI entry point is `dist/cli.js`.

## Running locally

```bash
# Scaffold a config
npm run dev -- init

# Run all gates
npm run dev -- run

# Or after build
node dist/cli.js init
node dist/cli.js run
```

## Project structure

```
src/
  cli.ts              — CLI entry point (Commander.js commands)
  commands/           — Command implementations (init, run, report)
  gates/              — Gate implementations (stepproof, comply, cost)
  runner/             — Parallel gate runner + verdict aggregation
  config/             — .agent-gate.yaml parsing and validation
  reporter/           — Output formatters (terminal, JSON, SARIF, JUnit)
  types/              — Shared TypeScript types
examples/             — Example .agent-gate.yaml configs
tests/                — Vitest test suite
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
2. Register it in `src/runner/runner.ts`
3. Add the config shape to the YAML config type in `src/config/schema.ts`
4. Add tests in `tests/gates/<name>.test.ts`
5. Document in the README under "Three gates"

## Submitting changes

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Build: `npm run build`
6. Open a PR against `main`

## Code style

- TypeScript strict mode
- Named exports throughout
- Gates run in parallel — no shared mutable state between gate implementations
- Exit codes: `0` = all passed, `1` = gate failure(s), `2` = config/usage error

## Reporting bugs

Open an issue on GitHub with:
- The command you ran
- Your `.agent-gate.yaml` config
- The agent-gate version (`agent-gate --version`)
- The full output (use `agent-gate run --json` for structured output)
- Your Node.js version (`node --version`)

## License

MIT. Contributions are accepted under the same license.
