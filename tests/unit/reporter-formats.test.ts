import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';
import os from 'os';
import type { GateResult, RunResult } from '../../src/types/index.js';
import { formatSarif, formatJunit } from '../../src/reporter/index.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeGate(
  gate: string,
  passed: boolean,
  opts: Partial<GateResult> = {},
): GateResult {
  return {
    gate,
    status: passed ? 'passed' : 'failed',
    passed,
    duration_ms: 100,
    details: {},
    ...opts,
  };
}

function makeRunResult(gates: GateResult[]): RunResult {
  return {
    verdict: gates.every((g) => g.passed) ? 'PASS' : 'FAIL',
    passed: gates.every((g) => g.passed),
    gates,
    duration_ms: 300,
    timestamp: '2026-03-20T12:00:00.000Z',
  };
}

// ─── formatSarif tests ───────────────────────────────────────────────────────

describe('formatSarif', () => {
  it('produces valid JSON', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const output = formatSarif(result);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('sets SARIF version to 2.1.0', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const sarif = JSON.parse(formatSarif(result));
    expect(sarif.version).toBe('2.1.0');
  });

  it('sets tool driver name to agent-gate', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const sarif = JSON.parse(formatSarif(result));
    expect(sarif.runs[0].tool.driver.name).toBe('agent-gate');
  });

  it('sets tool driver version to 0.1.0', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const sarif = JSON.parse(formatSarif(result));
    expect(sarif.runs[0].tool.driver.version).toBe('0.1.0');
  });

  it('includes one rule per gate', () => {
    const result = makeRunResult([
      makeGate('stepproof', true),
      makeGate('comply', false),
      makeGate('cost', true),
    ]);
    const sarif = JSON.parse(formatSarif(result));
    const rules = sarif.runs[0].tool.driver.rules;
    expect(rules).toHaveLength(3);
    expect(rules.map((r: { id: string }) => r.id)).toEqual(['stepproof', 'comply', 'cost']);
  });

  it('sets level=none for a passing gate', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const sarif = JSON.parse(formatSarif(result));
    const res = sarif.runs[0].results[0];
    expect(res.level).toBe('none');
  });

  it('sets level=none for a skipped gate', () => {
    const gate = makeGate('comply', false, { status: 'skipped', passed: false });
    const result = makeRunResult([gate]);
    const sarif = JSON.parse(formatSarif(result));
    const res = sarif.runs[0].results[0];
    expect(res.level).toBe('none');
  });

  it('sets level=error for a failing gate', () => {
    const result = makeRunResult([makeGate('comply', false)]);
    const sarif = JSON.parse(formatSarif(result));
    const res = sarif.runs[0].results[0];
    expect(res.level).toBe('error');
  });

  it('sets level=error for an error-status gate', () => {
    const gate = makeGate('cost', false, { status: 'error', error: 'timeout' });
    const result = makeRunResult([gate]);
    const sarif = JSON.parse(formatSarif(result));
    const res = sarif.runs[0].results[0];
    expect(res.level).toBe('error');
  });

  it('includes gate name in message text', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const sarif = JSON.parse(formatSarif(result));
    expect(sarif.runs[0].results[0].message.text).toContain('stepproof');
  });

  it('includes details summary in message text when details are present', () => {
    const gate = makeGate('stepproof', false, {
      details: { scenarios_total: 5, scenarios_passed: 3 },
    });
    const result = makeRunResult([gate]);
    const sarif = JSON.parse(formatSarif(result));
    expect(sarif.runs[0].results[0].message.text).toContain('scenarios_total');
  });

  it('maps ruleId to gate name', () => {
    const result = makeRunResult([makeGate('cost', true)]);
    const sarif = JSON.parse(formatSarif(result));
    expect(sarif.runs[0].results[0].ruleId).toBe('cost');
  });

  it('produces one result per gate', () => {
    const result = makeRunResult([
      makeGate('stepproof', true),
      makeGate('comply', false),
    ]);
    const sarif = JSON.parse(formatSarif(result));
    expect(sarif.runs[0].results).toHaveLength(2);
  });
});

// ─── formatJunit tests ───────────────────────────────────────────────────────

describe('formatJunit', () => {
  it('starts with XML declaration', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const xml = formatJunit(result);
    expect(xml).toMatch(/^<\?xml version="1\.0"/);
  });

  it('has testsuites root element with name=agent-gate', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const xml = formatJunit(result);
    expect(xml).toContain('name="agent-gate"');
  });

  it('reports correct tests count in testsuites', () => {
    const result = makeRunResult([
      makeGate('stepproof', true),
      makeGate('comply', false),
      makeGate('cost', true),
    ]);
    const xml = formatJunit(result);
    expect(xml).toContain('tests="3"');
  });

  it('reports correct failures count', () => {
    const result = makeRunResult([
      makeGate('stepproof', true),
      makeGate('comply', false),
      makeGate('cost', false),
    ]);
    const xml = formatJunit(result);
    expect(xml).toContain('failures="2"');
  });

  it('includes a testcase per gate', () => {
    const result = makeRunResult([
      makeGate('stepproof', true),
      makeGate('comply', false),
    ]);
    const xml = formatJunit(result);
    const matches = xml.match(/<testcase /g) || [];
    expect(matches).toHaveLength(2);
  });

  it('uses gate name as testcase name attribute', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const xml = formatJunit(result);
    expect(xml).toContain('name="stepproof"');
  });

  it('uses agent-gate.gates as classname', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const xml = formatJunit(result);
    expect(xml).toContain('classname="agent-gate.gates"');
  });

  it('includes failure element for a failed gate', () => {
    const result = makeRunResult([makeGate('comply', false)]);
    const xml = formatJunit(result);
    expect(xml).toContain('<failure');
  });

  it('uses gate error message in failure element', () => {
    const gate = makeGate('comply', false, { error: 'policy violation' });
    const result = makeRunResult([gate]);
    const xml = formatJunit(result);
    expect(xml).toContain('policy violation');
  });

  it('uses "Gate failed" as fallback message when no error', () => {
    const result = makeRunResult([makeGate('comply', false)]);
    const xml = formatJunit(result);
    expect(xml).toContain('Gate failed');
  });

  it('includes details JSON inside failure element', () => {
    const gate = makeGate('comply', false, { details: { violations: ['rule-1'] } });
    const result = makeRunResult([gate]);
    const xml = formatJunit(result);
    expect(xml).toContain('violations');
  });

  it('includes skipped element for a skipped gate', () => {
    const gate = makeGate('comply', false, { status: 'skipped' });
    const result = makeRunResult([gate]);
    const xml = formatJunit(result);
    expect(xml).toContain('<skipped/>');
  });

  it('does not include failure element for a passing gate', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const xml = formatJunit(result);
    expect(xml).not.toContain('<failure');
  });

  it('skipped gates do not count as failures', () => {
    const gate = makeGate('comply', false, { status: 'skipped' });
    const result = makeRunResult([makeGate('stepproof', true), gate]);
    const xml = formatJunit(result);
    expect(xml).toContain('failures="0"');
  });
});

// ── --output <file> behavior ─────────────────────────────────────────────────

describe('--output file writing', () => {
  const tmpFile = resolve(os.tmpdir(), `agent-gate-test-${Date.now()}.sarif`);

  afterEach(() => {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  });

  it('formatSarif output can be written to a file and read back as valid SARIF', () => {
    const result = makeRunResult([makeGate('stepproof', true)]);
    const sarif = formatSarif(result);
    writeFileSync(tmpFile, sarif, 'utf-8');
    const contents = readFileSync(tmpFile, 'utf-8');
    const parsed = JSON.parse(contents);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].tool.driver.name).toBe('agent-gate');
  });

  it('formatJunit output can be written to a file and read back as valid XML', () => {
    const result = makeRunResult([makeGate('comply', false)]);
    const xml = formatJunit(result);
    writeFileSync(tmpFile, xml, 'utf-8');
    const contents = readFileSync(tmpFile, 'utf-8');
    expect(contents).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(contents).toContain('<testsuites');
    expect(contents).toContain('name="agent-gate"');
  });
});
