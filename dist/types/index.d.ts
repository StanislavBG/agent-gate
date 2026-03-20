export type GateStatus = 'passed' | 'failed' | 'skipped' | 'error';
export interface GateResult {
    gate: string;
    status: GateStatus;
    passed: boolean;
    duration_ms: number;
    details: Record<string, unknown>;
    error?: string;
}
export interface RunResult {
    verdict: 'PASS' | 'FAIL';
    passed: boolean;
    gates: GateResult[];
    duration_ms: number;
    timestamp: string;
}
export interface StepproofConfig {
    scenarios: string;
    threshold?: 'all' | number;
    command?: string;
}
export interface ComplyConfig {
    policy?: string;
    config?: string;
    command?: string;
}
export interface CostConfig {
    budget_per_run?: string;
    model_allowlist?: string[];
}
export interface GateConfig {
    stepproof?: StepproofConfig | false;
    comply?: ComplyConfig | false;
    cost?: CostConfig | false;
}
//# sourceMappingURL=index.d.ts.map