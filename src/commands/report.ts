import { loadConfig } from '../config/index.js';
import { runAllGates } from '../runner/index.js';
import { printReport } from '../reporter/index.js';
import { guard } from '@preflight/license';
import chalk from 'chalk';

interface ReportOpts {
  config?: string;
  json?: boolean;
  format?: string;
  output?: string;
}

/**
 * 'report' command: runs gates and outputs detailed report without CI exit semantics.
 * Always exits 0 — suitable for dashboards and audit logs.
 */
export async function runReport(opts: ReportOpts): Promise<void> {
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
    // report command: always exit 0
    process.exit(0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`Report error: ${msg}`));
    process.exit(1);
  }
}
