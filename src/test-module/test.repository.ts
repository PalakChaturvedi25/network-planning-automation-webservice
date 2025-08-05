import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Test } from './test.entity';

@Injectable()
export class TestRepository {
  constructor(
    @InjectRepository(Test) private readonly testRepository: Repository<Test>,
  ) {}

  async findAll(): Promise<Test[]> {
    return await this.testRepository.find();
  }

  async createTest(test: Test): Promise<Test> {
    return await this.testRepository.save(test);
  }
}
