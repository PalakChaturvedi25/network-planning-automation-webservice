import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FlightController } from './flight.controller';
import { FlightService } from './flight.service';
import { AuthService } from '../auth/auth.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [FlightController],
  providers: [FlightService,
       AuthService,
       RolesGuard
       ],
})
export class FlightModule {}