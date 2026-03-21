#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runRun } from './commands/run.js';
import { runReport } from './commands/report.js';

const program = new Command();

program
  .name('agent-gate')
  .description('Pre-deploy CI gate for AI agents: regression tests + compliance + cost — unified pass/fail')
  .version('0.2.0')
  .addHelpText('after', `
Examples:
  agent-gate init           scaffold .agent-gate.yaml (interactive setup)
  agent-gate run            run all gates, exit 1 on any failure (use in CI)
  agent-gate report         detailed report, always exits 0 (use for logs)
  agent-gate run --format sarif --output gate-results.sarif`);

program
  .command('init')
  .description('Scaffold .agent-gate.yaml config in the current directory')
  .option('--output <path>', 'Output path (default: .agent-gate.yaml)')
  .action((opts: { output?: string }) => {
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
  .action((opts: { config?: string; json?: boolean; format?: string; output?: string; fail?: boolean }) => {
    runRun(opts);
  });

program
  .command('report')
  .description('Run all gates and generate a detailed report (always exits 0)')
  .option('--config <path>', 'Path to .agent-gate.yaml (default: .agent-gate.yaml)')
  .option('--json', 'Output as JSON')
  .option('--format <format>', 'Output format: sarif or junit')
  .option('--output <file>', 'Write format output to file instead of stdout')
  .action((opts: { config?: string; json?: boolean; format?: string; output?: string }) => {
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
