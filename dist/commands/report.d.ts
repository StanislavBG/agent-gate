interface ReportOpts {
    config?: string;
    json?: boolean;
}
/**
 * 'report' command: runs gates and outputs detailed report without CI exit semantics.
 * Always exits 0 — suitable for dashboards and audit logs.
 */
export declare function runReport(opts: ReportOpts): Promise<void>;
export {};
//# sourceMappingURL=report.d.ts.map