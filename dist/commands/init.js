import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { DEFAULT_CONFIG_PATH } from '../config/index.js';
const SCAFFOLD = `# agent-gate configuration
# Run 'agent-gate run' to execute all gates.

# Regression testing via stepproof
stepproof:
  scenarios: ./scenarios/
  threshold: all           # 'all' or a fraction like 0.8
  # command: stepproof     # override if installed elsewhere

# EU AI Act compliance via agent-comply
comply:
  policy: .agent-comply/policy.yaml
  # config: comply.yaml    # project comply.yaml (auto-detected if omitted)
  # command: agent-comply  # override binary

# Cost estimation gate
cost:
  budget_per_run: '$0.50'
  model_allowlist:
    - claude-sonnet-4-6
    - claude-haiku-4-5-20251001
    - claude-opus-4-6
`;
export function runInit(outputPath) {
    const dest = resolve(outputPath ?? DEFAULT_CONFIG_PATH);
    if (existsSync(dest)) {
        console.log(chalk.yellow(`Config already exists: ${dest}`));
        console.log(chalk.dim('Delete it first if you want to re-scaffold.'));
        process.exit(0);
    }
    writeFileSync(dest, SCAFFOLD, 'utf-8');
    console.log(chalk.green(`✔ Created ${dest}`));
    console.log('');
    console.log('agent-gate is the pre-deploy CI gate for the Preflight suite.');
    console.log('It orchestrates: regression tests + compliance + cost — unified pass/fail.');
    console.log('');
    console.log('Next:');
    console.log('  1. Edit .agent-gate.yaml to configure your gates');
    console.log(`  2. ${chalk.cyan('agent-gate run')}      — run all gates, exit 1 on any failure`);
    console.log(`  3. ${chalk.cyan('agent-gate report')}   — detailed report, always exit 0`);
    console.log('');
    console.log('Your .agent-gate.yaml references stepproof and agent-comply.');
    console.log('Install the full suite: npm install -g stepproof agent-comply agent-shift agent-trace');
}
//# sourceMappingURL=init.js.map