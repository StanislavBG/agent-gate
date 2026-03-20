import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const execFileAsync = promisify(execFile);
export async function runComplyGate(config, cwd) {
    const start = Date.now();
    const command = config.command ?? 'agent-comply';
    const policyPath = config.policy ? resolve(cwd, config.policy) : null;
    const configPath = config.config ? resolve(cwd, config.config) : null;
    // Check if agent-comply is available
    try {
        await execFileAsync(command, ['--version'], { cwd });
    }
    catch {
        return {
            gate: 'comply',
            status: 'skipped',
            passed: true,
            duration_ms: Date.now() - start,
            details: {
                reason: `'${command}' not found — install agent-comply or set comply.command in config`,
            },
        };
    }
    const args = ['check'];
    if (policyPath) {
        if (!existsSync(policyPath)) {
            return {
                gate: 'comply',
                status: 'skipped',
                passed: true,
                duration_ms: Date.now() - start,
                details: {
                    reason: `Policy file not found: ${config.policy}`,
                    policy_path: policyPath,
                },
            };
        }
        args.push(policyPath);
    }
    if (configPath) {
        args.push('--config', configPath);
    }
    try {
        const { stdout } = await execFileAsync(command, args, { cwd });
        const allPassed = !stdout.toLowerCase().includes('fail') &&
            !stdout.toLowerCase().includes('violation');
        return {
            gate: 'comply',
            status: allPassed ? 'passed' : 'failed',
            passed: allPassed,
            duration_ms: Date.now() - start,
            details: {
                output: stdout.trim(),
                policy: config.policy ?? 'none',
            },
        };
    }
    catch (err) {
        const e = err;
        const output = (e.stdout ?? '') + (e.stderr ?? '');
        return {
            gate: 'comply',
            status: 'failed',
            passed: false,
            duration_ms: Date.now() - start,
            details: {
                output: output.trim(),
                error: e.message ?? 'agent-comply exited with non-zero status',
                policy: config.policy ?? 'none',
            },
        };
    }
}
//# sourceMappingURL=comply-gate.js.map