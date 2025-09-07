import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UserPermissions, AuthService } from '../auth/auth.service';
import { FlightQueryDto } from './dto/flight-query.dto';
import { FlightVersionQueryDto } from './dto/flight-version-query.dto';
import {
  FlightApiResponse,
  ProcessedFlightData,
  FlightVersionApiResponse,
  FlightVersionResponse,
  FlightVersionFullData,
  VersionInfo,
  VersionInfoApiResponse
} from './interfaces/flight.interface';


@Injectable()
export class FlightService {
  private readonly logger = new Logger(FlightService.name);
  private readonly baseUrl = 'https://uat-int.qp.akasaair.com/api/qp-vision-webservice/api/v1/sm';

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: AuthService
  ) {}

  async getFlightVersions(queryDto: FlightQueryDto, userPermissions?: UserPermissions): Promise<ProcessedFlightData[]> {
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

       let flights = await this.extractSelectedFields(response.data);
          if (userPermissions) {
            flights = await this.applyPermissionFilters(flights, userPermissions); // Add await
          }

          return flights;

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

  async getFlightVersionsByDate(queryDto: FlightVersionQueryDto, userPermissions?: UserPermissions): Promise<FlightVersionResponse[]> {
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

     let flights = await this.extractFlightVersionFields(response.data);

         if (userPermissions) {

           flights = await this.applyFlightVersionPermissionFilters(flights, userPermissions); // Add await
         }

         return flights;
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

  async getFlightVersionsByDateWithRetry(queryDto: FlightVersionQueryDto, userPermissions?: UserPermissions, retries: number = 2): Promise<FlightVersionResponse[]> {
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
       let result = await this.extractFlightVersionFields(response.data);

             if (userPermissions) {
               result = await this.applyFlightVersionPermissionFilters(result, userPermissions); // Add await
             }

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

  // New method to apply permission-based filters for flight data
  private async applyPermissionFilters(flights: ProcessedFlightData[], userPermissions: UserPermissions): Promise<ProcessedFlightData[]> {
    this.logger.log('Applying permission filters to flight data');


    if (userPermissions.roles.includes('admin')) {
      this.logger.log('User has admin role - returning all flights');
      return flights;
    }

    // Get user's station and date permissions dynamically from database
    const stationDatePerms = await this.authService.getUserStationAndDatePermissions(userPermissions.roles);

    this.logger.log(`User allowed stations: ${JSON.stringify(stationDatePerms.allowedStations)}`);
    this.logger.log(`User date ranges: ${JSON.stringify(stationDatePerms.dateRanges)}`);

    let filteredFlights = [...flights];

    // Apply station-based filtering (departure OR arrival station must match)
    if (stationDatePerms.allowedStations.length > 0) {
      filteredFlights = filteredFlights.filter(flight => {
        const isDepartureAllowed = stationDatePerms.allowedStations.includes(flight.departureStation);
        const isArrivalAllowed = stationDatePerms.allowedStations.includes(flight.arrivalStation);

        const hasStationAccess = isDepartureAllowed || isArrivalAllowed;

        if (!hasStationAccess) {
          this.logger.log(`Flight ${flight.flightNumber} blocked: stations ${flight.departureStation}-${flight.arrivalStation} not in allowed list`);
        }

        return hasStationAccess;
      });

      this.logger.log(`After station filtering: ${filteredFlights.length} flights remaining`);
    }

//     // Apply date range filtering (flight date must be within any of the user's valid date ranges)
//     if (stationDatePerms.dateRanges.length > 0) {
//       filteredFlights = filteredFlights.filter(flight => {
//         if (!flight.date || flight.date === 'N/A') {
//           this.logger.log(`Flight ${flight.flightNumber} blocked: no valid date`);
//           return false;
//         }
//
//         const flightDate = new Date(flight.date);
//
//         // Check if flight date falls within any of the user's valid date ranges
//         const isDateAllowed = stationDatePerms.dateRanges.some(range => {
//           const startDate = new Date(range.start_date);
//           const endDate = new Date(range.end_date);
//           const isInRange = flightDate >= startDate && flightDate <= endDate;
//
//           if (!isInRange) {
//             this.logger.log(`Flight ${flight.flightNumber} date ${flight.date} not in range ${range.start_date} to ${range.end_date}`);
//           }
//
//           return isInRange;
//         });
//
//         if (!isDateAllowed) {
//           this.logger.log(`Flight ${flight.flightNumber} blocked: date ${flight.date} not within any allowed date range`);
//         }
//
//         return isDateAllowed;
//       });
//
//       this.logger.log(`After date filtering: ${filteredFlights.length} flights remaining`);
//     }

    return filteredFlights;
  }


  // New method to apply permission-based filters for flight version data
 private async applyFlightVersionPermissionFilters(flights: FlightVersionResponse[], userPermissions: UserPermissions): Promise<FlightVersionResponse[]> {
   this.logger.log('Applying permission filters to flight version data');

   // Check if user has admin role (admin sees everything)
   if (userPermissions.roles.includes('admin')) {
     this.logger.log('User has admin role - returning all flight versions');
     return flights;
   }

   // Get user's station and date permissions dynamically from database
   const stationDatePerms = await this.authService.getUserStationAndDatePermissions(userPermissions.roles);

   this.logger.log(`User allowed stations: ${JSON.stringify(stationDatePerms.allowedStations)}`);
   this.logger.log(`User date ranges: ${JSON.stringify(stationDatePerms.dateRanges)}`);

   let filteredFlights = [...flights];

   // Apply station-based filtering (departure OR arrival station must match)
   if (stationDatePerms.allowedStations.length > 0) {
     filteredFlights = filteredFlights.filter(flight => {
       const isDepartureAllowed = stationDatePerms.allowedStations.includes(flight.departureStation);
       const isArrivalAllowed = stationDatePerms.allowedStations.includes(flight.arrivalStation);

       const hasStationAccess = isDepartureAllowed || isArrivalAllowed;

       if (!hasStationAccess) {
         this.logger.log(`Flight version ${flight.flightNumber} blocked: stations ${flight.departureStation}-${flight.arrivalStation} not in allowed list`);
       }

       return hasStationAccess;
     });

     this.logger.log(`After station filtering: ${filteredFlights.length} flight versions remaining`);
   }

   // Apply date range filtering
   if (stationDatePerms.dateRanges.length > 0) {
     filteredFlights = filteredFlights.filter(flight => {
       if (!flight.date || flight.date === 'N/A') {
         this.logger.log(`Flight version ${flight.flightNumber} blocked: no valid date`);
         return false;
       }

       const flightDate = new Date(flight.date);

       // Check if flight date falls within any of the user's valid date ranges
       const isDateAllowed = stationDatePerms.dateRanges.some(range => {
         const startDate = new Date(range.start_date);
         const endDate = new Date(range.end_date);
         const isInRange = flightDate >= startDate && flightDate <= endDate;

         if (!isInRange) {
           this.logger.log(`Flight version ${flight.flightNumber} date ${flight.date} not in range ${range.start_date} to ${range.end_date}`);
         }

         return isInRange;
       });

       if (!isDateAllowed) {
         this.logger.log(`Flight version ${flight.flightNumber} blocked: date ${flight.date} not within any allowed date range`);
       }

       return isDateAllowed;
     });

     this.logger.log(`After date filtering: ${filteredFlights.length} flight versions remaining`);
   }

   return filteredFlights;
 }

  // Add these private methods for filtering:
  private filterByUserLocations(flights: ProcessedFlightData[], userPermissions: UserPermissions): ProcessedFlightData[] {
    if (!userPermissions.allowedLocations) {
      return flights;
    }

    return flights.filter(flight => {
      const isDepartureAllowed = !userPermissions.allowedLocations.departureStations?.length ||
                                userPermissions.allowedLocations.departureStations.includes(flight.departureStation);

      const isArrivalAllowed = !userPermissions.allowedLocations.arrivalStations?.length ||
                              userPermissions.allowedLocations.arrivalStations.includes(flight.arrivalStation);

      return isDepartureAllowed && isArrivalAllowed;
    });
  }

  private filterFlightVersionsByUserLocations(flights: FlightVersionResponse[], userPermissions: UserPermissions): FlightVersionResponse[] {
    if (!userPermissions.allowedLocations) {
      return flights;
    }

    return flights.filter(flight => {
      const isDepartureAllowed = !userPermissions.allowedLocations.departureStations?.length ||
                                userPermissions.allowedLocations.departureStations.includes(flight.departureStation);

      const isArrivalAllowed = !userPermissions.allowedLocations.arrivalStations?.length ||
                              userPermissions.allowedLocations.arrivalStations.includes(flight.arrivalStation);

      return isDepartureAllowed && isArrivalAllowed;
    });
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

  private buildFlightVersionUrl(date: string): string {
    const url = `${this.baseUrl}/flights/version?date=${encodeURIComponent(date)}`;
    this.logger.log(`Built flight version URL: ${url}`);
    return url;
  }

  private versionInfoCache: { data: VersionInfo[]; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  async getVersionInfo(): Promise<VersionInfo[]> {
    try {
      // Check cache first
      if (this.versionInfoCache &&
          (Date.now() - this.versionInfoCache.timestamp) < this.CACHE_DURATION) {
        this.logger.log('Using cached version info');
        return this.versionInfoCache.data;
      }

      const url = `${this.baseUrl}/flights/versions/info`;
      this.logger.log(`Fetching version info from: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<VersionInfoApiResponse>(url, {
          timeout: 15000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        })
      );

      const versionData = response.data.content || [];

      // Cache the data
      this.versionInfoCache = {
        data: versionData,
        timestamp: Date.now()
      };

      this.logger.log(`Retrieved ${versionData.length} version info records`);
      return versionData;

    } catch (error) {
      this.logger.error('Error fetching version info:', error.message);
      // Return empty array if version info fails - don't break the main functionality
      return [];
    }
  }

  private getRevisedFileNameFromDate(date: string, versionInfoList: VersionInfo[]): string {
    if (!date || date === 'N/A' || versionInfoList.length === 0) {
      // Find the latest version as default
      const latestVersion = versionInfoList.find(v => v.isLatest);
      return latestVersion ? latestVersion.revisedFileName : 'N/A';
    }

    // Convert the flight date to match with version createdAt
    const flightDate = new Date(date);

    // Find the most appropriate version based on createdAt
    // Sort by createdAt descending and find the first one that was created before or on the flight date
    const sortedVersions = versionInfoList
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const version of sortedVersions) {
      const versionDate = new Date(version.createdAt);
      if (versionDate <= flightDate) {
        return version.revisedFileName;
      }
    }

    // If no version found before the flight date, use the latest
    const latestVersion = versionInfoList.find(v => v.isLatest);
    return latestVersion ? latestVersion.revisedFileName : 'N/A';
  }

  private async extractSelectedFields(apiResponse: FlightApiResponse): Promise<ProcessedFlightData[]> {
    try {
      this.logger.log('=== RAW API RESPONSE ===');
      this.logger.log(JSON.stringify(apiResponse, null, 2));

      const versionInfoList = await this.getVersionInfo();

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


        const originalDate = item.date || 'N/A';
        const revisedFileName = this.getRevisedFileNameFromDate(originalDate, versionInfoList);


        // Map to actual field names from the API response
        const processedItem: ProcessedFlightData = {
          // Using actual field names from your API response:
          revisedFileName: revisedFileName,
          flightNumber: item.flightNumber || 'N/A',           // Flight number
          departureStation: item.departureStation || 'N/A',       // Departure station (CCU)
          arrivalStation: item.arrivalStation || 'N/A',         // Arrival station (BLR)
          std: item.std || 'N/A',// Scheduled departure time
          sta: item.sta || 'N/A',  // Scheduled arrival time
          departureTerminal: item.departureTerminal || 'N/A',
          arrivalTerminal: item.arrivalTerminal || 'N/A',
          // You can also include other useful fields by updating the interface:
          aircraftEquipment: item.aircraftEquipment || 'N/A',
          aircraftConfiguration: item.aircraftConfiguration || 'N/A',
          codeShareDuplicateLeg: item.codeShareDuplicateLeg || 'N/A'
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

  private async extractFlightVersionFields(apiResponse: FlightVersionApiResponse): Promise<FlightVersionResponse[]> {
    try {
      this.logger.log('=== FLIGHT VERSION RAW API RESPONSE ===');
      this.logger.log(JSON.stringify(apiResponse, null, 2));


      const versionInfoList = await this.getVersionInfo();

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

         const originalDate = item.date || 'N/A';
         const revisedFileName = this.getRevisedFileNameFromDate(originalDate, versionInfoList);


        const extractedData: FlightVersionResponse = {
          revisedFileName: revisedFileName,
          flightNumber: item.flightNumber || 'N/A',           // Flight number
          departureStation: item.departureStation || 'N/A',       // Departure station (CCU)
          arrivalStation: item.arrivalStation || 'N/A',         // Arrival station (BLR)
          std: item.std || 'N/A',// Scheduled departure time
          sta: item.sta || 'N/A',  // Scheduled arrival time
          departureTerminal: item.departureTerminal || 'N/A',
          arrivalTerminal: item.arrivalTerminal || 'N/A',
          // You can also include other useful fields by updating the interface:
          aircraftEquipment: item.aircraftEquipment || 'N/A',
          aircraftConfiguration: item.aircraftConfiguration || 'N/A',
          codeShareDuplicateLeg: item.codeShareDuplicateLeg || 'N/A' ,
          date: item.date || 'N/A'
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