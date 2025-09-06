import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  StreamableFile,
  Header,
  UseGuards,
  Request
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { FlightService } from './flight.service';
import { FlightQueryDto } from './dto/flight-query.dto';
import { FlightVersionQueryDto } from './dto/flight-version-query.dto';
import { DynamicRolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';  // Add this import


@Controller('api/flights')
// @UseGuards(DynamicRolesGuard)
export class FlightController {
  private readonly logger = new Logger(FlightController.name);

  constructor(private readonly flightService: FlightService) {}

  @Get('versions')
  @UseGuards(DynamicRolesGuard)
  async getFlightVersions(@Query() queryDto: FlightQueryDto ,  @Request() request) {
    try {
      this.logger.log(`Received request with params: ${JSON.stringify(queryDto)}`);

        const result = await this.flightService.getFlightVersions(queryDto, request.userPermissions);

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
  @UseGuards(DynamicRolesGuard)
  async getFlightVersionsByDate(@Query() queryDto: FlightVersionQueryDto , @Request() request) {
    try {
      this.logger.log(`Received flight version request with date: ${queryDto.date}`);

      const result = await this.flightService.getFlightVersionsByDate(queryDto, request.userPermissions);

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



@Get('auth/generate-token')
async generateTestToken( @Query('role') role: string = 'flight_viewer',
                          @Query('userId') userId: string = 'test-user') {
  const jwt = require('jsonwebtoken');

  const payload = {
    userId,
    username: userId === 'admin-user' ? 'admin' : 'test',
    roles: [role],
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };

  const token = jwt.sign(payload, 'secret');

  return {
    token,
    payload,
    usage: `Use this token in Authorization header: Bearer ${token}`
  };
}




}