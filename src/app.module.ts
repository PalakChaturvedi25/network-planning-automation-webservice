import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { TestModule } from './test-module/test.module';
import { DatabaseModule } from './db/database.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { LoggingInterceptor } from './common/global-api-request.logger';
import { HttpModule } from '@nestjs/axios';
import { FlightModule } from './flight/flight.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleManagement } from './auth/entities/role-management.entity';

/**
 * AppModule Configuration
 *
 * This module configures the core application setup with the following key features:
 *
 * @imports
 * - AppConfigModule: Provides application-wide configuration
 * - TestModule: Module for test-related functionality
 * - DatabaseModule: Handles database connections and operations
 *
 * @controllers
 * - AppController: Main application controller
 *
 * @providers
 * - AppService: Main application service
 * - Logger: NestJS built-in Logger (can be replaced with a custom logger)
 * - GlobalExceptionFilter: Global error handling filter
 * - LoggingInterceptor: Global request/response logging interceptor
 *
 * @note Have used a logger interceptor to have a standardized request response log
 * for any incoing API request
 *
 */
@Module({
  imports: [
    AppConfigModule,
    HttpModule,
    FlightModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      //       host: process.env.DB_HOST,
      //       port: parseInt(process.env.DB_PORT, 3306 ),
      //       username: process.env.DB_USERNAME,
      //       password: process.env.DB_PASSWORD,
      //       database: process.env.DB_NAME,
      host: '172.24.87.43',
      port: 3306,
      username: 'appuser-network-planning',
      password: 'YmmhKi7dnY#1345icnh',
      database: 'QP_NETWORK_PLANNING',
      entities: [__dirname + '/**/*.entity.{js,ts}'],
      synchronize: false,    // set true only for development
       extra: {
                authPlugin: 'mysql_native_password',
                // Additional connection options for better stability
                acquireTimeout: 60000,
                timeout: 60000,
                // Connection pool settings
                connectionLimit: 10,
              },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Logger,
    {
      provide: 'APP_FILTER',
      useClass: GlobalExceptionFilter,
    },
    {
      provide: 'APP_INTERCEPTOR',
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
