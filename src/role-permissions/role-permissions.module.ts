import { Module } from '@nestjs/common';
import { RolePermissionsController } from './role-permissions.controller';
import { RolePermissionsService } from './role-permissions.service';
import { DatabaseModule } from '../db/database.module';
import { ConfigModule } from '@nestjs/config'; // Add this
import { AppConfigService } from '../config/app-config.service'; // Add this


@Module({
  imports: [DatabaseModule],
  controllers: [RolePermissionsController],
  providers: [RolePermissionsService , AppConfigService],
  exports: [RolePermissionsService],
})
export class RolePermissionsModule {}