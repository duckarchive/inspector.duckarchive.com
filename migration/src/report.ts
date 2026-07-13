import fs from 'node:fs';
import path from 'node:path';

// run the CLI from the repo root (pnpm tsx migration/src/migrate.ts …)
const OUT_ROOT = path.resolve(process.cwd(), 'migration', 'out');

const csvEscape = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export class ArchiveReport {
  readonly dir: string;
  private anomalies: string[][] = [];
  private conflicts: string[][] = [];
  private sections: string[] = [];

  constructor(readonly archive: string) {
    this.dir = path.join(OUT_ROOT, archive);
    fs.mkdirSync(this.dir, { recursive: true });
  }

  /** kind: junk-code | skipped | merge | sequence-gap | copy-ambiguous | copy-unmatched | code-diff */
  anomaly(kind: string, level: string, ref: string, detail: string): void {
    this.anomalies.push([kind, level, ref, detail]);
  }

  conflict(level: string, canonicalCode: string, keptRef: string, droppedRef: string, detail: string): void {
    this.conflicts.push([level, canonicalCode, keptRef, droppedRef, detail]);
  }

  section(title: string, lines: string[]): void {
    this.sections.push(`## ${title}\n\n${lines.join('\n')}\n`);
  }

  get conflictCount(): number {
    return this.conflicts.length;
  }
  get anomalyCount(): number {
    return this.anomalies.length;
  }

  flush(dryRun: boolean): void {
    const suffix = dryRun ? '.dry-run' : '';
    fs.writeFileSync(
      path.join(this.dir, `anomalies${suffix}.csv`),
      ['kind,level,ref,detail', ...this.anomalies.map((r) => r.map(csvEscape).join(','))].join('\n'),
    );
    fs.writeFileSync(
      path.join(this.dir, `conflicts${suffix}.csv`),
      ['level,code,kept,dropped,detail', ...this.conflicts.map((r) => r.map(csvEscape).join(','))].join('\n'),
    );
    fs.writeFileSync(
      path.join(this.dir, `report${suffix}.md`),
      `# Migration report: ${this.archive}${dryRun ? ' (DRY RUN)' : ''}\n\nGenerated: ${new Date().toISOString()}\n\n${this.sections.join('\n')}`,
    );
  }
}
