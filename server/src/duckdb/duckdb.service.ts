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
    return this.instance !== null;
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
  ): Promise<T[]> {
    return this.queryWithParams<T>(sql, []);
  }

  /**
   * Opens a short-lived connection per call so Promise.all is safe.
   */
  async queryWithParams<
    T extends Record<string, unknown> = Record<string, unknown>,
  >(sql: string, params: Array<string | number | bigint | null>): Promise<T[]> {
    if (!this.instance) {
      throw new Error('DuckDB is not connected');
    }

    const connection = await this.instance.connect();

    try {
      if (params.length === 0) {
        const reader = await connection.runAndReadAll(sql);
        return reader.getRowObjectsJson() as T[];
      }

      const statement = await connection.prepare(sql);

      try {
        params.forEach((value, index) => {
          const paramIndex = index + 1;

          if (value === null) {
            statement.bindNull(paramIndex);
            return;
          }

          if (typeof value === 'bigint') {
            statement.bindBigInt(paramIndex, value);
            return;
          }

          if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              statement.bindInteger(paramIndex, value);
            } else {
              statement.bindDouble(paramIndex, value);
            }
            return;
          }

          statement.bindVarchar(paramIndex, value);
        });

        const reader = await statement.runAndReadAll();
        return reader.getRowObjectsJson() as T[];
      } finally {
        statement.destroySync();
      }
    } finally {
      connection.closeSync();
    }
  }

  async ping(): Promise<boolean> {
    const rows = await this.query<{ ok: number | string }>('SELECT 1 AS ok');
    return Number(rows[0]?.ok) === 1;
  }
}
