import { IsString, IsDateString, IsOptional, IsIn, IsNumberString } from 'class-validator';

export class CreateRolePermissionDto {
  @IsString()
  role: string;

  @IsString()
  station: string;

  @IsIn(['0', '1'])
  download_allowed: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsIn(['0', '1'])
  revision_change_allowed: string;

  @IsIn(['0', '1'])
  nominate_members_allowed: string;
}

export class UpdateRolePermissionDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  station?: string;

  @IsOptional()
  @IsIn(['0', '1'])
  download_allowed?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsIn(['0', '1'])
  revision_change_allowed?: string;

  @IsOptional()
  @IsIn(['0', '1'])
  nominate_members_allowed?: string;
}

export class RolePermissionQueryDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  station?: string;

  @IsOptional()
  @IsIn(['0', '1'])
  download_allowed?: string;

  @IsOptional()
  @IsIn(['0', '1'])
  revision_change_allowed?: string;

  @IsOptional()
  @IsIn(['0', '1'])
  nominate_members_allowed?: string;
}