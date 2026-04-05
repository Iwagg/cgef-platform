import type { UserRole } from './types';

const ROLE_LEVELS: Record<UserRole, number> = {
  analyst: 1,
  manager: 2,
  ciso: 3,
  admin: 4,
};

export function hasRole(userRole: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

export function canCreateAssessment(role?: UserRole) { return hasRole(role, 'analyst'); }
export function canSubmitAssessment(role?: UserRole) { return hasRole(role, 'analyst'); }
export function canApproveAssessment(role?: UserRole) { return hasRole(role, 'manager'); }
export function canGenerateBoardPack(role?: UserRole) { return hasRole(role, 'manager'); }
export function canManageOrganization(role?: UserRole) { return hasRole(role, 'admin'); }
export function canManageUsers(role?: UserRole) { return hasRole(role, 'ciso'); }
export function canViewInvestorReport(role?: UserRole) { return hasRole(role, 'ciso'); }
export function canExportAuditLogs(role?: UserRole) { return hasRole(role, 'ciso'); }
export function canIngestFramework(role?: UserRole) { return hasRole(role, 'admin'); }
