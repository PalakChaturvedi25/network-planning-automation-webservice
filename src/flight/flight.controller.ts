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

  @Get('versions/by-date/download')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async downloadFlightVersionsByDate(
    @Query() queryDto: FlightVersionQueryDto
  ): Promise<StreamableFile> {
    const startTime = Date.now();

    try {
      this.logger.log(`Received download request with date: ${queryDto.date}`);

      // Validate date parameter first
      if (!queryDto.date?.trim()) {
        throw new HttpException('Date parameter is required', HttpStatus.BAD_REQUEST);
      }

      // Get the flight data with retry logic
      let flightData;
      try {
        // Check if the enhanced method exists, otherwise use the original
        if (typeof this.flightService.getFlightVersionsByDateWithRetry === 'function') {
          flightData = await this.flightService.getFlightVersionsByDateWithRetry(queryDto, 2);
        } else {
          flightData = await this.flightService.getFlightVersionsByDate(queryDto);
        }
      } catch (apiError) {
        this.logger.error('API call failed:', apiError.message);

        const message = apiError instanceof HttpException ?
          'External API Error' : 'Failed to fetch flight data';

        throw new HttpException(
          'Unable to retrieve flight data for Excel generation',
          apiError instanceof HttpException ? apiError.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      if (!flightData || flightData.length === 0) {
        throw new HttpException(
          `No flight data found for the specified date: ${queryDto.date}`,
          HttpStatus.NOT_FOUND
        );
      }

      this.logger.log(`Processing ${flightData.length} flight records for Excel generation`);

      // Generate Excel buffer
      const buffer = this.generateExcelBuffer(flightData);

      // Create filename with date and timestamp
      const dateForFilename = queryDto.date.replace(/[^\w\-_]/g, '_');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `flight_versions_${dateForFilename}_${timestamp}.xlsx`;

      const processingTime = Date.now() - startTime;
      this.logger.log(`Generated Excel file: ${filename} with ${flightData.length} records in ${processingTime}ms`);

      // Return StreamableFile with filename in Content-Disposition header
      const streamableFile = new StreamableFile(buffer, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: `attachment; filename="${filename}"`
      });

      return streamableFile;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Excel download error after ${processingTime}ms:`, error);

      // If it's already an HttpException, just re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // Otherwise, wrap it in an HttpException
      throw new HttpException(
        'Failed to generate Excel file',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private generateExcelBuffer(flightData: any[]): Buffer {
    // Transform data for Excel - convert to plain objects with readable headers
    const excelData = flightData.map((flight, index) => ({
      'S.No': index + 1,
      'Date': flight.date || 'N/A',
      'Flight Number': flight.flightNumber || 'N/A',
      'Departure Station': flight.departureStation || 'N/A',
      'Arrival Station': flight.arrivalStation || 'N/A',
      'Scheduled Departure Time': flight.std || 'N/A',
      'Scheduled Arrival Time': flight.sta || 'N/A',
      'Departure Terminal': flight.departureTerminal || 'N/A',
      'Arrival Terminal': flight.arrivalTerminal || 'N/A',
      'Aircraft Equipment': flight.aircraftEquipment || 'N/A',
      'Aircraft Configuration': flight.aircraftConfiguration || 'N/A',
      'Code Share Duplicate Leg': flight.codeShareDuplicateLeg || 'N/A'
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 8 },  // S.No
      { wch: 12 }, // Date
      { wch: 15 }, // Flight Number
      { wch: 18 }, // Departure Station
      { wch: 18 }, // Arrival Station
      { wch: 22 }, // STD
      { wch: 22 }, // STA
      { wch: 20 }, // Departure Terminal
      { wch: 18 }, // Arrival Terminal
      { wch: 20 }, // Aircraft Equipment
      { wch: 25 }, // Aircraft Configuration
      { wch: 25 }  // Code Share Duplicate Leg
    ];
    worksheet['!cols'] = columnWidths;

    // Add some styling to headers (optional)
    try {
      const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'E0E0E0' } }
          };
        }
      }
    } catch (stylingError) {
      this.logger.warn('Could not apply Excel styling:', stylingError.message);
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Flight Versions');

    // Generate Excel buffer
    return XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true
    }) as Buffer;
  }
}