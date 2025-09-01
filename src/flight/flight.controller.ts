import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  StreamableFile,
  Header
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { FlightService } from './flight.service';
import { FlightQueryDto } from './dto/flight-query.dto';
import { FlightVersionQueryDto } from './dto/flight-version-query.dto';

@Controller('api/flights')
export class FlightController {
  private readonly logger = new Logger(FlightController.name);

  constructor(private readonly flightService: FlightService) {}

  @Get('versions')
  async getFlightVersions(@Query() queryDto: FlightQueryDto) {
    try {
      this.logger.log(`Received request with params: ${JSON.stringify(queryDto)}`);

      const result = await this.flightService.getFlightVersions(queryDto);

      return {
        success: true,
        data: result,
        count: result.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Controller error:', error);
      throw error;
    }
  }

  @Get('versions/by-date')
  async getFlightVersionsByDate(@Query() queryDto: FlightVersionQueryDto) {
    try {
      this.logger.log(`Received flight version request with date: ${queryDto.date}`);

      const result = await this.flightService.getFlightVersionsByDate(queryDto);

      return {
        success: true,
        data: result,
        count: result.length,
        timestamp: new Date().toISOString(),
        message: 'Flight versions retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Flight version controller error:', error);
      throw error;
    }
  }

}