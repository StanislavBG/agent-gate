import { loadConfig } from '../config/index.js';
import { runAllGates } from '../runner/index.js';
import { printReport, exitWithVerdict } from '../reporter/index.js';
import { guard } from '@bilkobibitkov/preflight-license';
import chalk from 'chalk';

interface RunOpts {
  config?: string;
  json?: boolean;
  format?: string;
  output?: string;
  fail?: boolean; // commander sets fail=false when --no-fail is passed
}

export async function runRun(opts: RunOpts): Promise<void> {
  // Gate paid formats immediately — before running all gates
  if (opts.format === 'sarif' || opts.format === 'junit') {
    guard('team', { feature: `--format ${opts.format}` });
  }

  let config;
  try {
    config = loadConfig(opts.config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`Error: ${msg}`));
    if (!opts.config) {
      console.error(chalk.dim('No config found. Run: agent-gate init'));
    }
    process.exit(2);
  }

  const cwd = process.cwd();

  try {
    const result = await runAllGates(config, cwd);
    printReport(result, { json: opts.json, format: opts.format, output: opts.output });
    exitWithVerdict(result, opts.fail === false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`Runner error: ${msg}`));
    process.exit(1);
  }
}
