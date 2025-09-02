import { Injectable,
    HttpException,
      HttpStatus,
       Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as jwt from 'jsonwebtoken';

// Define interfaces for user permissions
export interface UserPermissions {
  userId: string;
  roles: string[];
  allowedLocations?: {
    departureStations: string[];
    arrivalStations: string[];
  };
}

// You'll need to create these entities
// import { User } from './entities/user.entity';
// import { Role } from './entities/role.entity';
// import { UserRole } from './entities/user-role.entity';
// import { RoleLocation } from './entities/role-location.entity';

@Injectable()
export class AuthService {
  constructor(
    // @InjectRepository(User)
    // private userRepository: Repository<User>,
    // @InjectRepository(UserRole)
    // private userRoleRepository: Repository<UserRole>,
    // @InjectRepository(RoleLocation)
    // private roleLocationRepository: Repository<RoleLocation>,
  ) {}

  async validateToken(token: string): Promise<any> {
    try {
      // Validate JWT token and return user
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      return decoded;
    } catch (error) {
      return null;
    }
  }

  async getUserPermissions(userId: string): Promise<UserPermissions> {
    // Query database to get user roles and location permissions

    // Example query structure (adjust based on your database schema):
    /*
    const userRoles = await this.userRoleRepository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .leftJoinAndSelect('role.locations', 'locations')
      .where('ur.userId = :userId', { userId })
      .getMany();

    const roles = userRoles.map(ur => ur.role.name);

    // Get location restrictions for user's roles
    const allowedLocations = {
      departureStations: [],
      arrivalStations: []
    };

    userRoles.forEach(ur => {
      if (ur.role.locations) {
        ur.role.locations.forEach(loc => {
          if (loc.departureStation) {
            allowedLocations.departureStations.push(loc.departureStation);
          }
          if (loc.arrivalStation) {
            allowedLocations.arrivalStations.push(loc.arrivalStation);
          }
        });
      }
    });
    */

    // For now, return mock data - replace with actual database queries
    return {
      userId,
      roles: ['flight_viewer', 'admin'], // From database
      allowedLocations: {
        departureStations: ['CCU', 'BLR'], // From database
        arrivalStations: ['BLR', 'DEL']    // From database
      }
    };
  }

  async hasFlightAccess(userPermissions: UserPermissions): Promise<boolean> {
    return userPermissions.roles.some(role =>
      ['flight_viewer', 'flight_admin', 'admin'].includes(role)
    );
  }

  async canViewAllLocations(userPermissions: UserPermissions): Promise<boolean> {
    return userPermissions.roles.includes('admin');
  }

  private async extractUserPermissions(authHeader?: string): Promise<UserPermissions | undefined> {

//       this.logger.log('=== AUTH DEBUG ===');
//       this.logger.log('Auth header received:', authHeader);
    if (!authHeader) {
//         this.logger.log('No auth header - returning admin permissions');
      // Return admin permissions when no auth header (for testing)
      return {
        userId: 'anonymous',
        roles: ['admin'],
        allowedLocations: undefined // Admin sees all locations
      };
    }

    try {
      const token = authHeader.replace('Bearer ', '');
//       this.logger.log('Extracted token:', token);
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Mock different user types based on roles
      if (decoded.roles.includes('admin')) {
        return {
          userId: decoded.userId,
          roles: decoded.roles,
          allowedLocations: undefined // Admin sees all
        };
      } else {
        return {
          userId: decoded.userId,
          roles: decoded.roles,
          allowedLocations: {
            departureStations: ['CCU'], // Restricted user
            arrivalStations: ['BLR']
          }
        };
      }
    } catch (error) {
//         this.logger.error('Token validation error:', error.message);
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }
}