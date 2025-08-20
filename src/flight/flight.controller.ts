import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
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

  @Get('raw')
  async getRawFlightData(@Query() queryDto: FlightQueryDto) {
    try {
      // Validate required parameters
      if (!queryDto.flightNumber || !queryDto.departureLocation || !queryDto.arrivalLocation || !queryDto.departureDate) {
        return {
          success: false,
          error: 'All parameters are required: flightNumber, departureLocation, arrivalLocation, departureDate',
          receivedParams: queryDto,
          timestamp: new Date().toISOString()
        };
      }

      const result = await this.flightService.getRawFlightData(queryDto);

      return {
        success: true,
        rawApiResponse: result,
        responseType: Array.isArray(result) ? 'array' : typeof result,
        arrayLength: Array.isArray(result) ? result.length : 'N/A',
        firstItemKeys: Array.isArray(result) && result.length > 0 ? Object.keys(result[0]) :
                       (result && typeof result === 'object') ? Object.keys(result) : 'No keys',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Controller error (raw):', error);
      throw error;
    }
  }

  @Get('raw-versions')
  async getRawFlightVersionData(@Query('date') date: string) {
    try {
      if (!date?.trim()) {
        return {
          success: false,
          error: 'Date parameter is required',
          example: 'GET /api/flights/raw-versions?date=2025-07-15',
          timestamp: new Date().toISOString()
        };
      }

      const result = await this.flightService.getRawFlightVersionData(date);

      return {
        success: true,
        rawApiResponse: result,
        responseType: Array.isArray(result) ? 'array' : typeof result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Raw flight version controller error:', error);
      throw error;
    }
  }

  @Get('test-connection')
  async testConnection() {
    return this.flightService.testApiConnection();
  }

  @Get('test-flight-versions')
  async testFlightVersionApi() {
    return this.flightService.testFlightVersionApi();
  }

  @Get('test-manual-url')
  async testManualUrl() {
    return this.flightService.testWithManualUrl();
  }

  @Get('debug')
  async debugEndpoint(@Query() queryDto: FlightQueryDto) {
    try {
      // Validate required parameters
      if (!queryDto.flightNumber || !queryDto.departureLocation || !queryDto.arrivalLocation || !queryDto.departureDate) {
        return {
          success: false,
          error: 'All parameters are required: flightNumber, departureLocation, arrivalLocation, departureDate',
          receivedParams: queryDto,
          example: 'GET /api/flights/debug?flightNumber=123&departureLocation=DEL&arrivalLocation=BLR&departureDate=2025-07-20',
          timestamp: new Date().toISOString()
        };
      }

      this.logger.log(`Debug request with params: ${JSON.stringify(queryDto)}`);

      // First try to get raw data for debugging
      const rawResult = await this.flightService.getRawFlightData(queryDto);

      return {
        success: true,
        query: queryDto,
        rawData: rawResult,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Debug endpoint error:', error);
      return {
        success: false,
        query: queryDto,
        error: {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}