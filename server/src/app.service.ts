import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DuckDbService } from './duckdb/duckdb.service';

@Injectable()
export class AppService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly duckDb: DuckDbService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    let duckdb: 'connected' | 'disconnected' = 'disconnected';

    try {
      duckdb = (await this.duckDb.ping()) ? 'connected' : 'disconnected';
    } catch {
      duckdb = 'disconnected';
    }

    return {
      status: 'ok',
      database: this.dataSource.isInitialized ? 'connected' : 'disconnected',
      duckdb,
      duckdbPath: this.duckDb.getPath(),
    };
  }
}
