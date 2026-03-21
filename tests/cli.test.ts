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
  try {
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
  } catch (e) {
    // Node.js rejects null bytes in spawn args before the process starts —
    // this is the OS-level rejection of malformed input, equivalent to exit 2.
    return { code: 2, stdout: '', stderr: String(e) };
  }
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

describe('agent-gate CLI — format validation', () => {
  it('run --format csv → exits 2 with clear message', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-fmt-run-'));
    fs.writeFileSync(path.join(tmpDir, '.agent-gate.yaml'), MINIMAL_CONFIG);
    const { code, stderr } = run(['run', '--format', 'csv'], tmpDir);
    expect(code).toBe(2);
    expect(stderr).toContain('--format');
    expect(stderr).toContain('csv');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('report --format csv → exits 2 with clear message', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-fmt-report-'));
    fs.writeFileSync(path.join(tmpDir, '.agent-gate.yaml'), MINIMAL_CONFIG);
    const { code, stderr } = run(['report', '--format', 'csv'], tmpDir);
    expect(code).toBe(2);
    expect(stderr).toContain('--format');
    expect(stderr).toContain('csv');
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('agent-gate CLI — --no-fail flag', () => {
  it('run --no-fail with all gates disabled → exits 0', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-nofail-'));
    fs.writeFileSync(path.join(tmpDir, '.agent-gate.yaml'), MINIMAL_CONFIG);
    const { code } = run(['run', '--no-fail'], tmpDir);
    expect(code).toBe(0);
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('agent-gate CLI — input sanitization', () => {
  it('run with null byte in --config → exits 2', () => {
    const { code, stderr } = run(['run', '--config', 'conf\0ig.yaml']);
    expect(code).toBe(2);
    expect(stderr).toContain('null');
  });

  it('report with null byte in --config → exits 2', () => {
    const { code, stderr } = run(['report', '--config', 'conf\0ig.yaml']);
    expect(code).toBe(2);
    expect(stderr).toContain('null');
  });

  it('init with null byte in --output → exits 2', () => {
    const { code, stderr } = run(['init', '--output', 'out\0put.yaml']);
    expect(code).toBe(2);
    expect(stderr).toContain('null');
  });
});

describe('agent-gate CLI — init idempotency', () => {
  it('init twice in same dir → exits 0 both times', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-idem-'));
    const { code: code1 } = run(['init'], tmpDir);
    expect(code1).toBe(0);
    const { code: code2 } = run(['init'], tmpDir);
    expect(code2).toBe(0);
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('agent-gate CLI — subcommand help', () => {
  it('run --help → exits 0 and lists run options', () => {
    const { code, stdout } = run(['run', '--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('--config');
    expect(stdout).toContain('--format');
  });

  it('report --help → exits 0 and lists report options', () => {
    const { code, stdout } = run(['report', '--help']);
    expect(code).toBe(0);
    expect(stdout).toContain('--config');
  });

  it('report --json with all gates disabled → outputs JSON', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-gate-rj-'));
    fs.writeFileSync(path.join(tmpDir, '.agent-gate.yaml'), MINIMAL_CONFIG);
    const { code, stdout } = run(['report', '--json'], tmpDir);
    expect(code).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
    fs.rmSync(tmpDir, { recursive: true });
  });
});
