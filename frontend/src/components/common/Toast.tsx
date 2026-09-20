import React from 'react';
import { useAppStore } from '../../store/AppContext';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useAppStore();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-12 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-primary text-on-primary rounded-lg border border-slate-700 shadow-xl font-body-sm text-body-sm font-medium">
        <ShieldCheck className="w-4 h-4 text-tertiary-fixed flex-shrink-0" />
        <span>{toastMessage}</span>
      </div>
    </div>
  );
};
