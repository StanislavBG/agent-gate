import { loadConfig } from '../config/index.js';
import { runAllGates } from '../runner/index.js';
import { printReport } from '../reporter/index.js';
import chalk from 'chalk';

interface ReportOpts {
  config?: string;
  json?: boolean;
}

/**
 * 'report' command: runs gates and outputs detailed report without CI exit semantics.
 * Always exits 0 — suitable for dashboards and audit logs.
 */
export async function runReport(opts: ReportOpts): Promise<void> {
  let config;
  try {
    config = loadConfig(opts.config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`Error: ${msg}`));
    process.exit(1);
  }

  const cwd = process.cwd();

  try {
    const result = await runAllGates(config, cwd);
    printReport(result, { json: opts.json });
    // report command: always exit 0
    process.exit(0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`Report error: ${msg}`));
    process.exit(1);
  }
}
