import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { TestModule } from './test-module/test.module';
import { DatabaseModule } from './db/database.module';

@Module({
  imports: [AppConfigModule, TestModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService, Logger],
})
export class AppModule {}
