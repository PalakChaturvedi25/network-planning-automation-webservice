import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

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
}
