import React, { useState } from 'react';
import { useAppStore } from '../../store/AppContext';
import { DashboardType } from '../../types/workspace';
import { LayoutGrid, X, ArrowRight, Check } from 'lucide-react';

interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_MODULES = [
  { id: 'transformations', label: 'Transformations Engine', desc: 'Manage 6-stage transformation pipelines' },
  { id: 'reviews', label: 'Claim Verification & Reviews', desc: 'Human-in-the-loop claim checks & audit' },
  { id: 'documents', label: 'Source Library', desc: 'Institutional source document repository' },
  { id: 'activity', label: 'Audit & Activity Trail', desc: 'Tamper-evident verification records' },
  { id: 'deliveries', label: 'Communication Dispatch', desc: 'Channel delivery & stakeholder alerts' }
];

export const CreateDashboardModal: React.FC<CreateDashboardModalProps> = ({ isOpen, onClose }) => {
  const { createDashboard } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DashboardType>('operations');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'transformations',
    'reviews',
    'documents'
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleModule = (modId: string) => {
    setSelectedModules(prev =>
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createDashboard({
        name: name.trim(),
        description: description.trim() || 'Custom operational dashboard',
        type,
        modules: selectedModules.length > 0 ? selectedModules : ['transformations', 'reviews']
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-floating border border-stone-200 space-y-6 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-sans">
                Create New Dashboard
              </h3>
              <p className="text-xs text-stone-500 font-sans">
                Configure layout and active modules for this workspace
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 font-sans">
              Dashboard Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Verification Center"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 font-sans">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Short description of this dashboard view"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 font-sans">
              Dashboard Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as DashboardType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-colors bg-white"
            >
              <option value="operations">Operations (Transformations & Workflows)</option>
              <option value="verification">Verification (Evidence & Claim Review)</option>
              <option value="communications">Communications (Output Studio & Dispatch)</option>
              <option value="research">Research & Analysis</option>
              <option value="custom">Custom Configuration</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 font-sans">
              Active Modules
            </label>
            <div className="space-y-2 mt-1">
              {AVAILABLE_MODULES.map(mod => {
                const isSelected = selectedModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/50 text-stone-900'
                        : 'border-stone-200 bg-stone-50/50 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold font-sans">{mod.label}</div>
                      <div className="text-[11px] text-stone-500 font-sans">{mod.desc}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 font-sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold font-sans shadow-sm transition-all disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating...' : 'Create Dashboard'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
