import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import type { GateConfig, StepproofConfig, ComplyConfig, CostConfig } from '../types/index.js';

export const DEFAULT_CONFIG_PATH = '.agent-gate.yaml';

const DEFAULTS: GateConfig = {
  stepproof: {
    scenarios: './scenarios/',
    threshold: 'all',
  },
  comply: {
    policy: '.agent-comply/policy.yaml',
  },
  cost: {
    budget_per_run: '$0.50',
    model_allowlist: ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  },
};

export function loadConfig(configPath?: string): GateConfig {
  const path = resolve(configPath ?? DEFAULT_CONFIG_PATH);

  if (!existsSync(path)) {
    throw new Error(`Config not found: ${path}. Run 'agent-gate init' to scaffold one.`);
  }

  const raw = readFileSync(path, 'utf-8');
  const parsed = yaml.load(raw) as Record<string, unknown>;

  return mergeWithDefaults(parsed);
}

function mergeWithDefaults(parsed: Record<string, unknown>): GateConfig {
  const config: GateConfig = {};

  // stepproof
  if (parsed.stepproof === false) {
    config.stepproof = false;
  } else if (parsed.stepproof && typeof parsed.stepproof === 'object') {
    config.stepproof = {
      ...(DEFAULTS.stepproof as StepproofConfig),
      ...(parsed.stepproof as Partial<StepproofConfig>),
    };
  } else {
    config.stepproof = DEFAULTS.stepproof;
  }

  // comply
  if (parsed.comply === false) {
    config.comply = false;
  } else if (parsed.comply && typeof parsed.comply === 'object') {
    config.comply = {
      ...(DEFAULTS.comply as ComplyConfig),
      ...(parsed.comply as Partial<ComplyConfig>),
    };
  } else {
    config.comply = DEFAULTS.comply;
  }

  // cost
  if (parsed.cost === false) {
    config.cost = false;
  } else if (parsed.cost && typeof parsed.cost === 'object') {
    config.cost = {
      ...(DEFAULTS.cost as CostConfig),
      ...(parsed.cost as Partial<CostConfig>),
    };
  } else {
    config.cost = DEFAULTS.cost;
  }

  return config;
}

export function getDefaultConfig(): GateConfig {
  return JSON.parse(JSON.stringify(DEFAULTS));
}
