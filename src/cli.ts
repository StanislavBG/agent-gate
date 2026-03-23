#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runInit } from './commands/init.js';
import { runRun } from './commands/run.js';
import { runReport } from './commands/report.js';
import { sendTelemetry, sendConversionEvent } from './telemetry.js';
import { validate } from '@bilkobibitkov/preflight-license';

/* ── Usage-based monetization (Preflight Suite — shared) ────────────── */

const CLI_VERSION = '0.2.9';
const TOOL_NAME = 'agent-gate' as const;
const FREE_MONTHLY_LIMIT = 50;
const UPGRADE_URL = 'https://buy.stripe.com/28E00l73Ccu9ePH1S08k802';

// Shared suite directory
const SUITE_DIR = path.join(os.homedir(), '.preflight-suite');
const SUITE_USAGE_FILE = path.join(SUITE_DIR, 'usage.json');
const SUITE_LICENSE_FILE = path.join(SUITE_DIR, 'license.json');

// Legacy per-tool config dir (kept for backwards-compat reads)
const CONFIG_DIR = path.join(os.homedir(), '.config', 'agent-gate');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface SharedUsage {
  month: string; // YYYY-MM
  total: number;
  tools: {
    stepproof: number;
    'agent-comply': number;
    'agent-gate': number;
  };
}

/** Read license key: env var → shared suite → legacy tool config */
function getLicenseKey(): string | undefined {
  const envKey = process.env.GATE_KEY;
  if (envKey?.trim()) return envKey.trim();
  try {
    if (fs.existsSync(SUITE_LICENSE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SUITE_LICENSE_FILE, 'utf8')) as { key?: string };
      if (parsed.key?.trim()) return parsed.key.trim();
    }
  } catch { /* ignore */ }
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as { key?: string };
      if (parsed.key?.trim()) return parsed.key.trim();
    }
  } catch { /* ignore */ }
  return undefined;
}

function isProUser(): boolean {
  const key = getLicenseKey();
  if (!key) return false;
  const result = validate(key);
  return result.valid && result.tier !== 'free';
}

function readSharedUsage(): SharedUsage {
  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    if (fs.existsSync(SUITE_USAGE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SUITE_USAGE_FILE, 'utf8')) as SharedUsage;
      if (parsed.month === currentMonth) return parsed;
    }
  } catch { /* corrupted — reset */ }
  return { month: currentMonth, total: 0, tools: { stepproof: 0, 'agent-comply': 0, 'agent-gate': 0 } };
}

function writeSharedUsage(record: SharedUsage): void {
  try {
    fs.mkdirSync(SUITE_DIR, { recursive: true });
    fs.writeFileSync(SUITE_USAGE_FILE, JSON.stringify(record, null, 2), 'utf8');
  } catch { /* degrade gracefully */ }
}

export function checkUsageLimit(): boolean {
  if (isProUser()) return true;
  const usage = readSharedUsage();
  if (usage.total >= FREE_MONTHLY_LIMIT) {
    process.stderr.write(
      `\n  You've used ${FREE_MONTHLY_LIMIT}/${FREE_MONTHLY_LIMIT} free runs this month.\n` +
      `  Upgrade to Team for unlimited runs: ${UPGRADE_URL}\n` +
      `  Already have a key? agent-gate activate <key>\n\n`
    );
    sendConversionEvent({ event: 'limit_reached', version: CLI_VERSION, runs_used: usage.total, runs_remaining: 0 });
    return false;
  }
  return true;
}

export function trackUsageAfterRun(): void {
  if (isProUser()) return;
  const usage = readSharedUsage();
  usage.total += 1;
  usage.tools[TOOL_NAME] = (usage.tools[TOOL_NAME] ?? 0) + 1;
  writeSharedUsage(usage);

  const used = usage.total;
  const remaining = FREE_MONTHLY_LIMIT - used;

  let msg: string;
  if (remaining === 0) {
    msg = `\n  ${used}/${FREE_MONTHLY_LIMIT} free Preflight runs used — cap reached.\n` +
          `  Upgrade to Team for unlimited runs: ${UPGRADE_URL}\n\n`;
    sendConversionEvent({ event: 'upgrade_prompt_shown', version: CLI_VERSION, runs_used: used, runs_remaining: remaining });
  } else if (remaining <= 5) {
    msg = `\n  ${used}/${FREE_MONTHLY_LIMIT} free Preflight runs used — ${remaining} left this month.\n` +
          `  Team tier removes the cap · $49/mo → ${UPGRADE_URL}\n\n`;
    sendConversionEvent({ event: 'upgrade_prompt_shown', version: CLI_VERSION, runs_used: used, runs_remaining: remaining });
  } else {
    msg = `\n  Run ${used} of ${FREE_MONTHLY_LIMIT} free Preflight runs this month.\n\n`;
  }
  process.stderr.write(msg);
}

const program = new Command();

program
  .name('agent-gate')
  .description('Pre-deploy CI gate for AI agents: regression tests + compliance + cost — unified pass/fail')
  .version(CLI_VERSION)
  .addHelpText('after', `
Examples:
  agent-gate init           scaffold .agent-gate.yaml (interactive setup)
  agent-gate run            run all gates, exit 1 on any failure (use in CI)
  agent-gate report         detailed report, always exits 0 (use for logs)
  agent-gate run --format sarif --output gate-results.sarif`);

program
  .command('activate <key>')
  .description('Store a license key for unlimited runs')
  .action((key: string) => {
    const result = validate(key);
    if (!result.valid) {
      process.stderr.write(`\nInvalid license key: ${result.reason}\n\n`);
      process.exit(1);
    }
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ key }), 'utf8');
      console.log(`\nLicense activated (${result.tier} — ${result.org}). Unlimited runs enabled.\n`);
    } catch (e) {
      process.stderr.write(`\nFailed to save license: ${(e as Error).message}\n\n`);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Scaffold .agent-gate.yaml config in the current directory')
  .option('--output <path>', 'Output path (default: .agent-gate.yaml)')
  .action((opts: { output?: string }) => {
    sendTelemetry({ command: 'init', version: CLI_VERSION });
    if (opts.output && opts.output.includes('\0')) {
      process.stderr.write('\nError: Invalid --output path — null bytes are not allowed\n');
      process.exit(2);
    }
    runInit(opts.output);
  });


program
  .command('run')
  .description('Run all gates and produce a unified pass/fail verdict')
  .option('--config <path>', 'Path to .agent-gate.yaml (default: .agent-gate.yaml)')
  .option('--json', 'Output result as JSON')
  .option('--format <format>', 'Output format: sarif or junit')
  .option('--output <file>', 'Write format output to file instead of stdout')
  .option('--no-fail', 'Exit 0 even on gate failures (report-only mode)')
  .addHelpText('after', `
Examples:
  agent-gate run                                        run all gates (CI mode, exit 1 on failure)
  agent-gate run --config ./ci/gate.yaml                use custom config path
  agent-gate run --json > gate-report.json              JSON output for CI artifact upload
  agent-gate run --format sarif --output gate.sarif     SARIF for GitHub Security tab
  agent-gate run --no-fail                              always exit 0 (report-only mode)`)
  .action((opts: { config?: string; json?: boolean; format?: string; output?: string; fail?: boolean }) => {
    sendTelemetry({ command: 'run', version: CLI_VERSION });
    for (const [flag, val] of [['--config', opts.config], ['--output', opts.output]] as [string, string | undefined][]) {
      if (val && val.includes('\0')) {
        process.stderr.write(`\nError: Invalid ${flag} path — null bytes are not allowed\n`);
        process.exit(2);
      }
    }
    if (!checkUsageLimit()) process.exit(1);
    process.on('exit', trackUsageAfterRun);
    runRun(opts);
  });

program
  .command('report')
  .description('Run all gates and generate a detailed report (always exits 0)')
  .option('--config <path>', 'Path to .agent-gate.yaml (default: .agent-gate.yaml)')
  .option('--json', 'Output as JSON')
  .option('--format <format>', 'Output format: sarif or junit')
  .option('--output <file>', 'Write format output to file instead of stdout')
  .addHelpText('after', `
Examples:
  agent-gate report                           human-readable summary (always exits 0)
  agent-gate report --json                    JSON format (pipe to jq or save to file)
  agent-gate report --format junit > results.xml  JUnit XML for CI artifact upload`)
  .action((opts: { config?: string; json?: boolean; format?: string; output?: string }) => {
    sendTelemetry({ command: 'report', version: CLI_VERSION });
    for (const [flag, val] of [['--config', opts.config], ['--output', opts.output]] as [string, string | undefined][]) {
      if (val && val.includes('\0')) {
        process.stderr.write(`\nError: Invalid ${flag} path — null bytes are not allowed\n`);
        process.exit(2);
      }
    }
    runReport(opts);
  });

program.action(() => {
  const extra = process.argv.slice(2).filter(a => !a.startsWith('-'));
  if (extra.length > 0) {
    process.stderr.write(`\nError: Unknown command '${extra[0]}'\nRun 'agent-gate --help' for usage.\n\n`);
    process.exit(2);
  }
  program.help(); // exits 0
});

program.parse();
