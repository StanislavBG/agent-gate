import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadConfig, getDefaultConfig } from '../../src/config/index.js';

const TMP = path.join(os.tmpdir(), 'agent-gate-config-test');

beforeAll(() => {
  fs.mkdirSync(TMP, { recursive: true });

  // Minimal: stepproof only, others disabled
  fs.writeFileSync(
    path.join(TMP, 'minimal.yaml'),
    `
stepproof:
  scenarios: ./scenarios/
comply: false
cost: false
`
  );

  // Full config with all gates
  fs.writeFileSync(
    path.join(TMP, 'full.yaml'),
    `
stepproof:
  scenarios: ./my-scenarios/
  threshold: all
comply:
  policy: ./policies/eu-ai-act.yaml
cost:
  budget_per_run: "$1.00"
  model_allowlist:
    - claude-sonnet-4-6
`
  );

  // All gates disabled
  fs.writeFileSync(
    path.join(TMP, 'all-disabled.yaml'),
    `
stepproof: false
comply: false
cost: false
`
  );
});

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('throws when config file does not exist', () => {
    expect(() => loadConfig('/nonexistent/path/.agent-gate.yaml')).toThrow();
  });

  it('error message contains "Config not found"', () => {
    try {
      loadConfig('/nonexistent/path/.agent-gate.yaml');
    } catch (e) {
      expect((e as Error).message).toContain('Config not found');
    }
  });

  it('error message suggests running agent-gate init', () => {
    try {
      loadConfig('/nonexistent/path/.agent-gate.yaml');
    } catch (e) {
      expect((e as Error).message).toContain('agent-gate init');
    }
  });

  it('loads minimal config with comply and cost disabled', () => {
    const config = loadConfig(path.join(TMP, 'minimal.yaml'));
    expect(config.comply).toBe(false);
    expect(config.cost).toBe(false);
    expect(config.stepproof).not.toBe(false);
  });

  it('stepproof scenarios path is applied from config', () => {
    const config = loadConfig(path.join(TMP, 'full.yaml'));
    if (config.stepproof && typeof config.stepproof === 'object') {
      expect((config.stepproof as { scenarios: string }).scenarios).toBe('./my-scenarios/');
    }
  });

  it('cost budget_per_run override is applied', () => {
    const config = loadConfig(path.join(TMP, 'full.yaml'));
    if (config.cost && typeof config.cost === 'object') {
      expect((config.cost as { budget_per_run: string }).budget_per_run).toBe('$1.00');
    }
  });

  it('all-disabled config has all gates set to false', () => {
    const config = loadConfig(path.join(TMP, 'all-disabled.yaml'));
    expect(config.stepproof).toBe(false);
    expect(config.comply).toBe(false);
    expect(config.cost).toBe(false);
  });

  it('returns an object with stepproof, comply, cost keys', () => {
    const config = loadConfig(path.join(TMP, 'minimal.yaml'));
    expect('stepproof' in config).toBe(true);
    expect('comply' in config).toBe(true);
    expect('cost' in config).toBe(true);
  });
});

describe('getDefaultConfig', () => {
  it('returns a new object each call (not same reference)', () => {
    const a = getDefaultConfig();
    const b = getDefaultConfig();
    expect(a).not.toBe(b);
    expect(a).toEqual(b); // same values, different objects
  });

  it('includes stepproof, comply, and cost by default', () => {
    const defaults = getDefaultConfig();
    expect(defaults.stepproof).not.toBe(false);
    expect(defaults.comply).not.toBe(false);
    expect(defaults.cost).not.toBe(false);
  });

  it('stepproof scenarios defaults to ./scenarios/', () => {
    const defaults = getDefaultConfig();
    if (defaults.stepproof && typeof defaults.stepproof === 'object') {
      expect((defaults.stepproof as { scenarios: string }).scenarios).toBe('./scenarios/');
    }
  });

  it('comply policy defaults to .agent-comply/policy.yaml', () => {
    const defaults = getDefaultConfig();
    if (defaults.comply && typeof defaults.comply === 'object') {
      expect((defaults.comply as { policy: string }).policy).toBe('.agent-comply/policy.yaml');
    }
  });

  it('cost model_allowlist includes claude-sonnet-4-6', () => {
    const defaults = getDefaultConfig();
    if (defaults.cost && typeof defaults.cost === 'object') {
      const allowlist = (defaults.cost as { model_allowlist: string[] }).model_allowlist;
      expect(allowlist).toContain('claude-sonnet-4-6');
    }
  });
});
