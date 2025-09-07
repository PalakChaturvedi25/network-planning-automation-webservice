import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { CreateRolePermissionDto, UpdateRolePermissionDto, RolePermissionQueryDto } from './dto/role-permissions.dto';
import { RolePermission, CreateRolePermissionResponse, UpdateRolePermissionResponse, DeleteRolePermissionResponse } from './interfaces/role-permissions.interface';

@Injectable()
export class RolePermissionsService {
  private readonly logger = new Logger(RolePermissionsService.name);

  constructor(private readonly databaseService: AppConfigService) {}

  async createRolePermission(createDto: CreateRolePermissionDto): Promise<CreateRolePermissionResponse> {
    try {
      this.logger.log('Creating new role permission entry');

      // Check if role-station combination already exists
      const existingEntry = await this.databaseService.query(
        'SELECT * FROM role_management WHERE role = ? AND station = ?',
        [createDto.role, createDto.station]
      );

      if (existingEntry.length > 0) {
        throw new HttpException(
          'Role-Station combination already exists',
          HttpStatus.CONFLICT
        );
      }

      // Validate date range
      const startDate = new Date(createDto.start_date);
      const endDate = new Date(createDto.end_date);

      if (startDate >= endDate) {
        throw new HttpException(
          'Start date must be before end date',
          HttpStatus.BAD_REQUEST
        );
      }

      // Insert new entry
      const insertQuery = `
        INSERT INTO role_management
        (role, station, download_allowed, start_date, end_date, revision_change_allowed, nominate_members_allowed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await this.databaseService.query(insertQuery, [
        createDto.role,
        createDto.station,
        createDto.download_allowed,
        createDto.start_date,
        createDto.end_date,
        createDto.revision_change_allowed,
        createDto.nominate_members_allowed
      ]);

      // Fetch the created entry
      const createdEntry = await this.databaseService.query(
        'SELECT * FROM role_management WHERE id = ?',
        [result.insertId]
      );

      this.logger.log(`Successfully created role permission with ID: ${result.insertId}`);

      return {
        success: true,
        message: 'Role permission created successfully',
        data: createdEntry[0]
      };

    } catch (error) {
      this.logger.error('Error creating role permission:', error.message);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to create role permission',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllRolePermissions(queryDto?: RolePermissionQueryDto): Promise<RolePermission[]> {
    try {
      this.logger.log('Fetching role permissions');

      let query = 'SELECT * FROM role_management WHERE 1=1';
      const params: any[] = [];

      // Add filters based on query parameters
      if (queryDto?.role) {
        query += ' AND role = ?';
        params.push(queryDto.role);
      }

      if (queryDto?.station) {
        query += ' AND station = ?';
        params.push(queryDto.station);
      }

      if (queryDto?.download_allowed) {
        query += ' AND download_allowed = ?';
        params.push(queryDto.download_allowed);
      }

      if (queryDto?.revision_change_allowed) {
        query += ' AND revision_change_allowed = ?';
        params.push(queryDto.revision_change_allowed);
      }

      if (queryDto?.nominate_members_allowed) {
        query += ' AND nominate_members_allowed = ?';
        params.push(queryDto.nominate_members_allowed);
      }

      query += ' ORDER BY id DESC';

      const result = await this.databaseService.query(query, params);

      this.logger.log(`Retrieved ${result.length} role permission entries`);
      return result;

    } catch (error) {
      this.logger.error('Error fetching role permissions:', error.message);
      throw new HttpException(
        'Failed to fetch role permissions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getRolePermissionById(id: number): Promise<RolePermission> {
    try {
      this.logger.log(`Fetching role permission with ID: ${id}`);

      const result = await this.databaseService.query(
        'SELECT * FROM role_management WHERE id = ?',
        [id]
      );

      if (result.length === 0) {
        throw new HttpException(
          'Role permission not found',
          HttpStatus.NOT_FOUND
        );
      }

      return result[0];

    } catch (error) {
      this.logger.error(`Error fetching role permission ${id}:`, error.message);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to fetch role permission',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateRolePermission(id: number, updateDto: UpdateRolePermissionDto): Promise<UpdateRolePermissionResponse> {
    try {
      this.logger.log(`Updating role permission with ID: ${id}`);

      // Check if entry exists
      const existingEntry = await this.getRolePermissionById(id);

      // Check if role-station combination already exists (if role or station is being updated)
      if (updateDto.role || updateDto.station) {
        const roleToCheck = updateDto.role || existingEntry.role;
        const stationToCheck = updateDto.station || existingEntry.station;

        const duplicateCheck = await this.databaseService.query(
          'SELECT * FROM role_management WHERE role = ? AND station = ? AND id != ?',
          [roleToCheck, stationToCheck, id]
        );

        if (duplicateCheck.length > 0) {
          throw new HttpException(
            'Role-Station combination already exists',
            HttpStatus.CONFLICT
          );
        }
      }

      // Validate date range if dates are being updated
      if (updateDto.start_date || updateDto.end_date) {
        const startDate = new Date(updateDto.start_date || existingEntry.start_date);
        const endDate = new Date(updateDto.end_date || existingEntry.end_date);

        if (startDate >= endDate) {
          throw new HttpException(
            'Start date must be before end date',
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      Object.keys(updateDto).forEach(key => {
        if (updateDto[key] !== undefined) {
          updateFields.push(`${key} = ?`);
          updateValues.push(updateDto[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new HttpException(
          'No fields provided for update',
          HttpStatus.BAD_REQUEST
        );
      }

      updateValues.push(id);

      const updateQuery = `UPDATE role_management SET ${updateFields.join(', ')} WHERE id = ?`;

      await this.databaseService.query(updateQuery, updateValues);

      // Fetch updated entry
      const updatedEntry = await this.getRolePermissionById(id);

      this.logger.log(`Successfully updated role permission with ID: ${id}`);

      return {
        success: true,
        message: 'Role permission updated successfully',
        data: updatedEntry
      };

    } catch (error) {
      this.logger.error(`Error updating role permission ${id}:`, error.message);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to update role permission',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deleteRolePermission(id: number): Promise<DeleteRolePermissionResponse> {
    try {
      this.logger.log(`Deleting role permission with ID: ${id}`);

      // Check if entry exists
      await this.getRolePermissionById(id);

      // Delete the entry
      const result = await this.databaseService.query(
        'DELETE FROM role_management WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        throw new HttpException(
          'Failed to delete role permission',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      this.logger.log(`Successfully deleted role permission with ID: ${id}`);

      return {
        success: true,
        message: 'Role permission deleted successfully'
      };

    } catch (error) {
      this.logger.error(`Error deleting role permission ${id}:`, error.message);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to delete role permission',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async bulkDeleteRolePermissions(ids: number[]): Promise<DeleteRolePermissionResponse> {
    try {
      this.logger.log(`Bulk deleting role permissions with IDs: ${ids.join(', ')}`);

      if (ids.length === 0) {
        throw new HttpException(
          'No IDs provided for deletion',
          HttpStatus.BAD_REQUEST
        );
      }

      const placeholders = ids.map(() => '?').join(',');
      const deleteQuery = `DELETE FROM role_management WHERE id IN (${placeholders})`;

      const result = await this.databaseService.query(deleteQuery, ids);

      this.logger.log(`Successfully deleted ${result.affectedRows} role permission entries`);

      return {
        success: true,
        message: `Successfully deleted ${result.affectedRows} role permission entries`
      };

    } catch (error) {
      this.logger.error('Error bulk deleting role permissions:', error.message);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to bulk delete role permissions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}