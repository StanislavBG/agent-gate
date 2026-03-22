# Changelog

All notable changes to agent-gate are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [0.2.1] — 2026-03-21

### Changed
- Replaced `@preflight/license` dependency with `@bilkobibitkov/preflight-license` (registry-based)

### Fixed
- Exit code alignment with POSIX conventions: no-args exits 0, unknown command exits 2
- `--help` exits 0 in all subcommands (was exiting 1, breaking shell scripts testing for gate availability)

---

## [0.2.0] — 2026-02-28

### Added
- Cross-promo hint after `agent-gate init` — suggests `npx stepproof .` as next step
- `--output <file>` flag on `diff` and `check` subcommands — writes SARIF or JUnit XML
- `CONTRIBUTING.md` — dev setup, how to add new gate checks, PR guidelines
- Usage examples in `--help` output for all subcommands

### Changed
- Config loader now validates YAML schema before parsing (was silently ignoring malformed configs)
- Gate failure output now includes actionable next steps per failed check

---

## [0.1.0] — 2026-01-20

### Added
- Initial release: deployment readiness gate for AI agents
- Orchestrates stepproof (behavioral) + agent-comply (compliance) checks
- `agent-gate check` — runs all registered checks, exits non-zero on failure
- `agent-gate diff` — shows behavioral delta between two agent versions
- `agent-gate init` — scaffolds a `.agent-gate.yaml` config file
- Cost estimation per deployment check
- 12 tests passing on internal test suite

---

## Roadmap

See the [Preflight Roadmap](https://github.com/StanislavBG/Preflight/blob/main/ROADMAP.md) for what's planned across the full suite.

Want to influence priorities? Open a [Feature Request](https://github.com/StanislavBG/agent-gate/issues/new?template=feature_request.yml) or join the [Early Adopter Program](https://github.com/StanislavBG/Preflight/blob/main/EARLY_ADOPTERS.md).
