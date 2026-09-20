export type EnterpriseRole = 'Owner' | 'Admin' | 'Reviewer' | 'Editor' | 'Viewer';

// Backward-compatible alias for existing views
export type UserRole = EnterpriseRole | 'Content Operator' | 'Approver';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  department: string;
  avatar: string;
  sessionToken?: string;
  isDemo?: boolean;
  lastActive: string;
  created_at?: string;
}

export interface RolePermissions {
  canUpload: boolean;
  canConfigure: boolean;
  canGenerate: boolean;
  canVerifyClaims: boolean;
  canApprove: boolean;
  canDeliver: boolean;
  canViewAudit: boolean;
  canManageUsers: boolean;
}

export const getRolePermissions = (role: UserRole): RolePermissions => {
  switch (role) {
    case 'Owner':
    case 'Admin':
      return {
        canUpload: true,
        canConfigure: true,
        canGenerate: true,
        canVerifyClaims: true,
        canApprove: true,
        canDeliver: true,
        canViewAudit: true,
        canManageUsers: true
      };
    case 'Reviewer':
    case 'Approver':
      return {
        canUpload: true,
        canConfigure: true,
        canGenerate: true,
        canVerifyClaims: true,
        canApprove: true,
        canDeliver: false,
        canViewAudit: true,
        canManageUsers: false
      };
    case 'Editor':
    case 'Content Operator':
      return {
        canUpload: true,
        canConfigure: true,
        canGenerate: true,
        canVerifyClaims: true,
        canApprove: false,
        canDeliver: true,
        canViewAudit: true,
        canManageUsers: false
      };
    case 'Viewer':
    default:
      return {
        canUpload: false,
        canConfigure: false,
        canGenerate: false,
        canVerifyClaims: false,
        canApprove: false,
        canDeliver: false,
        canViewAudit: true,
        canManageUsers: false
      };
  }
};

