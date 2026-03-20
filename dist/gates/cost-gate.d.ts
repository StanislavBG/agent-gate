import type { GateResult, CostConfig } from '../types/index.js';
/**
 * Cost gate: static analysis only (no live API calls).
 * Checks:
 *   1. Models used are on the allowlist
 *   2. No budget ceiling is obviously breached (placeholder — real cost tracking
 *      requires telemetry outside scope of v0.1)
 */
export declare function runCostGate(config: CostConfig, cwd: string): Promise<GateResult>;
//# sourceMappingURL=cost-gate.d.ts.map