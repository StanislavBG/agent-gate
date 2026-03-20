# agent-gate

[![Part of Preflight](https://img.shields.io/badge/suite-Preflight-blue)](https://github.com/StanislavBG/agent-gate)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

**One command. Three checks. CI-friendly pass/fail.**

Pre-deploy readiness gate for AI agents. Runs regression tests (Stepproof), compliance scan (agent-comply), and cost estimation in parallel — then exits 0 or 1.

```bash
# Install from GitHub (npm package coming soon)
npm install -g github:StanislavBG/agent-gate github:StanislavBG/stepproof github:StanislavBG/agent-comply
agent-gate run
```

---

## The problem

Shipping an AI agent to production requires three separate checks: did the behavior regress, does it pass compliance policy, and will it blow the budget? These live in separate tools with separate reports and separate CI steps. There's no unified verdict.

`agent-gate` is the glue. One config file, one command, one exit code.

---

## 30-second quickstart

```bash
# Install from GitHub (npm package coming soon)
npm install -g github:StanislavBG/agent-gate github:StanislavBG/stepproof github:StanislavBG/agent-comply

# Scaffold config
agent-gate init

# Run all gates
agent-gate run

# Output:
# ╔══════════════════════════════════════╗
# ║  agent-gate v0.1  — 3 gates          ║
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

Generate a detailed compliance report from last run results.

```bash
agent-gate report
agent-gate report --json
```

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
          npm install -g github:StanislavBG/stepproof github:StanislavBG/agent-comply github:StanislavBG/agent-gate

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
    - npm install -g github:StanislavBG/stepproof github:StanislavBG/agent-comply github:StanislavBG/agent-gate
    - agent-gate run
  artifacts:
    when: always
    paths:
      - gate-report.json
```

---

## Structured reports (v0.2.0)

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

## Part of the Preflight suite

agent-gate is one tool in a suite of AI agent pre-deploy checks:

| Tool | Purpose | Install |
|------|---------|---------|
| **stepproof** | Behavioral regression testing | `npm install -g github:StanislavBG/stepproof` |
| **agent-comply** | EU AI Act compliance scanning | `npm install -g github:StanislavBG/agent-comply` |
| **agent-gate** | Unified pre-deploy CI gate | `npm install -g github:StanislavBG/agent-gate` |
| **agent-shift** | Config versioning + environment promotion | `npm install -g github:StanislavBG/agent-shift` |
| **agent-trace** | Local observability — OTel traces in SQLite | `npm install -g github:StanislavBG/agent-trace` |

Install the full suite:
```bash
npm install -g github:StanislavBG/agent-gate github:StanislavBG/stepproof github:StanislavBG/agent-comply github:StanislavBG/agent-shift github:StanislavBG/agent-trace
```

agent-gate doesn't replace stepproof or agent-comply — it orchestrates them. Use them directly during development. Use agent-gate in CI as the final deploy gate.

---

## Roadmap

**v0.1 (current):** Parallel gate execution, unified pass/fail, JSON output, GitHub Actions integration
**v0.2:** Custom gate plugins, per-gate timeouts, Slack/webhook notifications, dashboard report
**v0.3:** Historical trend tracking, cost forecasting, gate skip rules per branch

---

## License

MIT

---

## Part of the Preflight suite

agent-gate orchestrates the full suite of AI agent pre-deploy checks:

| Tool | Purpose | Install |
|------|---------|---------|
| **stepproof** | Behavioral regression testing | `npm install -g github:StanislavBG/stepproof` |
| **agent-comply** | EU AI Act compliance scanning | `npm install -g github:StanislavBG/agent-comply` |
| **agent-gate** | Unified pre-deploy CI gate | `npm install -g github:StanislavBG/agent-gate` |
| **agent-shift** | Config versioning + environment promotion | `npm install -g github:StanislavBG/agent-shift` |
| **agent-trace** | Local observability — OTel traces in SQLite | `npm install -g github:StanislavBG/agent-trace` |

Install the full suite:
```bash
npm install -g github:StanislavBG/agent-gate github:StanislavBG/stepproof github:StanislavBG/agent-comply github:StanislavBG/agent-shift github:StanislavBG/agent-trace
```
