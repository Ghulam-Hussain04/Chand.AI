// Role-Based Access Control (RBAC) Utilities

export type Role = 'user' | 'researcher' | 'admin';

export interface Permission {
  create_folder: boolean;
  delete_folder: boolean;
  update_folder: boolean;
  upload_file: boolean;
  delete_file: boolean;
  share_file: boolean;
  manage_users: boolean;
  view_admin_panel: boolean;
  access_chat: boolean;
}

// Role-based permissions matrix
const PERMISSIONS: Record<Role, Permission> = {
  user: {
    create_folder: false,
    delete_folder: false,
    update_folder: false,
    upload_file: false,
    delete_file: false,
    share_file: false,
    manage_users: false,
    view_admin_panel: false,
    access_chat: true,
  },
  researcher: {
    create_folder: true,
    delete_folder: true,
    update_folder: true,
    upload_file: true,
    delete_file: true,
    share_file: true,
    manage_users: false,
    view_admin_panel: false,
    access_chat: true,
  },
  admin: {
    create_folder: true,
    delete_folder: true,
    update_folder: true,
    upload_file: true,
    delete_file: true,
    share_file: true,
    manage_users: true,
    view_admin_panel: true,
    access_chat: true,
  },
};

/**
 * Get permissions for a specific role
 */
export function getRolePermissions(role: Role): Permission {
  return PERMISSIONS[role];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: keyof Permission): boolean {
  return PERMISSIONS[role][permission];
}

/**
 * Check if a user can perform an action
 */
export function canPerformAction(role: Role, action: string): boolean {
  const permissions = getRolePermissions(role);
  return (permissions as any)[action] === true;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: Role): string {
  const names: Record<Role, string> = {
    user: 'User',
    researcher: 'Researcher',
    admin: 'Administrator',
  };
  return names[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    user: 'Can only access chat and view shared files',
    researcher: 'Can create projects, upload files, and chat',
    admin: 'Full access including user management',
  };
  return descriptions[role];
}

/**
 * Get available roles for dropdown
 */
export function getAvailableRoles(): { value: Role; label: string; description: string }[] {
  return [
    {
      value: 'user',
      label: getRoleDisplayName('user'),
      description: getRoleDescription('user'),
    },
    {
      value: 'researcher',
      label: getRoleDisplayName('researcher'),
      description: getRoleDescription('researcher'),
    },
    {
      value: 'admin',
      label: getRoleDisplayName('admin'),
      description: getRoleDescription('admin'),
    },
  ];
}

/**
 * Check if role is admin
 */
export function isAdmin(role: Role | undefined): boolean {
  return role === 'admin';
}

/**
 * Check if role is researcher
 */
export function isResearcher(role: Role | undefined): boolean {
  return role === 'researcher';
}

/**
 * Check if role has elevated permissions
 */
export function hasElevatedPermissions(role: Role | undefined): boolean {
  return role === 'admin' || role === 'researcher';
}
