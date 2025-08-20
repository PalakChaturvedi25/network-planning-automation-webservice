import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IsNotEmpty, IsString, IsDateString } from 'class-validator';


export class FlightVersionQueryDto {
  @IsNotEmpty()
  @IsString()
  @IsDateString()
  date: string;
}