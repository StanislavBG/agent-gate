import { describe, it, expect, vi } from 'vitest';
import type { GateResult, GateConfig, RunResult } from '../../src/types/index.js';

// ─── Mock all three gate modules before importing runner ───────────────────
// vi.mock is hoisted, so mocks must be defined with vi.hoisted()

const { mockStepproof, mockComply, mockCost } = vi.hoisted(() => ({
  mockStepproof: vi.fn<[unknown, string], Promise<GateResult>>(),
  mockComply: vi.fn<[unknown, string], Promise<GateResult>>(),
  mockCost: vi.fn<[unknown, string], Promise<GateResult>>(),
}));

vi.mock('../../src/gates/stepproof-gate.js', () => ({
  runStepproofGate: mockStepproof,
}));
vi.mock('../../src/gates/comply-gate.js', () => ({
  runComplyGate: mockComply,
}));
vi.mock('../../src/gates/cost-gate.js', () => ({
  runCostGate: mockCost,
}));

import { runAllGates } from '../../src/runner/index.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Reset call counts between tests
import { beforeEach } from 'vitest';
beforeEach(() => { vi.clearAllMocks(); });

function makeResult(gate: string, passed: boolean): GateResult {
  return {
    gate,
    status: passed ? 'passed' : 'failed',
    passed,
    duration_ms: 10,
    details: {},
  };
}

const BASE_CONFIG: GateConfig = {
  stepproof: { scenarios: './scenarios/' },
  comply: {},
  cost: {},
};

// ─── Runner tests ────────────────────────────────────────────────────────────

describe('runner', () => {
  it('returns PASS when all gates pass', async () => {
    mockStepproof.mockResolvedValue(makeResult('stepproof', true));
    mockComply.mockResolvedValue(makeResult('comply', true));
    mockCost.mockResolvedValue(makeResult('cost', true));

    const result = await runAllGates(BASE_CONFIG, '/tmp');
    expect(result.passed).toBe(true);
    expect(result.verdict).toBe('PASS');
  });

  it('returns FAIL when any gate fails', async () => {
    mockStepproof.mockResolvedValue(makeResult('stepproof', true));
    mockComply.mockResolvedValue(makeResult('comply', false));
    mockCost.mockResolvedValue(makeResult('cost', true));

    const result = await runAllGates(BASE_CONFIG, '/tmp');
    expect(result.passed).toBe(false);
    expect(result.verdict).toBe('FAIL');
  });

  it('returns FAIL when all gates fail', async () => {
    mockStepproof.mockResolvedValue(makeResult('stepproof', false));
    mockComply.mockResolvedValue(makeResult('comply', false));
    mockCost.mockResolvedValue(makeResult('cost', false));

    const result = await runAllGates(BASE_CONFIG, '/tmp');
    expect(result.passed).toBe(false);
    expect(result.gates).toHaveLength(3);
  });

  it('skips disabled gates', async () => {
    mockStepproof.mockResolvedValue(makeResult('stepproof', true));
    mockCost.mockResolvedValue(makeResult('cost', true));

    const config: GateConfig = { ...BASE_CONFIG, comply: false };
    const result = await runAllGates(config, '/tmp');

    expect(mockComply).not.toHaveBeenCalled();
    expect(result.gates).toHaveLength(2);
  });

  it('runs gates in parallel (all 3 called)', async () => {
    mockStepproof.mockResolvedValue(makeResult('stepproof', true));
    mockComply.mockResolvedValue(makeResult('comply', true));
    mockCost.mockResolvedValue(makeResult('cost', true));

    await runAllGates(BASE_CONFIG, '/tmp');

    expect(mockStepproof).toHaveBeenCalledTimes(1);
    expect(mockComply).toHaveBeenCalledTimes(1);
    expect(mockCost).toHaveBeenCalledTimes(1);
  });

  it('passes cwd to each gate', async () => {
    mockStepproof.mockResolvedValue(makeResult('stepproof', true));
    mockComply.mockResolvedValue(makeResult('comply', true));
    mockCost.mockResolvedValue(makeResult('cost', true));

    await runAllGates(BASE_CONFIG, '/custom/path');

    expect(mockStepproof).toHaveBeenCalledWith(expect.anything(), '/custom/path');
    expect(mockComply).toHaveBeenCalledWith(expect.anything(), '/custom/path');
    expect(mockCost).toHaveBeenCalledWith(expect.anything(), '/custom/path');
  });

  it('includes timestamp and duration_ms in result', async () => {
    mockStepproof.mockResolvedValue(makeResult('stepproof', true));
    mockComply.mockResolvedValue(makeResult('comply', true));
    mockCost.mockResolvedValue(makeResult('cost', true));

    const result = await runAllGates(BASE_CONFIG, '/tmp');
    expect(typeof result.timestamp).toBe('string');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof result.duration_ms).toBe('number');
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('handles all gates disabled gracefully', async () => {
    const config: GateConfig = { stepproof: false, comply: false, cost: false };
    const result = await runAllGates(config, '/tmp');
    expect(result.passed).toBe(true); // vacuously true — no failures
    expect(result.gates).toHaveLength(0);
  });
});

// ─── Reporter tests ──────────────────────────────────────────────────────────

import { printReport } from '../../src/reporter/index.js';

describe('reporter', () => {
  function makeRunResult(gates: GateResult[]): RunResult {
    return {
      verdict: gates.every((g) => g.passed) ? 'PASS' : 'FAIL',
      passed: gates.every((g) => g.passed),
      gates,
      duration_ms: 42,
      timestamp: '2026-03-20T12:00:00.000Z',
    };
  }

  it('outputs valid JSON when json=true', () => {
    const writes: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });

    const result = makeRunResult([makeResult('stepproof', true)]);
    printReport(result, { json: true });

    spy.mockRestore();
    const output = writes.join('');
    expect(() => JSON.parse(output)).not.toThrow();
    const parsed = JSON.parse(output);
    expect(parsed.verdict).toBe('PASS');
  });

  it('prints PASS verdict for all-passing gates', () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });

    const result = makeRunResult([
      makeResult('stepproof', true),
      makeResult('comply', true),
    ]);
    printReport(result);

    spy.mockRestore();
    const output = logs.join('\n');
    expect(output).toContain('PASS');
  });

  it('prints FAIL verdict when any gate fails', () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });

    const result = makeRunResult([
      makeResult('stepproof', true),
      makeResult('comply', false),
    ]);
    printReport(result);

    spy.mockRestore();
    const output = logs.join('\n');
    expect(output).toContain('FAIL');
  });

  it('lists all gate names in output', () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });

    const result = makeRunResult([
      makeResult('stepproof', true),
      makeResult('comply', true),
      makeResult('cost', true),
    ]);
    printReport(result);

    spy.mockRestore();
    const output = logs.join('\n');
    expect(output).toContain('stepproof');
    expect(output).toContain('comply');
    expect(output).toContain('cost');
  });
});
