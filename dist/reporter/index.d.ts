import type { RunResult } from '../types/index.js';
export declare function formatSarif(result: RunResult): string;
export declare function formatJunit(result: RunResult): string;
export declare function printReport(result: RunResult, opts?: {
    json?: boolean;
    format?: string;
    output?: string;
}): void;
export declare function exitWithVerdict(result: RunResult, noFail?: boolean): never;
//# sourceMappingURL=index.d.ts.map