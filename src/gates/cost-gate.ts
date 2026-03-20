import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { GateResult, CostConfig } from '../types/index.js';

interface ModelUsage {
  model: string;
  file: string;
  line: number;
}

/**
 * Cost gate: static analysis only (no live API calls).
 * Checks:
 *   1. Models used are on the allowlist
 *   2. No budget ceiling is obviously breached (placeholder — real cost tracking
 *      requires telemetry outside scope of v0.1)
 */
export async function runCostGate(
  config: CostConfig,
  cwd: string
): Promise<GateResult> {
  const start = Date.now();

  const allowlist = config.model_allowlist ?? [];
  const budgetStr = config.budget_per_run ?? '$0.50';
  const budget = parseDollar(budgetStr);

  // Scan source files for model references
  const usages = findModelUsages(cwd);

  const violations: string[] = [];
  const unknownModels: string[] = [];

  for (const usage of usages) {
    if (allowlist.length > 0 && !allowlist.includes(usage.model)) {
      if (!unknownModels.includes(usage.model)) {
        unknownModels.push(usage.model);
      }
      violations.push(
        `Model '${usage.model}' not in allowlist (found in ${usage.file}:${usage.line})`
      );
    }
  }

  const modelsFound = [...new Set(usages.map((u) => u.model))];
  const passed = violations.length === 0;

  return {
    gate: 'cost',
    status: passed ? 'passed' : 'failed',
    passed,
    duration_ms: Date.now() - start,
    details: {
      budget_per_run: budgetStr,
      budget_cents: Math.round(budget * 100),
      allowlist,
      models_found: modelsFound,
      violations,
      note: 'Static analysis only. Live cost tracking requires telemetry.',
    },
  };
}

function parseDollar(value: string): number {
  const stripped = value.replace(/^\$/, '');
  const n = parseFloat(stripped);
  return isNaN(n) ? 0.5 : n;
}

/** Known Claude model patterns to look for in source code */
const MODEL_PATTERNS: RegExp[] = [
  /claude-(?:opus|sonnet|haiku)-[\d.-]+/g,
  /gpt-4[o\w-]*/g,
  /gpt-3\.5[o\w-]*/g,
  /gemini-[\w-]+/g,
  /llama-[\w-]+/g,
  /mistral-[\w-]+/g,
];

function findModelUsages(cwd: string): ModelUsage[] {
  const usages: ModelUsage[] = [];
  const srcDir = resolve(cwd, 'src');

  if (!existsSync(srcDir)) return usages;

  scanDir(srcDir, usages);
  return usages;
}

function scanDir(dir: string, usages: ModelUsage[]): void {
  let entries: string[];
  try {
    entries = require('node:fs').readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry);
    try {
      const stat = require('node:fs').statSync(full);
      if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
        scanDir(full, usages);
      } else if (stat.isFile() && /\.(ts|js|json|yaml|yml|env)$/.test(entry)) {
        scanFile(full, usages);
      }
    } catch {
      // skip unreadable
    }
  }
}

function scanFile(filePath: string, usages: ModelUsage[]): void {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of MODEL_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(lines[i])) !== null) {
        usages.push({ model: match[0], file: filePath, line: i + 1 });
      }
    }
  }
}
