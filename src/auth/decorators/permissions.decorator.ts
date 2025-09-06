import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Alternative: Create a decorator for resource-based access
export const RESOURCE_KEY = 'resource';
export const RequireResource = (resource: string) =>
  SetMetadata(RESOURCE_KEY, resource);