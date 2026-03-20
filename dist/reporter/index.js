import chalk from 'chalk';
const PASS = chalk.green('✔ PASS');
const FAIL = chalk.red('✗ FAIL');
const SKIP = chalk.yellow('— SKIP');
function statusLabel(g) {
    if (g.status === 'skipped')
        return SKIP;
    return g.passed ? PASS : FAIL;
}
function formatDetails(details) {
    const parts = [];
    if (typeof details.reason === 'string') {
        parts.push(chalk.dim(details.reason));
    }
    if (typeof details.scenarios_total === 'number') {
        parts.push(`${details.scenarios_passed}/${details.scenarios_total} scenarios passed`);
    }
    if (Array.isArray(details.violations) && details.violations.length > 0) {
        parts.push(`${details.violations.length} violation(s)`);
    }
    if (Array.isArray(details.models_found) && details.models_found.length > 0) {
        parts.push(`models: ${details.models_found.join(', ')}`);
    }
    if (typeof details.output === 'string' && details.output.length > 0) {
        // Truncate long comply output to one line
        const first = details.output.split('\n')[0];
        parts.push(first.length > 80 ? first.slice(0, 77) + '...' : first);
    }
    if (typeof details.error === 'string') {
        parts.push(chalk.red(details.error));
    }
    return parts.join(chalk.dim(' · ')) || chalk.dim('ok');
}
export function printReport(result, opts = {}) {
    if (opts.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
    }
    const width = 60;
    const hr = chalk.dim('─'.repeat(width));
    console.log();
    console.log(chalk.bold('  agent-gate') + chalk.dim(' · pre-deploy CI gate'));
    console.log(chalk.dim(`  ${result.timestamp}  ${result.duration_ms}ms`));
    console.log();
    // Gate table
    console.log(hr);
    console.log(chalk.dim('  GATE          STATUS   DETAILS'));
    console.log(hr);
    for (const g of result.gates) {
        const name = g.gate.padEnd(13);
        const status = statusLabel(g);
        const details = formatDetails(g.details);
        console.log(`  ${name}  ${status}   ${details}`);
    }
    console.log(hr);
    // Verdict
    const verdictLine = result.passed
        ? chalk.bold.green(`  VERDICT: PASS`) + chalk.dim(`  (${result.duration_ms}ms)`)
        : chalk.bold.red(`  VERDICT: FAIL`) + chalk.dim(`  — fix failing gates before deploying`);
    console.log(verdictLine);
    console.log();
}
export function exitWithVerdict(result, noFail = false) {
    const code = result.passed || noFail ? 0 : 1;
    process.exit(code);
}
//# sourceMappingURL=index.js.map