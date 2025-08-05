import { Injectable } from '@nestjs/common';
import { Test } from './test.entity';
import { TestRepository } from './test.repository';

@Injectable()
export class TestService {
  constructor(private readonly testRepository: TestRepository) {}

  async findAll(): Promise<Test[]> {
    return await this.testRepository.findAll();
  }

  async createTest(test: Test): Promise<Test> {
    return await this.testRepository.createTest(test);
  }
}
