import chalk from 'chalk';
import { guard } from '@preflight/license';
export function formatSarif(result) {
    const rules = result.gates.map((g) => ({
        id: g.gate,
        name: g.gate,
        shortDescription: { text: `agent-gate: ${g.gate}` },
    }));
    const results = result.gates.map((g) => {
        const level = g.passed || g.status === 'skipped' ? 'none' : 'error';
        const detailsSummary = Object.entries(g.details)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(', ');
        const text = detailsSummary
            ? `${g.gate}: ${detailsSummary}`
            : g.gate;
        return {
            ruleId: g.gate,
            level,
            message: { text },
        };
    });
    const sarif = {
        $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
        version: '2.1.0',
        runs: [
            {
                tool: {
                    driver: {
                        name: 'agent-gate',
                        version: '0.1.0',
                        rules,
                    },
                },
                results,
            },
        ],
    };
    return JSON.stringify(sarif, null, 2);
}
export function formatJunit(result) {
    const total = result.gates.length;
    const failures = result.gates.filter((g) => !g.passed && g.status !== 'skipped').length;
    const totalSeconds = (result.duration_ms / 1000).toFixed(3);
    function escapeXml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    const testcases = result.gates.map((g) => {
        const timeSeconds = (g.duration_ms / 1000).toFixed(3);
        const attrs = `name="${escapeXml(g.gate)}" classname="agent-gate.gates" time="${timeSeconds}"`;
        if (g.status === 'skipped') {
            return `    <testcase ${attrs}>\n      <skipped/>\n    </testcase>`;
        }
        if (!g.passed) {
            const msg = escapeXml(g.error || 'Gate failed');
            const body = escapeXml(JSON.stringify(g.details, null, 2));
            return `    <testcase ${attrs}>\n      <failure message="${msg}">${body}</failure>\n    </testcase>`;
        }
        return `    <testcase ${attrs}/>`;
    }).join('\n');
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<testsuites name="agent-gate" tests="${total}" failures="${failures}" time="${totalSeconds}">`,
        `  <testsuite name="agent-gate gates" tests="${total}" failures="${failures}" time="${totalSeconds}">`,
        testcases,
        '  </testsuite>',
        '</testsuites>',
    ].join('\n');
}
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
    if (opts.format === 'sarif' || opts.format === 'junit') {
        guard('team', { feature: `--format ${opts.format}` });
    }
    if (opts.format === 'sarif') {
        process.stdout.write(formatSarif(result) + '\n');
        return;
    }
    if (opts.format === 'junit') {
        process.stdout.write(formatJunit(result) + '\n');
        return;
    }
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