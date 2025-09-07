import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private pool: mysql.Pool; // Add this property

  constructor(private readonly configService: ConfigService) {
    // Initialize the connection pool in constructor
    this.pool = mysql.createPool({
      host: '172.24.87.43',                    // Use direct values or fix ConfigService
          port: 3306,
          user: 'appuser-network-planning',
          password: 'YmmhKi7dnY#1345icnh',
          database: 'QP_NETWORK_PLANNING',
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
    });
  }

  get port(): number {
    return this.configService.get<number>('3000');
  }

  get getDatabaseUrl(): string {
    return this.configService.get<string>('172.24.87.43');
  }

  get getDatabaseUsername(): string {
    return this.configService.get<string>('appuser-network-planning');
  }

  get getDatabasePassword(): string {
    return this.configService.get<string>('YmmhKi7dnY#1345icnh');
  }

  get getDatabaseName(): string {
    return this.configService.get<string>('QP_NETWORK_PLANNING');
  }

  get getDatabasePort(): number {
    return this.configService.get<number>('3306');
  }

  async query(sql: string, params?: any[]): Promise<any> {
    try {
      this.logger.log(`Executing query: ${sql}`);
      if (params) {
        this.logger.log(`Query params: ${JSON.stringify(params)}`);
      }

      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      this.logger.error(`Database query error: ${error.message}`);
      this.logger.error(`Failed query: ${sql}`);
      if (params) {
        this.logger.error(`Query params: ${JSON.stringify(params)}`);
      }
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}