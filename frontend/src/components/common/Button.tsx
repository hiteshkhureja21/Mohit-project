import React, { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'chip' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none select-none disabled:opacity-50 disabled:pointer-events-none';
  
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-body-sm rounded gap-1.5',
    md: 'px-3.5 py-1.5 text-body-sm rounded gap-2',
    lg: 'px-4 py-2 text-body-md rounded-md gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-[#0A2540] text-white hover:bg-[#081D33] shadow-xs',
    secondary: 'bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-200',
    outline: 'border border-stone-200 hover:bg-stone-50 text-stone-700',
    destructive: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200',
    chip: 'bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-mono text-[11px]',
    ghost: 'text-stone-600 hover:text-stone-900 hover:bg-stone-50',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
