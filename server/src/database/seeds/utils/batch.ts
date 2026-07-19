import type { QueryRunner } from 'typeorm';

export async function countRows(
  queryRunner: QueryRunner,
  table: string,
): Promise<number> {
  const result = await queryRunner.query(
    `SELECT COUNT(*)::int AS count FROM ${table}`,
  );
  return Number(result[0]?.count ?? 0);
}

export async function insertBatch(
  queryRunner: QueryRunner,
  table: string,
  columns: string[],
  rows: unknown[][],
): Promise<void> {
  if (rows.length === 0) return;

  const placeholders = rows
    .map((row, rowIndex) => {
      const offset = rowIndex * columns.length;
      const params = row.map((_, colIndex) => `$${offset + colIndex + 1}`);
      return `(${params.join(', ')})`;
    })
    .join(', ');

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
  await queryRunner.query(sql, rows.flat());
}

export async function runInBatches<T>(
  items: T[],
  batchSize: number,
  worker: (batch: T[], batchIndex: number) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await worker(items.slice(i, i + batchSize), Math.floor(i / batchSize));
  }
}

export function neededCount(
  target: number,
  current: number,
  incremental: boolean,
): number {
  if (!incremental) return target;
  return Math.max(0, target - current);
}

export function logProgress(label: string, done: number, total: number) {
  const pct = total === 0 ? 100 : Math.min(100, Math.round((done / total) * 100));
  process.stdout.write(`\r  ${label}: ${done.toLocaleString()}/${total.toLocaleString()} (${pct}%)`);
  if (done >= total) process.stdout.write('\n');
}
