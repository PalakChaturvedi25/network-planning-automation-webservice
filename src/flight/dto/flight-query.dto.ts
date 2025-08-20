import { IsOptional, IsString, IsDateString } from 'class-validator';

export class FlightQueryDto {

  @IsString()
  flightNumber?: string; // e.g., "123, 456"

  @IsString()
  departureLocation?: string; // e.g., "DEL, BOM"

  @IsString()
  arrivalLocation?: string; // e.g., "BLR, CCU"

  @IsDateString()
  departureDate?: string; // e.g., "2025-07-20"

  @IsString()
  std?: string;

  @IsDateString()
  date?: string;
}