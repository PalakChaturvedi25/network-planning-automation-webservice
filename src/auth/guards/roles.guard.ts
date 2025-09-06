import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { PERMISSIONS_KEY, RESOURCE_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class DynamicRolesGuard implements CanActivate {
  private readonly logger = new Logger(DynamicRolesGuard.name);

  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if specific permissions are required
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check if resource access is required
    const requiredResource = this.reflector.getAllAndOverride<string>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions or resource specified, check if any valid role exists
    if (!requiredPermissions && !requiredResource) {
      this.logger.log('No specific permissions required, checking for any valid role');
      return await this.checkAnyValidRole(context);
    }

    const request = context.switchToHttp().getRequest();
    const user = await this.extractUserFromRequest(request);

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    this.logger.log(`User authenticated: ${user.userId || user.id}`);

    try {
      const userPermissions = await this.authService.getUserPermissions(user.roles);

      if (!userPermissions || !userPermissions.roles || userPermissions.roles.length === 0) {
        throw new ForbiddenException('No valid roles assigned to user');
      }

      // Check date validity
      const isDateValid = await this.authService.isRoleValidForDate(user.roles);
      if (!isDateValid) {
        throw new ForbiddenException('Role access period has expired or not yet started');
      }

      // Permission-based check
      if (requiredPermissions) {
        const hasPermission = await this.checkPermissions(requiredPermissions, userPermissions);
        if (!hasPermission) {
          throw new ForbiddenException(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`);
        }
      }

      // Resource-based check
      if (requiredResource) {
        const hasResourceAccess = await this.checkResourceAccess(requiredResource, userPermissions);
        if (!hasResourceAccess) {
          throw new ForbiddenException(`No access to resource: ${requiredResource}`);
        }
      }

      // Add user permissions to request
      request.userPermissions = userPermissions;
      request.user = user;

      this.logger.log('Access granted');
      return true;

    } catch (error) {
      this.logger.error(`Error in role validation: ${error.message}`);

      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }

      throw new ForbiddenException('Unable to verify permissions');
    }
  }

  private async checkAnyValidRole(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = await this.extractUserFromRequest(request);

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const userPermissions = await this.authService.getUserPermissions(user.roles);

      if (!userPermissions || !userPermissions.roles || userPermissions.roles.length === 0) {
        throw new ForbiddenException('No valid roles assigned to user');
      }

      // Check date validity
      const isDateValid = await this.authService.isRoleValidForDate(user.roles);
      if (!isDateValid) {
        throw new ForbiddenException('Role access period has expired or not yet started');
      }

      // Add user permissions to request
      request.userPermissions = userPermissions;
      request.user = user;

      this.logger.log(`Access granted for user with roles: ${userPermissions.roles.join(', ')}`);
      return true;

    } catch (error) {
      this.logger.error(`Error in role validation: ${error.message}`);
      throw error;
    }
  }

  private async checkPermissions(requiredPermissions: string[], userPermissions: any): Promise<boolean> {
    return requiredPermissions.some(permission => {
      switch (permission) {
        case 'download':
          return userPermissions.permissions.download_allowed;
        case 'revise':
          return userPermissions.permissions.revision_change_allowed;
        case 'nominate':
          return userPermissions.permissions.nominate_members_allowed;
        default:
          return false;
      }
    });
  }

  private async checkResourceAccess(resource: string, userPermissions: any): Promise<boolean> {
    switch (resource) {
      case 'flights':
        // Any role with valid permissions can access flights
        return userPermissions.roles.length > 0;
      case 'admin':
        // Only admin roles can access admin resources
        return userPermissions.roles.some(role =>
          role.includes('admin') || role === 'nps_admin'
        );
      default:
        return true;
    }
  }

  private async extractUserFromRequest(request: any) {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        this.logger.warn('No authorization token provided');
        return null;
      }

      const user = await this.authService.validateToken(token);

      if (!user) {
        this.logger.warn('Token validation failed');
        return null;
      }

      if (typeof user.roles === 'string') {
        user.roles = [user.roles];
      }

      return user;
    } catch (error) {
      this.logger.error(`Token extraction failed: ${error.message}`);
      return null;
    }
  }
}