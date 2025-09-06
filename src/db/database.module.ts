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
        host: '172.24.87.43',
        port: 3306,
        username: 'appuser-network-planning',
        password: 'YmmhKi7dnY#1345icnh',
        database: 'QP_NETWORK_PLANNING',
        synchronize: false,
        autoLoadEntities: true,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        retryAttempts: 10, // Increased retry attempts
        retryDelay: 3000, // Increased delay between retries
        // Fix for MySQL authentication error
        extra: {
          authPlugin: 'mysql_native_password',
          // Additional connection options for better stability
          acquireTimeout: 60000,
          timeout: 60000,
          // Connection pool settings
          connectionLimit: 10,
        },
        // Enable logging in development for debugging
        logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
        // Connection pool configuration
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      }),
      inject: [AppConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}