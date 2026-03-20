import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
const execFileAsync = promisify(execFile);
export async function runStepproofGate(config, cwd) {
    const start = Date.now();
    const command = config.command ?? 'stepproof';
    const scenariosPath = resolve(cwd, config.scenarios);
    // Find scenario files
    let scenarioFiles = [];
    if (existsSync(scenariosPath)) {
        const stat = (await import('node:fs/promises')).stat(scenariosPath);
        const s = await stat;
        if (s.isDirectory()) {
            scenarioFiles = readdirSync(scenariosPath)
                .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
                .map((f) => join(scenariosPath, f));
        }
        else {
            scenarioFiles = [scenariosPath];
        }
    }
    if (scenarioFiles.length === 0) {
        return {
            gate: 'stepproof',
            status: 'skipped',
            passed: true,
            duration_ms: Date.now() - start,
            details: {
                reason: `No scenario files found at: ${config.scenarios}`,
                scenarios_path: scenariosPath,
            },
        };
    }
    // Check if stepproof is available
    try {
        await execFileAsync(command, ['--version'], { cwd });
    }
    catch {
        return {
            gate: 'stepproof',
            status: 'skipped',
            passed: true,
            duration_ms: Date.now() - start,
            details: {
                reason: `'${command}' not found — install stepproof or set stepproof.command in config`,
                scenarios_found: scenarioFiles.length,
            },
        };
    }
    // Run each scenario
    const results = [];
    for (const scenarioFile of scenarioFiles) {
        try {
            const { stdout } = await execFileAsync(command, ['run', scenarioFile, '--quiet'], { cwd });
            results.push({ file: scenarioFile, passed: true, output: stdout });
        }
        catch (err) {
            const e = err;
            results.push({
                file: scenarioFile,
                passed: false,
                output: e.stdout ?? '',
                error: e.stderr ?? e.message ?? 'Unknown error',
            });
        }
    }
    const passedCount = results.filter((r) => r.passed).length;
    const threshold = config.threshold ?? 'all';
    const required = threshold === 'all' ? scenarioFiles.length : Math.ceil(scenarioFiles.length * threshold);
    const passed = passedCount >= required;
    return {
        gate: 'stepproof',
        status: passed ? 'passed' : 'failed',
        passed,
        duration_ms: Date.now() - start,
        details: {
            scenarios_total: scenarioFiles.length,
            scenarios_passed: passedCount,
            scenarios_failed: scenarioFiles.length - passedCount,
            threshold,
            results: results.map((r) => ({
                file: r.file,
                passed: r.passed,
                error: r.error,
            })),
        },
    };
}
//# sourceMappingURL=stepproof-gate.js.map