import { ConfigService } from '@nestjs/config';

export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.get<number>('PORT');
  }

  get getDatabaseUrl(): string {
    return this.configService.get<string>('MYSQL_DATABASE_HOST');
  }

  get getDatabaseUsername(): string {
    return this.configService.get<string>('MYSQL_DATABASE_USERNAME');
  }

  get getDatabasePassword(): string {
    return this.configService.get<string>('MYSQL_DATABASE_PASSWORD');
  }

  get getDatabaseName(): string {
    return this.configService.get<string>('MYSQL_DATABASE_NAME');
  }

  get getDatabasePort(): number {
    return this.configService.get<number>('MYSQL_DATABASE_PORT');
  }
}
