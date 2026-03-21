import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runCostGate } from '../../src/gates/cost-gate.js';

const TMP = path.join(os.tmpdir(), `agent-gate-cost-${Date.now()}`);

beforeAll(() => {
  fs.mkdirSync(path.join(TMP, 'src'), { recursive: true });
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

function writeFile(relPath: string, content: string) {
  const full = path.join(TMP, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}

describe('runCostGate — no src directory', () => {
  it('passes (no violations) when no src/ directory exists', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-cost-empty-'));
    try {
      const result = await runCostGate({}, emptyDir);
      expect(result.passed).toBe(true);
      expect(result.gate).toBe('cost');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

describe('runCostGate — allowlist enforcement', () => {
  it('passes when no models found and allowlist is empty', async () => {
    writeFile('src/plain.ts', 'const x = 1;\n');
    const result = await runCostGate({ model_allowlist: [] }, TMP);
    expect(result.passed).toBe(true);
  });

  it('passes when found model is on the allowlist', async () => {
    writeFile('src/client.ts', 'const model = "claude-sonnet-4-6";\n');
    const result = await runCostGate({ model_allowlist: ['claude-sonnet-4-6'] }, TMP);
    expect(result.passed).toBe(true);
    expect(result.details.violations).toHaveLength(0);
  });

  it('fails when found model is NOT on the allowlist', async () => {
    writeFile('src/client.ts', 'const model = "gpt-4o";\n');
    const result = await runCostGate({ model_allowlist: ['claude-sonnet-4-6'] }, TMP);
    expect(result.passed).toBe(false);
    expect(result.details.violations).toHaveLength(1);
    expect(String(result.details.violations[0])).toContain('gpt-4o');
  });

  it('passes when allowlist is undefined (no enforcement)', async () => {
    writeFile('src/client.ts', 'const model = "gpt-4o";\n');
    const result = await runCostGate({}, TMP);
    expect(result.passed).toBe(true);
  });
});

describe('runCostGate — model detection patterns', () => {
  it('detects claude-haiku model', async () => {
    writeFile('src/haiku.ts', 'const model = "claude-haiku-4-5-20251001";\n');
    const result = await runCostGate({}, TMP);
    const models = result.details.models_found as string[];
    expect(models.some((m: string) => m.startsWith('claude-haiku'))).toBe(true);
  });

  it('detects gpt-4o model', async () => {
    writeFile('src/openai.ts', 'const m = "gpt-4o";\n');
    const result = await runCostGate({}, TMP);
    const models = result.details.models_found as string[];
    expect(models.some((m: string) => m.startsWith('gpt-4'))).toBe(true);
  });

  it('detects gemini model', async () => {
    writeFile('src/gemini.ts', 'const m = "gemini-pro";\n');
    const result = await runCostGate({}, TMP);
    const models = result.details.models_found as string[];
    expect(models.some((m: string) => m.startsWith('gemini'))).toBe(true);
  });
});

describe('runCostGate — budget field in details', () => {
  it('includes budget_per_run in details', async () => {
    writeFile('src/x.ts', 'const x = 1;\n');
    const result = await runCostGate({ budget_per_run: '$1.00' }, TMP);
    expect(result.details.budget_per_run).toBe('$1.00');
    expect(result.details.budget_cents).toBe(100);
  });

  it('defaults budget to $0.50 when not set', async () => {
    writeFile('src/x.ts', 'const x = 1;\n');
    const result = await runCostGate({}, TMP);
    expect(result.details.budget_per_run).toBe('$0.50');
    expect(result.details.budget_cents).toBe(50);
  });

  it('handles budget without $ prefix', async () => {
    writeFile('src/x.ts', 'const x = 1;\n');
    const result = await runCostGate({ budget_per_run: '2.00' }, TMP);
    expect(result.details.budget_cents).toBe(200);
  });

  it('handles invalid budget string by defaulting to $0.50', async () => {
    writeFile('src/x.ts', 'const x = 1;\n');
    const result = await runCostGate({ budget_per_run: '$not-a-number' }, TMP);
    expect(result.details.budget_cents).toBe(50);
  });
});

describe('runCostGate — result structure', () => {
  it('result has gate, status, passed, duration_ms, details', async () => {
    writeFile('src/x.ts', 'const x = 1;\n');
    const result = await runCostGate({}, TMP);
    expect(result.gate).toBe('cost');
    expect(['passed', 'failed']).toContain(result.status);
    expect(typeof result.passed).toBe('boolean');
    expect(typeof result.duration_ms).toBe('number');
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    expect(result.details).toBeDefined();
  });
});
