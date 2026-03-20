import { loadConfig } from '../config/index.js';
import { runAllGates } from '../runner/index.js';
import { printReport, exitWithVerdict } from '../reporter/index.js';
import chalk from 'chalk';
export async function runRun(opts) {
    let config;
    try {
        config = loadConfig(opts.config);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`Error: ${msg}`));
        process.exit(1);
    }
    const cwd = process.cwd();
    try {
        const result = await runAllGates(config, cwd);
        printReport(result, { json: opts.json, format: opts.format });
        exitWithVerdict(result, opts.fail === false);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`Runner error: ${msg}`));
        process.exit(1);
    }
}
//# sourceMappingURL=run.js.map