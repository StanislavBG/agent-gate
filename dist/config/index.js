import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
export const DEFAULT_CONFIG_PATH = '.agent-gate.yaml';
const DEFAULTS = {
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
export function loadConfig(configPath) {
    const path = resolve(configPath ?? DEFAULT_CONFIG_PATH);
    if (!existsSync(path)) {
        throw new Error(`Config not found: ${path}. Run 'agent-gate init' to scaffold one.`);
    }
    const raw = readFileSync(path, 'utf-8');
    const loaded = yaml.load(raw);
    if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
        throw new Error(`Config file is empty or not a valid YAML object: ${path}`);
    }
    const parsed = loaded;
    return mergeWithDefaults(parsed);
}
function mergeWithDefaults(parsed) {
    const config = {};
    // stepproof
    if (parsed.stepproof === false) {
        config.stepproof = false;
    }
    else if (parsed.stepproof && typeof parsed.stepproof === 'object') {
        config.stepproof = {
            ...DEFAULTS.stepproof,
            ...parsed.stepproof,
        };
    }
    else {
        config.stepproof = DEFAULTS.stepproof;
    }
    // comply
    if (parsed.comply === false) {
        config.comply = false;
    }
    else if (parsed.comply && typeof parsed.comply === 'object') {
        config.comply = {
            ...DEFAULTS.comply,
            ...parsed.comply,
        };
    }
    else {
        config.comply = DEFAULTS.comply;
    }
    // cost
    if (parsed.cost === false) {
        config.cost = false;
    }
    else if (parsed.cost && typeof parsed.cost === 'object') {
        config.cost = {
            ...DEFAULTS.cost,
            ...parsed.cost,
        };
    }
    else {
        config.cost = DEFAULTS.cost;
    }
    return config;
}
export function getDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULTS));
}
//# sourceMappingURL=index.js.map