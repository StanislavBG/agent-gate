#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runRun } from './commands/run.js';
import { runReport } from './commands/report.js';
const program = new Command();
program
    .name('agent-gate')
    .description('Pre-deploy CI gate for AI agents: regression tests + compliance + cost — unified pass/fail')
    .version('0.2.0');
program
    .command('init')
    .description('Scaffold .agent-gate.yaml config in the current directory')
    .option('--output <path>', 'Output path (default: .agent-gate.yaml)')
    .action((opts) => {
    runInit(opts.output);
});
program
    .command('run')
    .description('Run all gates and produce a unified pass/fail verdict')
    .option('--config <path>', 'Path to .agent-gate.yaml (default: .agent-gate.yaml)')
    .option('--json', 'Output result as JSON')
    .option('--format <format>', 'Output format: sarif or junit')
    .option('--no-fail', 'Exit 0 even on gate failures (report-only mode)')
    .action((opts) => {
    runRun(opts);
});
program
    .command('report')
    .description('Run all gates and generate a detailed report (always exits 0)')
    .option('--config <path>', 'Path to .agent-gate.yaml (default: .agent-gate.yaml)')
    .option('--json', 'Output as JSON')
    .option('--format <format>', 'Output format: sarif or junit')
    .action((opts) => {
    runReport(opts);
});
program.parse();
//# sourceMappingURL=cli.js.map