import { Controller, Get, Logger, Post } from '@nestjs/common';
import { Test } from './test.entity';
import { TestService } from './test.service';

@Controller('test')
export class TestController {
  constructor(
    private readonly logger: Logger,
    private readonly testService: TestService,
  ) {}

  @Get()
  find(): Promise<Test[]> {
    this.logger.log('Fetching tests data...');
    return this.testService.findAll();
  }

  @Post()
  create(): Promise<Test> {
    this.logger.log('Creating test data...');
    const test: Test = new Test();
    test.age = 23;
    test.name = 'John Doe';
    return this.testService.createTest(test);
  }
}
