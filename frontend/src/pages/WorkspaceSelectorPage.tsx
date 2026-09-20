import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { SourceFlowLogo } from '../components/common/SourceFlowLogo';
import { CreateWorkspaceModal } from '../components/workspace/CreateWorkspaceModal';
import {
  ArrowRight,
  Plus,
  ShieldCheck,
  FileText,
  Users,
  LogOut,
  ChevronRight,
  FolderOpen
} from 'lucide-react';

export const WorkspaceSelectorPage: React.FC = () => {
  const {
    workspaces,
    selectWorkspace,
    currentUser,
    logout
  } = useAppStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans text-stone-900 antialiased selection:bg-teal-500 selection:text-white">
      {/* Top Navigation */}
      <header className="bg-white border-b border-stone-200/90 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <SourceFlowLogo variant="mark" size="md" />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-stone-50 border border-stone-200">
              <div className="w-5 h-5 rounded-full bg-[#0A2540] text-white text-[10px] font-bold flex items-center justify-center">
                {currentUser?.avatar || 'KV'}
              </div>
              <span className="text-xs font-medium text-stone-700">
                {currentUser?.name || 'Operator'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Sign out of SourceFlow"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0E7F87]" />
              <span>Verified Session</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-sans">
              Select an Active Workspace
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
              Choose an organizational workspace to manage document transformations, verification pipelines, and audience-tailored releases.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workspace</span>
          </button>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workspaces.map((ws) => {
            const dashboardCount = ws.dashboards?.length || 0;

            return (
              <div
                key={ws.id}
                onClick={() => selectWorkspace(ws.id)}
                className="bg-white border border-stone-200/90 hover:border-stone-300 rounded-2xl p-6 transition-all shadow-subtle hover:shadow-card flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-50 group-hover:bg-teal-50 border border-stone-200/60 flex items-center justify-center text-[#0E7F87] transition-colors">
                      <FolderOpen className="w-5 h-5" />
                    </div>

                    <span className="text-[11px] font-medium text-stone-500 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200/60">
                      {dashboardCount} {dashboardCount === 1 ? 'Dashboard' : 'Dashboards'}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-stone-900 group-hover:text-[#0E7F87] transition-colors font-sans">
                    {ws.name}
                  </h3>

                  <p className="text-xs text-stone-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {ws.description || 'Organizational transformation domain.'}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-stone-400 font-medium">
                    <Users className="w-3.5 h-3.5" />
                    <span>Active Domain</span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-semibold text-[#0E7F87] group-hover:translate-x-0.5 transition-transform">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}

          {/* Quick Create Card */}
          <div
            onClick={() => setIsCreateModalOpen(true)}
            className="border-2 border-dashed border-stone-200 hover:border-[#0E7F87]/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center group cursor-pointer bg-white/60 hover:bg-teal-50/20 transition-all min-h-[220px]"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-teal-100 text-stone-400 group-hover:text-[#0E7F87] flex items-center justify-center transition-colors mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-stone-800 group-hover:text-stone-900 font-sans">
              Create New Workspace
            </h4>
            <p className="text-xs text-stone-500 max-w-xs mt-1">
              Add a dedicated domain for distinct departments, research projects, or compliance audits.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/70 bg-white py-4 px-6 text-center text-xs text-stone-400 font-sans">
        SourceFlow &bull; Secure Institutional Session
      </footer>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
