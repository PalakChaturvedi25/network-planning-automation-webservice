import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from 'src/config/app-config.module';
import { AppConfigService } from 'src/config/app-config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (appConfigService: AppConfigService) => ({
        type: 'mysql',
        host: appConfigService.getDatabaseUrl,
        username: appConfigService.getDatabaseUsername,
        password: appConfigService.getDatabasePassword,
        database: appConfigService.getDatabaseName,
        port: appConfigService.getDatabasePort,
        synchronize: true,
        autoLoadEntities: true,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        retryAttempts: 5,
        retryDelay: 2000,
      }),
      inject: [AppConfigService],
    }),
  ],
})
export class DatabaseModule {}
