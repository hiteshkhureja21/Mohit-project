import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-2xl'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full ${maxWidth} bg-surface-container-lowest rounded-lg border border-outline-variant shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-space-lg py-space-md border-b border-outline-variant/80 flex items-center justify-between bg-surface-container-low">
          <div>
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
              {title}
            </h3>
            {subtitle && (
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Close Dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-space-lg overflow-y-auto flex-1 font-body-md text-body-md">
          {children}
        </div>

        {footer && (
          <div className="px-space-lg py-space-md border-t border-outline-variant/80 bg-surface-container-low flex items-center justify-end gap-space-sm">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
