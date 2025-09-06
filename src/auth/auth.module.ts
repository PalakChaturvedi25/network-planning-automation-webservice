import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { RoleManagement } from './entities/role-management.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleManagement])
  ],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}