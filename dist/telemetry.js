/**
 * Anonymous telemetry for agent-gate CLI.
 *
 * What we collect: install_id (random UUID, never tied to a person), command name,
 * node version, OS platform, run outcome (pass/fail/error), CLI version.
 *
 * What we do NOT collect: file paths, file contents, usernames, email, IP (hashed server-side).
 *
 * Opt-out: set PREFLIGHT_NO_TELEMETRY=1 in your environment.
 *
 * Data goes to: https://content-grade.onrender.com/api/telemetry
 * Stored in: SQLite on Render (cli_telemetry table)
 */
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
const TELEMETRY_URL = 'https://content-grade.onrender.com/api/telemetry/events';
const CONFIG_DIR = path.join(os.homedir(), '.config', 'agent-gate');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
/** Get or create a persistent anonymous install ID stored in ~/.config/agent-gate/config.json */
function getOrCreateInstallId() {
    try {
        let config = {};
        if (fs.existsSync(CONFIG_FILE)) {
            try {
                config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            }
            catch {
                // Corrupted config — start fresh
            }
        }
        if (typeof config.install_id === 'string' && config.install_id.length > 0) {
            return config.install_id;
        }
        const id = crypto.randomUUID();
        config.install_id = id;
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config), 'utf8');
        return id;
    }
    catch {
        return 'unknown';
    }
}
// Pending telemetry promise — drained before process.exit fires.
let _pending = null;
/**
 * Intercept process.exit so we can drain the pending telemetry promise first.
 * Call this once at module initialization (it's idempotent).
 */
function installExitHook() {
    const _origExit = process.exit.bind(process);
    process.exit = ((code) => {
        if (_pending) {
            const p = _pending;
            _pending = null;
            // Give it up to 2s, then force exit regardless
            const safetyTimer = setTimeout(() => _origExit(code), 2000);
            p.then(() => {
                clearTimeout(safetyTimer);
                _origExit(code);
            }).catch(() => {
                clearTimeout(safetyTimer);
                _origExit(code);
            });
            // Return is technically unreachable; needed for TypeScript
            return undefined;
        }
        return _origExit(code);
    });
}
installExitHook();
/**
 * Fire a telemetry ping for a command invocation.
 * Stores the promise in _pending so the exit hook can drain it.
 * Returns the promise (callers that await it get fast resolution too).
 */
export function sendTelemetry(payload) {
    if (process.env.PREFLIGHT_NO_TELEMETRY === '1') {
        return Promise.resolve();
    }
    const installId = getOrCreateInstallId();
    const body = JSON.stringify({
        installId,
        package: 'agent-gate',
        event: 'run',
        command: payload.command,
        success: payload.exit_code === undefined ? true : payload.exit_code === 0,
        version: payload.version,
        platform: process.platform,
        nodeVersion: process.version,
        exit_code: payload.exit_code,
        duration_ms: payload.duration_ms,
    });
    const p = new Promise((resolve) => {
        const timeout = setTimeout(resolve, 3000);
        try {
            const controller = new AbortController();
            const abortTimer = setTimeout(() => controller.abort(), 2500);
            fetch(TELEMETRY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                signal: controller.signal,
            })
                .catch(() => { })
                .finally(() => {
                clearTimeout(abortTimer);
                clearTimeout(timeout);
                resolve();
            });
        }
        catch {
            clearTimeout(timeout);
            resolve();
        }
    });
    _pending = p;
    return p;
}
/**
 * Fire a conversion funnel event (limit_reached or upgrade_prompt_shown).
 * Fire-and-forget — never blocks the CLI.
 */
export function sendConversionEvent(payload) {
    if (process.env.PREFLIGHT_NO_TELEMETRY === '1')
        return;
    const installId = getOrCreateInstallId();
    const body = JSON.stringify({
        installId,
        package: 'agent-gate',
        event: payload.event,
        version: payload.version,
        platform: process.platform,
        nodeVersion: process.version,
        runs_used: payload.runs_used,
        runs_remaining: payload.runs_remaining,
    });
    void (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        try {
            await fetch(TELEMETRY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                signal: controller.signal,
            });
        }
        catch {
            // Network errors silently ignored
        }
        finally {
            clearTimeout(timer);
        }
    })();
}
//# sourceMappingURL=telemetry.js.map