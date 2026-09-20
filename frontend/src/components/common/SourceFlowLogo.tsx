import React from 'react';

export interface SourceFlowLogoProps {
  variant?: 'mark' | 'horizontal' | 'full';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  onClick?: () => void;
}

export const SourceFlowLogo: React.FC<SourceFlowLogoProps> = ({
  variant = 'mark',
  size = 'md',
  className = '',
  onClick,
}) => {
  // Pure icon mark size mappings
  const markSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28',
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
    '2xl': 'text-3xl',
  };

  // Pure Mark variant: Renders ONLY the SourceFlow emblem (two document shapes connected by flowing teal ribbon)
  // No text, no tagline, pure clean icon.
  if (variant === 'mark') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center justify-center select-none ${markSizes[size]} ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
        title="SourceFlow"
      >
        <img
          src="/sourceflow_mark.png"
          alt="SourceFlow"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>
    );
  }

  // Full variant (if ever used)
  if (variant === 'full') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center justify-center select-none ${markSizes[size]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <img
          src="/sourceflow_mark.png"
          alt="SourceFlow"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>
    );
  }

  // Horizontal variant (Emblem + Wordmark)
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      <div className={`${markSizes[size]} flex-shrink-0 flex items-center justify-center`}>
        <img
          src="/sourceflow_mark.png"
          alt="SourceFlow"
          className="w-full h-full object-contain"
        />
      </div>

      <div className={`font-bold tracking-tight leading-none ${textSizes[size]}`}>
        <span className="text-[#0A2540]">Source</span>
        <span className="text-[#0E7F87]">Flow</span>
      </div>
    </div>
  );
};
