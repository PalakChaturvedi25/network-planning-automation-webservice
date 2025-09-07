import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { RolePermissionsService } from './role-permissions.service';
import { CreateRolePermissionDto, UpdateRolePermissionDto, RolePermissionQueryDto } from './dto/role-permissions.dto';
import { DynamicRolesGuard } from '../auth/guards/roles.guard';


@Controller('role-permissions')
// @UseGuards(JwtAuthGuard)
export class RolePermissionsController {
  constructor(private readonly rolePermissionsService: RolePermissionsService) {}

  @Post()
  async createRolePermission(@Body() createDto: CreateRolePermissionDto) {
    return await this.rolePermissionsService.createRolePermission(createDto);
  }

  @Get()
  async getAllRolePermissions(@Query() queryDto: RolePermissionQueryDto) {
    return await this.rolePermissionsService.getAllRolePermissions(queryDto);
  }

  @Get(':id')
  async getRolePermissionById(@Param('id', ParseIntPipe) id: number) {
    return await this.rolePermissionsService.getRolePermissionById(id);
  }

  @Put(':id')
  async updateRolePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateRolePermissionDto
  ) {
    return await this.rolePermissionsService.updateRolePermission(id, updateDto);
  }

  @Delete(':id')
  async deleteRolePermission(@Param('id', ParseIntPipe) id: number) {
    return await this.rolePermissionsService.deleteRolePermission(id);
  }

  @Delete('bulk/delete')
  async bulkDeleteRolePermissions(@Body() body: { ids: number[] }) {
    return await this.rolePermissionsService.bulkDeleteRolePermissions(body.ids);
  }
}