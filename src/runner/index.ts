import type { GateResult, RunResult, GateConfig } from '../types/index.js';
import { runStepproofGate } from '../gates/stepproof-gate.js';
import { runComplyGate } from '../gates/comply-gate.js';
import { runCostGate } from '../gates/cost-gate.js';

export async function runAllGates(config: GateConfig, cwd: string): Promise<RunResult> {
  const start = Date.now();

  // Build gate promises — skip disabled gates
  const gatePromises: Promise<GateResult>[] = [];

  if (config.stepproof !== false) {
    gatePromises.push(runStepproofGate(config.stepproof ?? { scenarios: './scenarios/' }, cwd));
  }
  if (config.comply !== false) {
    gatePromises.push(runComplyGate(config.comply ?? {}, cwd));
  }
  if (config.cost !== false) {
    gatePromises.push(runCostGate(config.cost ?? {}, cwd));
  }

  // Run in parallel — bottleneck is whichever gate is slowest
  const gates = await Promise.all(gatePromises);

  const passed = gates.every((g) => g.passed);

  return {
    verdict: passed ? 'PASS' : 'FAIL',
    passed,
    gates,
    duration_ms: Date.now() - start,
    timestamp: new Date().toISOString(),
  };
}
