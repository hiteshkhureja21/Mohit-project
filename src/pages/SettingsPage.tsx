import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import {
  Settings,
  Shield,
  Bell,
  Sliders,
  Moon,
  Sun,
  Laptop,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { userSession, resetTransformationDemo, showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<'workspace' | 'verification' | 'notifications' | 'appearance'>('workspace');

  const [workspaceName, setWorkspaceName] = useState('SourceFlow Operations');
  const [autoVerifyClaims, setAutoVerifyClaims] = useState(true);
  const [strictProvenance, setStrictProvenance] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSave = () => {
    showToast('Settings saved successfully ✓');
  };

  return (
    <div className="flex-1 bg-[#FAFAF9] overflow-y-auto px-6 py-8 lg:px-12 lg:py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-sans">
            Settings
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Configure workspace preferences, verification thresholds, and notification routing.
          </p>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs shadow-subtle max-w-fit">
          {[
            { id: 'workspace', label: 'Workspace' },
            { id: 'verification', label: 'Verification' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'appearance', label: 'Appearance' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0A2540] text-white font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-subtle space-y-6">
          
          {/* Workspace Tab */}
          {activeTab === 'workspace' && (
            <div className="space-y-5 text-xs animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Workspace Details</h3>
                <p className="text-stone-500 text-[11px]">Primary identification for transformation jobs and audit records.</p>
              </div>

              <div className="space-y-3 max-w-md">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Workspace Name</label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={e => setWorkspaceName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">Active Operator</label>
                  <input
                    type="text"
                    value={`${userSession.name} (${userSession.role})`}
                    disabled
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-100 text-stone-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">Security Level</label>
                  <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-mono text-[11px]">
                    INSTITUTIONAL_RESTRICTED // AES-256 AT REST
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-stone-800">Reset Demo State</h4>
                  <p className="text-stone-500 text-[11px]">Restore the default 23 claims and unapproved state for presentation.</p>
                </div>
                <button
                  onClick={resetTransformationDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo</span>
                </button>
              </div>
            </div>
          )}

          {/* Verification Tab */}
          {activeTab === 'verification' && (
            <div className="space-y-5 text-xs animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Verification & Grounding Policy</h3>
                <p className="text-stone-500 text-[11px]">Rules governing automated factual checks and human sign-off gates.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer">
                  <div>
                    <span className="font-semibold text-stone-800 block">Strict Provenance Enforcement</span>
                    <span className="text-stone-500 text-[11px]">Every generated claim must anchor to an explicit page passage in the source document.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={strictProvenance}
                    onChange={e => setStrictProvenance(e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer">
                  <div>
                    <span className="font-semibold text-stone-800 block">Automated Cross-Referencing</span>
                    <span className="text-stone-500 text-[11px]">Run automated heuristics across claims immediately upon deliverable generation.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoVerifyClaims}
                    onChange={e => setAutoVerifyClaims(e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-5 text-xs animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Notification Preferences</h3>
                <p className="text-stone-500 text-[11px]">Alert dispatching for reviews, approvals, and deliveries.</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer">
                  <div>
                    <span className="font-semibold text-stone-800 block">Email Alerts on Flagged Discrepancies</span>
                    <span className="text-stone-500 text-[11px]">Notify review officer when a claim is marked NEEDS_REVIEW.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={e => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-5 text-xs animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Workspace Appearance</h3>
                <p className="text-stone-500 text-[11px]">Curated modern palette designed for long focus sessions.</p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-sm">
                <div className="p-3 rounded-xl border-2 border-teal-700 bg-teal-50/40 text-center space-y-1">
                  <Sun className="w-5 h-5 mx-auto text-teal-800" />
                  <span className="font-bold text-stone-900 block">Warm Light</span>
                  <span className="text-[10px] text-teal-700 font-semibold">Active</span>
                </div>

                <div className="p-3 rounded-xl border border-stone-200 bg-stone-50 text-center space-y-1 opacity-60">
                  <Moon className="w-5 h-5 mx-auto text-stone-500" />
                  <span className="font-medium text-stone-700 block">Dark Slate</span>
                  <span className="text-[10px] text-stone-400">Available</span>
                </div>

                <div className="p-3 rounded-xl border border-stone-200 bg-stone-50 text-center space-y-1 opacity-60">
                  <Laptop className="w-5 h-5 mx-auto text-stone-500" />
                  <span className="font-medium text-stone-700 block">System Sync</span>
                  <span className="text-[10px] text-stone-400">Available</span>
                </div>
              </div>
            </div>
          )}

          {/* Save Action */}
          <div className="pt-4 border-t border-stone-100 flex justify-end">
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-all shadow-subtle cursor-pointer"
            >
              Save Changes
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
