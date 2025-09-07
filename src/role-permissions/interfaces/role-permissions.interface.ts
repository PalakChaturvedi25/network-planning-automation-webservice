export interface RolePermission {
  id: number;
  role: string;
  station: string;
  download_allowed: string;
  start_date: string;
  end_date: string;
  revision_change_allowed: string;
  nominate_members_allowed: string;
}

export interface CreateRolePermissionResponse {
  success: boolean;
  message: string;
  data?: RolePermission;
}

export interface UpdateRolePermissionResponse {
  success: boolean;
  message: string;
  data?: RolePermission;
}

export interface DeleteRolePermissionResponse {
  success: boolean;
  message: string;
}