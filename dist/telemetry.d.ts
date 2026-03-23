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
export interface TelemetryPayload {
    command: string;
    version: string;
    /** Process exit code */
    exit_code?: number;
    /** Command wall-clock duration in milliseconds */
    duration_ms?: number;
}
export interface ConversionEventPayload {
    event: 'limit_reached' | 'upgrade_prompt_shown';
    version: string;
    runs_used: number;
    runs_remaining: number;
}
/**
 * Fire a telemetry ping for a command invocation.
 * Stores the promise in _pending so the exit hook can drain it.
 * Returns the promise (callers that await it get fast resolution too).
 */
export declare function sendTelemetry(payload: TelemetryPayload): Promise<void>;
/**
 * Fire a conversion funnel event (limit_reached or upgrade_prompt_shown).
 * Fire-and-forget — never blocks the CLI.
 */
export declare function sendConversionEvent(payload: ConversionEventPayload): void;
//# sourceMappingURL=telemetry.d.ts.map