import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (appConfigService: ConfigService) => ({
        type: 'mysql',
        host: appConfigService.get<string>('MYSQL_DATABASE_HOST'),
        username: appConfigService.get<string>('MYSQL_DATABASE_USER'),
        password: appConfigService.get<string>('MYSQL_DATABASE_PASSWORD'),
        database: appConfigService.get<string>('MYSQL_DATABASE_NAME'),
        port: appConfigService.get<number>('MYSQL_DATABASE_PORT'),
        synchronize: true,
        autoLoadEntities: true,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        retryAttempts: 5,
        retryDelay: 2000,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
