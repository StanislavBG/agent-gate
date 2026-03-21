/**
 * CLI integration tests for agent-gate.
 * Spawns the actual compiled CLI binary and verifies exit codes + output.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const CLI = path.resolve(__dirname, '../dist/cli.js');

function run(args: string[], cwd?: string) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: cwd ?? os.tmpdir(),
    encoding: 'utf-8',
    timeout: 15000,
  });
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

const MINIMAL_CONFIG = `
gates:
  stepproof: false
  comply: false
  cost: false
`;

describe('agent-gate CLI — exit codes', () => {
  it('no args → shows help and exits 0', () => {
    const { code, stdout } = run([]);
    expect(code).toBe(0);
    expect(stdout).toContain('agent-gate');
    expect(stdout).toContain('Usage:');
  });

  it('--help → exits 0', () => {
    const { code, stdout } = run(['--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('CI gate');
  });

  it('--version → exits 0 and prints version', () => {
    const { code, stdout } = run(['--version']);
    expect(code).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+/);
  });

  it('unknown command → exits 2 with hint', () => {
    const { code, stderr } = run(['badcommand']);
    expect(code).toBe(2);
    expect(stderr).toContain('Unknown command');
    expect(stderr).toContain('--help');
  });
});

describe('agent-gate CLI — run command', () => {
  it('run without config → exits 2 with guidance', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-run-'));
    const { code, stderr } = run(['run'], tmpDir);
    expect(code).toBe(2);
    expect(stderr).toContain('agent-gate init');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('run with explicit missing config → exits 2', () => {
    const { code, stderr } = run(['run', '--config', '/nonexistent/.agent-gate.yaml']);
    expect(code).toBe(2);
    expect(stderr).toContain('Error');
  });

  it('run with all gates disabled → exits 0', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-alloff-'));
    fs.writeFileSync(path.join(tmpDir, '.agent-gate.yaml'), MINIMAL_CONFIG);
    const { code } = run(['run'], tmpDir);
    expect(code).toBe(0);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('run --json with all gates disabled → outputs JSON', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-json-'));
    fs.writeFileSync(path.join(tmpDir, '.agent-gate.yaml'), MINIMAL_CONFIG);
    const { code, stdout } = run(['run', '--json'], tmpDir);
    expect(code).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('run --no-fail with gate failures → still exits 0', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-nofail-'));
    fs.writeFileSync(path.join(tmpDir, '.agent-gate.yaml'), MINIMAL_CONFIG);
    const { code } = run(['run', '--no-fail'], tmpDir);
    expect(code).toBe(0);
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('agent-gate CLI — report command', () => {
  it('report without config → exits 2 with guidance', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-report-'));
    const { code, stderr } = run(['report'], tmpDir);
    expect(code).toBe(2);
    expect(stderr).toContain('agent-gate init');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('report with all gates disabled → exits 0', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-report2-'));
    fs.writeFileSync(path.join(tmpDir, '.agent-gate.yaml'), MINIMAL_CONFIG);
    const { code } = run(['report'], tmpDir);
    expect(code).toBe(0);
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('agent-gate CLI — init command', () => {
  it('init → creates .agent-gate.yaml and exits 0', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-init-'));
    const { code } = run(['init'], tmpDir);
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(tmpDir, '.agent-gate.yaml'))).toBe(true);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('init --output custom.yaml → creates file at specified path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-init-out-'));
    const outPath = path.join(tmpDir, 'custom-gate.yaml');
    const { code } = run(['init', '--output', outPath], tmpDir);
    expect(code).toBe(0);
    expect(fs.existsSync(outPath)).toBe(true);
    fs.rmSync(tmpDir, { recursive: true });
  });
});
