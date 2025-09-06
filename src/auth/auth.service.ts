import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository , In } from 'typeorm';
import { RoleManagement } from './entities/role-management.entity';
import * as jwt from 'jsonwebtoken';
import { SetMetadata } from '@nestjs/common';

// Define interfaces for user permissions
export interface UserPermissions {
 roles: string[];
   allowedLocations?: {
     departureStations: string[];
     arrivalStations: string[];
   };
   allowedDateRange?: {
     start: string;
     end: string;
   };
   hasDownloadAccess?: boolean;
   canReviseChanges?: boolean;
   canNominateMembers?: boolean;
 }

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(RoleManagement)
    private readonly roleManagementRepo: Repository<RoleManagement>,
  ) {}

  async validateToken(token: string): Promise<any> {
    try {
      // Validate JWT token and return user
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      return decoded;
    } catch (error) {
      this.logger.error('Token validation failed:', error.message);
      return null;
    }
  }
//    async getUserRoles(userId: string): Promise<string[]> {
//       // Fetch roles from the database based on userId
// //       const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['roles'] });
// //       return user?.roles.map(role => role.name) || [];
//     }

 async getUserPermissions(userRoles: string[]) {
   console.log(`Getting permissions for roles: ${JSON.stringify(userRoles)}`);

   try {
     // Query your actual database structure
     const roleEntries = await this.roleManagementRepo.find({
       where: { role: In(userRoles) } // Note: using 'role' field, not 'name'
     });

     console.log(`Found ${roleEntries.length} role entries for roles: ${userRoles.join(', ')}`);

     if (roleEntries.length === 0) {
       console.warn('No roles found in database');
       return {
         roles: [],
         permissions: {},
         stations: []
       };
     }

     // Extract unique roles and their permissions
     const roles = [...new Set(roleEntries.map(entry => entry.role))];
     const stations = [...new Set(roleEntries.map(entry => entry.station))];

     // Build permissions object based on your DB fields
     const permissions = {
       download_allowed: roleEntries.some(entry => entry.download_allowed === 1 ),
       revision_change_allowed: roleEntries.some(entry => entry.revision_change_allowed === 1 ),
       nominate_members_allowed: roleEntries.some(entry => entry.nominate_members_allowed === 1 ),
       stations: stations,
       // Add date validation if needed
       validDateRange: roleEntries.some(entry => {
         const now = new Date();
         const startDate = new Date(entry.start_date);
         const endDate = new Date(entry.end_date);
         return now >= startDate && now <= endDate;
       })
     };

     const result = {
       roles: roles,
       permissions: permissions,
       stations: stations,
       roleEntries: roleEntries // Include full entries for detailed checks
     };

     console.log(`User permissions result: ${JSON.stringify(result, null, 2)}`);
     return result;

   } catch (error) {
     console.error(`Error getting user permissions: ${error.message}`);
     throw error;
   }
 }


    async hasFlightAccess(userPermissions: UserPermissions): Promise<boolean> {
      try {
         // Check if user has any active roles (since we're being dynamic)
         return userPermissions.roles.length > 0;
       } catch (error) {
         this.logger.error('Error checking flight access:', error.message);
         return false;
       }
     }

  async canViewAllLocations(userPermissions: UserPermissions): Promise<boolean> {
    try {
       // Check if user has admin role and it's currently active
       return userPermissions.roles.includes('admin');
     } catch (error) {
       this.logger.error('Error checking admin access:', error.message);
       return false;
     }
   }

   private normalizeRole(role: string): string {
    // Convert hyphens to underscores to match database format
    return role.replace(/-/g, '_');
   }


   // Add this method to your AuthService to get user's allowed stations and date ranges
   async getUserStationAndDatePermissions(userRoles: string[]): Promise<{
     allowedStations: string[];
     dateRanges: Array<{ start_date: string; end_date: string }>;
   }> {
     const normalizedRoles = userRoles.map(role => this.normalizeRole(role));

     const roleEntries = await this.roleManagementRepo.find({
       where: { role: In(normalizedRoles) }
     });

     return {
       allowedStations: [...new Set(roleEntries.map(entry => entry.station).filter(Boolean))],
       dateRanges: roleEntries.map(entry => ({
         start_date: entry.start_date,
         end_date: entry.end_date
       })).filter(range => range.start_date && range.end_date)
     };
   }



  async extractUserPermissions(authHeader?: string): Promise<UserPermissions | undefined> {
    this.logger.log('=== AUTH DEBUG ===');
    this.logger.log('Auth header received:', authHeader ? 'Present' : 'Missing');

    if (!authHeader) {
      this.logger.log('No auth header - returning default permissions for testing');
      // For testing without auth header, you might want to return some default roles
      return await this.getUserPermissions(['admin']); // or whatever default roles you want
    }

    try {
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

      this.logger.log('Token decoded successfully');

      // Extract roles from token (modify this based on your JWT structure)
      let userRoles: string[] = [];

      if (decoded.roles && Array.isArray(decoded.roles)) {
        userRoles = decoded.roles;
      } else if (decoded.role) {
        userRoles = [decoded.role];
      } else {
        // If no roles in token, you might want to assign default roles or throw error
        this.logger.warn('No roles found in token');
        userRoles = ['guest']; // or throw an error
      }

      this.logger.log('Extracted roles from token:', userRoles);

      // Get actual user permissions from database based on roles
      const userPermissions = await this.getUserPermissions(userRoles);

      // If no active permissions found, return guest access
      if (userPermissions.roles.length === 0) {
        this.logger.warn(`No active permissions found for roles: ${userRoles.join(', ')}`);
        return {
          roles: ['guest'],
          allowedLocations: {
            departureStations: [],
            arrivalStations: []
          },
          hasDownloadAccess: false,
          canReviseChanges: false,
          canNominateMembers: false
        };
      }

      return userPermissions;

    } catch (error) {
      this.logger.error('Token validation error:', error.message);
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }



  async hasStationAccess(userRoles: string[], station: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userRoles);
    return permissions.stations.includes(station);
  }

// Method to check date validity
async isRoleValidForDate(userRoles: string[], checkDate: Date = new Date()): Promise<boolean> {
  const roleEntries = await this.roleManagementRepo.find({
    where: { role: In(userRoles) }
  });

  return roleEntries.some(entry => {
    const startDate = new Date(entry.start_date);
    const endDate = new Date(entry.end_date);
    return checkDate >= startDate && checkDate <= endDate;
  });
}



//   // Additional helper methods
//   async getAllUserRoles(id: number): Promise<RoleManagement[]> {
//     return await this.roleManagementRepo.find({ where: { id } });
//   }
//
//   async addUserRole(id: number, role: string, station: string, startDate?: string, endDate?: string): Promise<RoleManagement> {
//     const roleManagement = this.roleManagementRepo.create({
//       id,
//       role,
//       station,
//       start_date: startDate,
//       end_date: endDate
//     });
//
//     return await this.roleManagementRepo.save(roleManagement);
//   }
//
//   async removeUserRole(id: number, role: string, station?: string): Promise<void> {
//     const whereCondition: any = { id, role };
//     if (station) {
//       whereCondition.station = station;
//     }
//
//     await this.roleManagementRepo.delete(whereCondition);
//   }
}