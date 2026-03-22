#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runInit } from './commands/init.js';
import { runRun } from './commands/run.js';
import { runReport } from './commands/report.js';
import { sendTelemetry } from './telemetry.js';
import { validate } from '@bilkobibitkov/preflight-license';

/* ── Usage-based monetization ───────────────────────────────────────── */

const FREE_MONTHLY_LIMIT = 10;
const UPGRADE_URL = 'https://buy.stripe.com/28E00l73Ccu9ePH1S08k802';
const CONFIG_DIR = path.join(os.homedir(), '.config', 'agent-gate');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const USAGE_FILE = path.join(CONFIG_DIR, 'usage.json');

interface UsageRecord {
  month: string; // YYYY-MM
  count: number;
}

function getGateKey(): string | undefined {
  const envKey = process.env.GATE_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw) as { key?: string };
      if (parsed.key && parsed.key.trim()) return parsed.key.trim();
    }
  } catch { /* corrupted config — ignore */ }
  return undefined;
}

function isProUser(): boolean {
  const key = getGateKey();
  if (!key) return false;
  const result = validate(key);
  return result.valid && result.tier !== 'free';
}

function readUsage(): UsageRecord {
  const currentMonth = new Date().toISOString().slice(0, 7);
  try {
    if (fs.existsSync(USAGE_FILE)) {
      const raw = fs.readFileSync(USAGE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as UsageRecord;
      if (parsed.month === currentMonth) return parsed;
    }
  } catch { /* corrupted — reset */ }
  return { month: currentMonth, count: 0 };
}

function writeUsage(record: UsageRecord): void {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(USAGE_FILE, JSON.stringify(record), 'utf8');
  } catch { /* degrade gracefully */ }
}

export function checkUsageLimit(): boolean {
  if (isProUser()) return true;
  const usage = readUsage();
  if (usage.count >= FREE_MONTHLY_LIMIT) {
    process.stderr.write(
      `\nYou've used ${FREE_MONTHLY_LIMIT}/${FREE_MONTHLY_LIMIT} free runs this month. ` +
      `Upgrade to Preflight Team ($49/mo) for unlimited runs + SARIF/JUnit CI output → ${UPGRADE_URL}\n\n`
    );
    return false;
  }
  return true;
}

export function trackUsageAfterRun(): void {
  if (isProUser()) return;
  const usage = readUsage();
  usage.count += 1;
  writeUsage(usage);
  const remaining = FREE_MONTHLY_LIMIT - usage.count;
  process.stderr.write(
    `\n${remaining}/${FREE_MONTHLY_LIMIT} free runs remaining this month. ` +
    `Upgrade to Preflight Team ($49/mo) for unlimited runs + SARIF/JUnit CI output → ${UPGRADE_URL}\n`
  );
}

const program = new Command();

program
  .name('agent-gate')
  .description('Pre-deploy CI gate for AI agents: regression tests + compliance + cost — unified pass/fail')
  .version('0.2.3')
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
    sendTelemetry({ command: 'init', version: '0.2.3' });
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
    sendTelemetry({ command: 'run', version: '0.2.3' });
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
    sendTelemetry({ command: 'report', version: '0.2.3' });
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
