/**
 * Granular permissions system.
 *
 * Permission areas that can be toggled per role:
 *   billing, integrations, column_headings, questions, rules
 *
 * Each area supports two levels: 'view' and 'edit'.
 *
 * Built-in roles map to fixed permission sets. The 'custom' role
 * stores its permission set in the user's config column.
 */

export type PermissionArea =
  | 'billing'
  | 'integrations'
  | 'column_headings'
  | 'questions'
  | 'rules';

export type PermissionLevel = 'none' | 'view' | 'edit';

export type PermissionMap = Record<PermissionArea, PermissionLevel>;

export type UserRole =
  | 'super_admin'
  | 'company_admin'
  | 'admin'
  | 'billing'
  | 'editor'
  | 'user'
  | 'custom';

export const PERMISSION_AREAS: { key: PermissionArea; label: string }[] = [
  { key: 'billing', label: 'Billing' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'column_headings', label: 'Output Headings' },
  { key: 'questions', label: 'Import Questions' },
  { key: 'rules', label: 'Rules' },
];

/**
 * Role hierarchy:
 *   super_admin  — FreshSegments internal. Full access to all accounts.
 *   company_admin — Assigned by super admin. Cross-account view/login.
 *   admin        — Standard company admin. Own account only.
 */
export const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to their own account' },
  { value: 'billing', label: 'Billing', description: 'Billing access only' },
  { value: 'user', label: 'Standard User', description: 'Upload only, no admin features' },
  { value: 'editor', label: 'Editor', description: 'Everything except integrations and billing' },
  { value: 'custom', label: 'Custom', description: 'Custom permission set' },
  { value: 'company_admin', label: 'Company Admin', description: 'Cross-account view and management' },
  { value: 'super_admin', label: 'Super Admin', description: 'FreshSegments internal — full system access' },
];

const EDIT_ALL: PermissionMap = {
  billing: 'edit',
  integrations: 'edit',
  column_headings: 'edit',
  questions: 'edit',
  rules: 'edit',
};

const NONE_ALL: PermissionMap = {
  billing: 'none',
  integrations: 'none',
  column_headings: 'none',
  questions: 'none',
  rules: 'none',
};

/** Permissions granted by each built-in role */
const ROLE_PERMISSIONS: Record<Exclude<UserRole, 'custom'>, PermissionMap> = {
  super_admin: EDIT_ALL,
  company_admin: EDIT_ALL,
  admin: EDIT_ALL,
  billing: {
    ...NONE_ALL,
    billing: 'edit',
  },
  editor: {
    billing: 'none',
    integrations: 'none',
    column_headings: 'edit',
    questions: 'edit',
    rules: 'edit',
  },
  user: NONE_ALL,
};

/**
 * Resolve the effective permissions for a user.
 * For built-in roles the permissions are static.
 * For 'custom', the permissions come from the user's config column.
 */
export function getPermissions(
  role: UserRole,
  customPermissions?: Partial<PermissionMap>
): PermissionMap {
  if (role === 'custom' && customPermissions) {
    return {
      billing: customPermissions.billing || 'none',
      integrations: customPermissions.integrations || 'none',
      column_headings: customPermissions.column_headings || 'none',
      questions: customPermissions.questions || 'none',
      rules: customPermissions.rules || 'none',
    };
  }

  if (role === 'custom') {
    return NONE_ALL;
  }

  return ROLE_PERMISSIONS[role] || NONE_ALL;
}

/** Check if a user can view a specific area */
export function canView(permissions: PermissionMap, area: PermissionArea): boolean {
  return permissions[area] === 'view' || permissions[area] === 'edit';
}

/** Check if a user can edit a specific area */
export function canEdit(permissions: PermissionMap, area: PermissionArea): boolean {
  return permissions[area] === 'edit';
}

/** Get default custom permissions (all none) */
export function defaultCustomPermissions(): PermissionMap {
  return { ...NONE_ALL };
}
