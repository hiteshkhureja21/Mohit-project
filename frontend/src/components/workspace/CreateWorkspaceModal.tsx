import React, { useState } from 'react';
import { useAppStore } from '../../store/AppContext';
import { WorkspaceType } from '../../types/workspace';
import { FolderPlus, X, ArrowRight } from 'lucide-react';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose }) => {
  const { createWorkspace } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WorkspaceType>('operations');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    await createWorkspace({
      name: name.trim(),
      description: description.trim() || 'Custom organizational workspace',
      type
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-floating border border-stone-200 space-y-6 animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-sans">
                Create a workspace
              </h3>
              <p className="text-xs text-stone-500">
                Organize transformations, documents, and audience teams.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-stone-700 font-medium mb-1.5 font-sans">
              Workspace name
            </label>
            <input
              type="text"
              placeholder="e.g. Compliance & Auditing Workspace"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-teal-700 shadow-subtle"
            />
          </div>

          <div>
            <label className="block text-stone-700 font-medium mb-1.5 font-sans">
              Workspace description
            </label>
            <textarea
              placeholder="Brief description of the workspace purpose and team focus..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-teal-700 shadow-subtle"
            />
          </div>

          <div>
            <label className="block text-stone-700 font-medium mb-1.5 font-sans">
              Workspace type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as WorkspaceType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-xs focus:outline-none focus:border-teal-700 shadow-subtle"
            >
              <option value="operations">Content Operations</option>
              <option value="communications">Communications</option>
              <option value="research">Research</option>
              <option value="compliance">Compliance</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-all shadow-subtle hover:shadow-card cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating...' : 'Create workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
