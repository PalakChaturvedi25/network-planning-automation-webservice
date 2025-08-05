import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { TestModule } from './test-module/test.module';
import { DatabaseModule } from './db/database.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { LoggingInterceptor } from './common/global-api-request.logger';

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
  imports: [AppConfigModule, TestModule, DatabaseModule],
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
