import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import * as path from 'node:path';

@Injectable()
export class DuckDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DuckDbService.name);
  private instance: DuckDBInstance | null = null;
  private connection: DuckDBConnection | null = null;
  private dbPath = '';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const configured =
      this.config.get<string>('DUCKDB_PATH') ??
      '../dbt-analytics/dev.duckdb';

    this.dbPath = path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);

    this.instance = await DuckDBInstance.create(this.dbPath, {
      access_mode: 'READ_ONLY',
    });
    this.connection = await this.instance.connect();
    this.logger.log(`DuckDB connected (read-only): ${this.dbPath}`);
  }

  onModuleDestroy() {
    this.connection?.closeSync();
    this.instance?.closeSync();
    this.connection = null;
    this.instance = null;
  }

  getPath() {
    return this.dbPath;
  }

  isReady() {
    return this.connection !== null;
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
  ): Promise<T[]> {
    if (!this.connection) {
      throw new Error('DuckDB is not connected');
    }

    const reader = await this.connection.runAndReadAll(sql);
    return reader.getRowObjectsJson() as T[];
  }

  async ping(): Promise<boolean> {
    const rows = await this.query<{ ok: number | string }>('SELECT 1 AS ok');
    return Number(rows[0]?.ok) === 1;
  }
}
