import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.get<number>('3000');
  }

  get getDatabaseUrl(): string {
    return this.configService.get<string>('uat-esb-db.cfwwkweqog18.ap-south-1.rds.amazonaws.com');
  }

  get getDatabaseUsername(): string {
    return this.configService.get<string>('appuser-data-transfer-service');
  }

  get getDatabasePassword(): string {
    return this.configService.get<string>('Dtfrtsvric37282sfn99qqt');
  }

  get getDatabaseName(): string {
    return this.configService.get<string>('QP_DL_CM_PROD');
  }

  get getDatabasePort(): number {
    return this.configService.get<number>('3306');
  }
}
