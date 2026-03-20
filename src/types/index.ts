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

// Config shape for .agent-gate.yaml
export interface StepproofConfig {
  scenarios: string;       // path or glob to scenario files
  threshold?: 'all' | number; // pass rate required (default: 'all')
  command?: string;        // override binary (default: 'stepproof')
}

export interface ComplyConfig {
  policy?: string;         // path to policy.yaml
  config?: string;         // path to comply.yaml
  command?: string;        // override binary (default: 'agent-comply')
}

export interface CostConfig {
  budget_per_run?: string; // e.g. '$0.50'
  model_allowlist?: string[]; // allowed model IDs
}

export interface GateConfig {
  stepproof?: StepproofConfig | false;
  comply?: ComplyConfig | false;
  cost?: CostConfig | false;
}
