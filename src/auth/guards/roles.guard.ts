import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = await this.extractUserFromRequest(request);

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get user roles and permissions from database
    const userPermissions = await this.authService.getUserPermissions(user.id);

    const hasRole = requiredRoles.some(role =>
      userPermissions.roles.includes(role)
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add user permissions to request for use in controllers/services
    request.userPermissions = userPermissions;

    return true;
  }

  private async extractUserFromRequest(request: any) {
    // Extract user from JWT token or session
    // This depends on your authentication implementation
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    return this.authService.validateToken(token);
  }
}