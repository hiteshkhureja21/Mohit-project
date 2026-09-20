import React, { ReactNode } from 'react';
import { ClaimStatus } from '../../types/claim';
import { JobStatus } from '../../types/pipeline';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck } from 'lucide-react';

interface BadgeProps {
  variant?: 'verified' | 'requires-review' | 'rejected' | 'human-approved' | 'hash' | 'status' | 'clearance';
  status?: ClaimStatus | JobStatus;
  children?: ReactNode;
  className?: string;
  icon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  status,
  children,
  className = '',
  icon = true
}) => {
  // Determine variant from status if not explicitly passed
  let resolvedVariant = variant;
  if (!resolvedVariant && status) {
    if (status === 'SUPPORTED' || status === 'RESOLVED' || status === 'EDITED' || status === 'EXPORTED' || status === 'READY_FOR_APPROVAL') {
      resolvedVariant = 'verified';
    } else if (status === 'HUMAN_APPROVED') {
      resolvedVariant = 'human-approved';
    } else if (status === 'NEEDS_REVIEW' || status === 'UNSUPPORTED') {
      resolvedVariant = 'requires-review';
    } else if (status === 'REJECTED') {
      resolvedVariant = 'rejected';
    } else {
      resolvedVariant = 'status';
    }
  }

  const baseStyle = 'inline-flex items-center gap-1 font-code-sm text-code-sm font-semibold rounded px-2 py-0.5 select-none';

  switch (resolvedVariant) {
    case 'verified':
      return (
        <span className={`${baseStyle} bg-emerald-100/80 text-emerald-800 border border-emerald-300/80 ${className}`}>
          {icon && <CheckCircle2 className="w-3 h-3 text-emerald-700 flex-shrink-0" />}
          <span>{children || 'SOURCE VERIFIED'}</span>
        </span>
      );
    case 'requires-review':
      return (
        <span className={`${baseStyle} bg-amber-100 text-amber-900 border border-amber-300 font-bold ${className}`}>
          {icon && <AlertTriangle className="w-3 h-3 text-amber-700 flex-shrink-0" />}
          <span>{children || 'REQUIRES REVIEW'}</span>
        </span>
      );
    case 'rejected':
      return (
        <span className={`${baseStyle} bg-error-container text-on-error-container border border-red-300 ${className}`}>
          {icon && <XCircle className="w-3 h-3 text-error flex-shrink-0" />}
          <span>{children || 'REJECTED'}</span>
        </span>
      );
    case 'human-approved':
      return (
        <span className={`${baseStyle} bg-primary text-on-primary border border-slate-700 ${className}`}>
          {icon && <ShieldCheck className="w-3 h-3 text-tertiary-fixed flex-shrink-0" />}
          <span>{children || 'HUMAN APPROVED'}</span>
        </span>
      );
    case 'hash':
      return (
        <span className={`${baseStyle} bg-surface-container font-mono text-on-surface-variant border border-outline-variant/60 select-all ${className}`}>
          {children}
        </span>
      );
    case 'clearance':
      return (
        <span className={`${baseStyle} bg-primary-container text-on-primary-fixed-variant border border-slate-700 ${className}`}>
          {children}
        </span>
      );
    default:
      return (
        <span className={`${baseStyle} bg-sky-100 text-sky-800 border border-sky-300 ${className}`}>
          {icon && <Clock className="w-3 h-3 text-sky-700 flex-shrink-0" />}
          <span>{children || status}</span>
        </span>
      );
  }
};
