import { Logger, Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from './test.entity';
import { TestRepository } from './test.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Test])],
  exports: [],
  providers: [Logger, TestService, TestRepository],
  controllers: [TestController],
})
export class TestModule {}
