import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FlightQueryDto } from './dto/flight-query.dto';
import { FlightVersionQueryDto } from './dto/flight-version-query.dto';
import {
  FlightApiResponse,
  ProcessedFlightData,
  FlightVersionApiResponse,
  FlightVersionResponse,
  FlightVersionFullData
} from './interfaces/flight.interface';

@Injectable()
export class FlightService {
  private readonly logger = new Logger(FlightService.name);
  private readonly baseUrl = 'https://uat-int.qp.akasaair.com/api/qp-vision-webservice/api/v1/sm';

  constructor(private readonly httpService: HttpService) {}

  async getFlightVersions(queryDto: FlightQueryDto): Promise<ProcessedFlightData[]> {
    try {
      // Clean and validate parameters
      const cleanedQuery = {
        flightNumber: queryDto.flightNumber?.trim(),
        departureLocation: queryDto.departureLocation?.trim(),
        arrivalLocation: queryDto.arrivalLocation?.trim(),
        departureDate: queryDto.departureDate?.trim()
      };

      // Validate that all required parameters are provided
      if (!cleanedQuery.flightNumber || !cleanedQuery.departureLocation || !cleanedQuery.arrivalLocation || !cleanedQuery.departureDate) {
        throw new HttpException(
          'All parameters are required: flightNumber, departureLocation, arrivalLocation, departureDate',
          HttpStatus.BAD_REQUEST
        );
      }

      const url = this.buildApiUrl(cleanedQuery);
      this.logger.log(`Fetching data from: ${url}`);

      // Make HTTP request to external MongoDB API
      const response = await firstValueFrom(
        this.httpService.get<FlightApiResponse>(url, {
          timeout: 15000, // Increased timeout
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        })
      );
      // Log successful response
      this.logger.log(`API Response received with status: ${response.status}`);

      // Extract and process the data
      return this.extractSelectedFields(response.data);

    } catch (error) {
      this.logger.error('Error fetching flight data:', error.message);

      if (error.response) {
        // Log the full error response for debugging
        this.logger.error('API Response Status:', error.response.status);
        this.logger.error('API Response Headers:', JSON.stringify(error.response.headers, null, 2));
        this.logger.error('API Response Data:', JSON.stringify(error.response.data, null, 2));

        throw new HttpException(
          `External API error: ${error.response.status} - ${error.response.statusText}. Details: ${JSON.stringify(error.response.data)}`,
          HttpStatus.BAD_GATEWAY
        );
      } else if (error.code === 'ECONNABORTED') {
        throw new HttpException(
          'Request timeout - External API did not respond in time',
          HttpStatus.GATEWAY_TIMEOUT
        );
      } else {
        throw new HttpException(
          error.message || 'Failed to fetch data from external API',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  async getFlightVersionsByDate(queryDto: FlightVersionQueryDto): Promise<FlightVersionResponse[]> {
    try {
      // Validate date parameter
      if (!queryDto.date?.trim()) {
        throw new HttpException(
          'Date parameter is required',
          HttpStatus.BAD_REQUEST
        );
      }

      const url = this.buildFlightVersionUrl(queryDto.date.trim());
      this.logger.log(`Fetching flight versions from: ${url}`);

      // Make HTTP request to external API
      const response = await firstValueFrom(
        this.httpService.get<FlightVersionApiResponse>(url, {
          timeout: 15000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        })
      );

      this.logger.log(`Flight version API response received with status: ${response.status}`);

      // Extract and process the data
      return this.extractFlightVersionFields(response.data);

    } catch (error) {
      this.logger.error('Error fetching flight version data:', error.message);

      if (error.response) {
        this.logger.error('API Response Status:', error.response.status);
        this.logger.error('API Response Data:', JSON.stringify(error.response.data, null, 2));

        throw new HttpException(
          `External API error: ${error.response.status} - ${error.response.statusText}`,
          HttpStatus.BAD_GATEWAY
        );
      } else if (error.code === 'ECONNABORTED') {
        throw new HttpException(
          'Request timeout - External API did not respond in time',
          HttpStatus.GATEWAY_TIMEOUT
        );
      } else {
        throw new HttpException(
          error.message || 'Failed to fetch flight version data from external API',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }

  private buildApiUrl(queryDto: FlightQueryDto): string {
    const baseUrl = `${this.baseUrl}/flight/versions`;
    const params = new URLSearchParams();

    // Log the input parameters for debugging
    this.logger.log(`Input parameters: ${JSON.stringify(queryDto)}`);

    // Trim whitespace from parameters and add them
    const flightNumber = queryDto.flightNumber?.trim();
    const departureLocation = queryDto.departureLocation?.trim();
    const arrivalLocation = queryDto.arrivalLocation?.trim();
    const departureDate = queryDto.departureDate?.trim();
    const std = queryDto.std?.trim();
    const date = queryDto.date?.trim();

    this.logger.log(`Trimmed parameters - Flight: ${flightNumber}, Dep: ${departureLocation}, Arr: ${arrivalLocation}, Date: ${departureDate}`);

    if (flightNumber) params.append('flightNumber', flightNumber);
    if (departureLocation) params.append('departureLocation', departureLocation);
    if (arrivalLocation) params.append('arrivalLocation', arrivalLocation);
    if (departureDate) params.append('departureDate', departureDate);

    const finalUrl = `${baseUrl}?${params.toString()}`;
    this.logger.log(`Final URL: ${finalUrl}`);

    return finalUrl;
  }

  /**
   * Build URL for flight version API
   */
  private buildFlightVersionUrl(date: string): string {
    const url = `${this.baseUrl}/flights/version?date=${encodeURIComponent(date)}`;
    this.logger.log(`Built flight version URL: ${url}`);
    return url;
  }

  private extractSelectedFields(apiResponse: FlightApiResponse): ProcessedFlightData[] {
    try {
      this.logger.log('=== RAW API RESPONSE ===');
      this.logger.log(JSON.stringify(apiResponse, null, 2));

      // The API response has data under "content" property
      let dataArray: any[] = [];

      // Handle the specific API response structure
      if (apiResponse.content && Array.isArray(apiResponse.content)) {
        dataArray = apiResponse.content;
        this.logger.log('Response has content array property');
      } else if (Array.isArray(apiResponse)) {
        dataArray = apiResponse;
        this.logger.log('Response is direct array');
      } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
        dataArray = apiResponse.data;
        this.logger.log('Response has data array property');
      } else {
        // If response is not an array, wrap it in an array
        dataArray = [apiResponse];
        this.logger.log('Response is single object, wrapped in array');
      }

      this.logger.log('=== DATA ARRAY TO PROCESS ===');
      this.logger.log(`Processing ${dataArray.length} items`);

      // Extract only the required fields using actual field names from the API
      return dataArray.map((item, index) => {
        this.logger.log(`=== PROCESSING ITEM ${index} ===`);

        // Map to actual field names from the API response
        const processedItem: ProcessedFlightData = {
          // Using actual field names from your API response:
          date: item.date || 'N/A' ,
          flightNumber: item.flightNumber || 'N/A',           // Flight number
          departureStation: item.departureStation || 'N/A',       // Departure station (CCU)
          arrivalStation: item.arrivalStation || 'N/A',         // Arrival station (BLR)
           std: item.std || 'N/A' ,// Scheduled departure time
           sta: item.sta || 'N/A' ,  // Scheduled arrival time
           departureTerminal: item.departureTerminal || 'N/A' ,
           arrivalTerminal: item.arrivalTerminal || 'N/A' ,
          // You can also include other useful fields by updating the interface:
          aircraftEquipment: item.aircraftEquipment || 'N/A' ,
          aircraftConfiguration: item.aircraftConfiguration || 'N/A' ,
          codeShareDuplicateLeg: item.codeShareDuplicateLeg || 'N/A'
//           serviceType: item.serviceType || 'N/A' ,
//           isLatest: item.isLatest || 'N/A'
        };

        this.logger.log('=== PROCESSED ITEM ===');
        this.logger.log(JSON.stringify(processedItem, null, 2));

        return processedItem;
      });

    } catch (error) {
      this.logger.error('Error processing API response:', error);
      this.logger.error('Raw response that caused error:', JSON.stringify(apiResponse, null, 2));
      throw new HttpException(
        'Error processing data from external API',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  // Add this method to your existing FlightService class

  /**
   * Enhanced version of getFlightVersionsByDate with better timeout and retry logic
   */
  async getFlightVersionsByDateWithRetry(queryDto: FlightVersionQueryDto, retries: number = 2): Promise<FlightVersionResponse[]> {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        // Validate date parameter
        if (!queryDto.date?.trim()) {
          throw new HttpException(
            'Date parameter is required',
            HttpStatus.BAD_REQUEST
          );
        }

        const url = this.buildFlightVersionUrl(queryDto.date.trim());
        this.logger.log(`Attempt ${attempt}: Fetching flight versions from: ${url}`);

        // Increased timeout and better configuration
        const response = await firstValueFrom(
          this.httpService.get<FlightVersionApiResponse>(url, {
            timeout: 30000, // Increased to 30 seconds
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Connection': 'keep-alive',
              'Accept-Encoding': 'gzip, deflate'
            },
            maxRedirects: 5,
            validateStatus: function (status) {
              return status >= 200 && status < 300; // Only accept 2xx responses
            }
          })
        );

        this.logger.log(`Flight version API response received with status: ${response.status} on attempt ${attempt}`);

        // Extract and process the data
        const result = this.extractFlightVersionFields(response.data);
        this.logger.log(`Successfully processed ${result.length} flight records`);

        return result;

      } catch (error) {
        this.logger.error(`Attempt ${attempt} failed:`, error.message);

        // If this is the last attempt, throw the error
        if (attempt === retries + 1) {
          if (error.response) {
            this.logger.error('Final API Response Status:', error.response.status);
            this.logger.error('Final API Response Data:', JSON.stringify(error.response.data, null, 2));

            throw new HttpException(
              `External API error after ${retries + 1} attempts: ${error.response.status} - ${error.response.statusText}`,
              HttpStatus.BAD_GATEWAY
            );
          } else if (error.code === 'ECONNABORTED') {
            throw new HttpException(
              `Request timeout after ${retries + 1} attempts - External API did not respond in time`,
              HttpStatus.GATEWAY_TIMEOUT
            );
          } else if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
            throw new HttpException(
              `Connection error after ${retries + 1} attempts - Unable to reach external API`,
              HttpStatus.BAD_GATEWAY
            );
          } else {
            throw new HttpException(
              error.message || `Failed to fetch flight version data after ${retries + 1} attempts`,
              error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries + 1) {
          const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
          this.logger.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
}

  /**
   * Extract only the specific fields requested for flight versions
   */
  private extractFlightVersionFields(apiResponse: FlightVersionApiResponse): FlightVersionResponse[] {
    try {
      this.logger.log('=== FLIGHT VERSION RAW API RESPONSE ===');
      this.logger.log(JSON.stringify(apiResponse, null, 2));

      // Handle the API response structure
      let dataArray: FlightVersionFullData[] = [];

      if (apiResponse.content && Array.isArray(apiResponse.content)) {
        dataArray = apiResponse.content;
        this.logger.log(`Found ${dataArray.length} flight version records in content array`);
      } else {
        throw new HttpException(
          'Unexpected API response structure - content array not found',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // Extract only the specific fields requested
      return dataArray.map((item, index) => {
        this.logger.log(`Processing flight version item ${index + 1}`);

        const extractedData: FlightVersionResponse = {
          date: item.date || 'N/A' ,
                   flightNumber: item.flightNumber || 'N/A',           // Flight number
                   departureStation: item.departureStation || 'N/A',       // Departure station (CCU)
                   arrivalStation: item.arrivalStation || 'N/A',         // Arrival station (BLR)
                    std: item.std || 'N/A' ,// Scheduled departure time
                    sta: item.sta || 'N/A' ,  // Scheduled arrival time
                    departureTerminal: item.departureTerminal || 'N/A' ,
                    arrivalTerminal: item.arrivalTerminal || 'N/A' ,
                   // You can also include other useful fields by updating the interface:
                   aircraftEquipment: item.aircraftEquipment || 'N/A' ,
                   aircraftConfiguration: item.aircraftConfiguration || 'N/A' ,
                   codeShareDuplicateLeg: item.codeShareDuplicateLeg || 'N/A'
        };

        this.logger.log('Extracted flight version data:', JSON.stringify(extractedData, null, 2));
        return extractedData;
      });

    } catch (error) {
      this.logger.error('Error processing flight version API response:', error);
      this.logger.error('Raw response that caused error:', JSON.stringify(apiResponse, null, 2));
      throw new HttpException(
        'Error processing flight version data from external API',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  }



