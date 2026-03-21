# agent-gate

[![Part of Preflight](https://img.shields.io/badge/suite-Preflight-blue)](https://github.com/StanislavBG/agent-gate)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

**One command. Three checks. CI-friendly pass/fail.**

Pre-deploy readiness gate for AI agents. Runs regression tests (Stepproof), compliance scan (agent-comply), and cost estimation in parallel — then exits 0 or 1.

```bash
npm install -g agent-gate stepproof agent-comply
agent-gate run
```

---

## The problem

Shipping an AI agent to production requires three separate checks: did the behavior regress, does it pass compliance policy, and will it blow the budget? These live in separate tools with separate reports and separate CI steps. There's no unified verdict.

`agent-gate` is the glue. One config file, one command, one exit code.

---

## 30-second quickstart

```bash
npm install -g agent-gate stepproof agent-comply

# Scaffold config
agent-gate init

# Run all gates
agent-gate run

# Output:
# ╔══════════════════════════════════════╗
# ║  agent-gate v0.2.0  — 3 gates        ║
# ╚══════════════════════════════════════╝
#
# ✓  stepproof    12/12 scenarios passed    (4.2s)
# ✓  comply       No violations found        (1.8s)
# ⚠  cost         $0.31 / $0.50 budget       (0.1s)
#
# ══════════════════════════════════════
# Verdict: PASS  (6.1s)
# ══════════════════════════════════════
#
# Exit code: 0
```

---

## Three gates

### 1. Stepproof — regression testing

Shells out to `stepproof run` against your scenario YAML files. Each scenario defines inputs, expected outputs, and pass criteria. Gate fails if any scenario fails (or if pass rate drops below your threshold).

**Requires:** [stepproof](https://github.com/StanislavBG/stepproof) installed

### 2. agent-comply — EU AI Act compliance

Shells out to `agent-comply scan` against your source directory. Gate fails if any classified model usage violates your policy file.

**Requires:** [agent-comply](https://github.com/StanislavBG/agent-comply) installed

### 3. Cost estimation

Reads your model config and estimates cost per run against model pricing. Warns (or fails) if you exceed the configured budget.

**Requires:** nothing — runs offline from your `.agent-gate.yaml`

---

## Config

```bash
agent-gate init
```

Scaffolds `.agent-gate.yaml` in the current directory:

```yaml
stepproof:
  scenarios: ./scenarios/
  threshold: all              # 'all' or a number (e.g. 0.9 for 90%)

comply:
  policy: .agent-comply/policy.yaml

cost:
  budget_per_run: "$0.50"
  model_allowlist:
    - claude-sonnet-4-6
    - claude-haiku-4-5-20251001
```

Disable a gate by setting it to `false`:

```yaml
stepproof: false   # skip regression tests
comply:
  policy: .agent-comply/policy.yaml
cost:
  budget_per_run: "$1.00"
```

---

## CLI commands

### `agent-gate run`

Run all enabled gates and produce a unified verdict.

```bash
agent-gate run                          # uses .agent-gate.yaml
agent-gate run --config ./ci/gate.yaml  # custom config path
agent-gate run --json                   # JSON output (for CI artifacts)
agent-gate run --no-fail                # always exit 0 (report-only)
agent-gate run --format sarif           # SARIF 2.1.0 output
agent-gate run --format junit           # JUnit XML output
```

**Exit codes:**
- `0` — all gates passed
- `1` — one or more gates failed

### `agent-gate init`

Scaffold a `.agent-gate.yaml` config.

```bash
agent-gate init                         # writes .agent-gate.yaml
agent-gate init --output ./ci/gate.yaml # custom output path
```

### `agent-gate report`

Run all gates and generate a detailed report (always exits 0).

```bash
agent-gate report                       # human-readable terminal output
agent-gate report --json                # JSON format
agent-gate report --format junit        # JUnit XML format
agent-gate report --format sarif        # SARIF 2.1.0 format
```

Use `--format` to control output format. The `report` command always exits 0 regardless of gate results — it is for inspection, not enforcement.

---

## CI integration

### GitHub Actions

```yaml
name: Agent Gate

on: [push, pull_request]

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install gates
        run: |
          npm install -g stepproof agent-comply agent-gate

      - name: Run agent-gate
        run: agent-gate run --json > gate-report.json

      - name: Upload gate report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: gate-report
          path: gate-report.json
```

### GitLab CI

```yaml
agent-gate:
  image: node:20
  script:
    - npm install -g stepproof agent-comply agent-gate
    - agent-gate run
  artifacts:
    when: always
    paths:
      - gate-report.json
```

---

## Structured reports

agent-gate outputs machine-readable SARIF 2.1.0 and JUnit XML for CI pipeline integration.

```bash
# Run all gates and output SARIF
agent-gate run --format sarif
agent-gate run --format sarif > gate-results.sarif

# Generate report in JUnit XML
agent-gate report --format junit
```

Integrate with GitHub Advanced Security:

```yaml
# .github/workflows/agent-gate.yml
- name: Run agent gate
  run: agent-gate run --format sarif > gate-results.sarif

- name: Upload to GitHub Security tab
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: gate-results.sarif
  if: always()
```

Gate failures (regression tests, compliance violations, cost overruns) appear as code scanning alerts. Default output (no `--format` flag) is unchanged — human-readable terminal output.

---

## Roadmap

**v0.2.0 (current):** Parallel gate execution, unified pass/fail, JSON output, SARIF/JUnit structured reports, GitHub Actions integration

**v0.3.0 (next):** Custom gate plugins, per-gate timeouts, Slack/webhook notifications, dashboard report

**v0.4.0:** Historical trend tracking, cost forecasting, gate skip rules per branch

---

## License

MIT

---

## Part of the Preflight suite

agent-gate is one tool in a suite of AI agent pre-deploy checks. It orchestrates stepproof and agent-comply — use them directly during development, use agent-gate in CI as the final deploy gate.

| Tool | Purpose | Install |
|------|---------|---------|
| **stepproof** | Behavioral regression testing | `npm install -g stepproof` |
| **agent-comply** | EU AI Act compliance scanning | `npm install -g agent-comply` |
| **agent-gate** | Unified pre-deploy CI gate | `npm install -g agent-gate` |
| **agent-shift** | Config versioning + environment promotion | `npm install -g agent-shift` |
| **agent-trace** | Local observability — OTel traces in SQLite | `npm install -g agent-trace` |

Install the full suite:
```bash
npm install -g agent-gate stepproof agent-comply agent-shift agent-trace
```
