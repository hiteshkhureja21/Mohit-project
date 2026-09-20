import React, { useState } from 'react';
import { useAppStore } from '../../store/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Settings, Shield, Sliders, Server, Check, RotateCcw } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { isSettingsModalOpen, setIsSettingsModalOpen, resetTransformationDemo, showToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<'general' | 'profiles' | 'api'>('general');
  const [threshold, setThreshold] = useState<number>(90);
  const [orgName, setOrgName] = useState<string>('State Critical Infrastructure Authority');

  if (!isSettingsModalOpen) return null;

  const handleSave = () => {
    showToast('Platform settings saved successfully ✓');
    setIsSettingsModalOpen(false);
  };

  return (
    <Modal
      isOpen={isSettingsModalOpen}
      onClose={() => setIsSettingsModalOpen(false)}
      title="Platform Settings & Configuration"
      subtitle="SourceFlow Institutional Governance & Transformation Policies"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetTransformationDemo();
              setIsSettingsModalOpen(false);
            }}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Demo State
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              icon={<Check className="w-3.5 h-3.5" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-outline-variant/60 gap-4 text-xs font-semibold">
          {[
            { id: 'general', label: 'Organization & Governance', icon: <Shield className="w-3.5 h-3.5" /> },
            { id: 'profiles', label: 'Communication Profiles', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'api', label: 'API & Service Layer', icon: <Server className="w-3.5 h-3.5" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 pb-2.5 transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-secondary text-secondary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: General */}
        {activeTab === 'general' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-on-surface-variant font-medium mb-1">
                Organization / Department Name:
              </label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2 text-on-surface focus:outline-none focus:border-secondary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-on-surface-variant font-medium">
                  Source Grounding Confidence Threshold:
                </label>
                <span className="font-mono font-bold text-on-surface">{threshold}%</span>
              </div>
              <input
                type="range"
                min={70}
                max={99}
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                className="w-full accent-secondary cursor-pointer"
              />
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Claims with source grounding match below {threshold}% will be flagged for mandatory human review.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/60 space-y-1">
              <span className="font-bold text-on-surface text-xs block">Governance Gating Policy:</span>
              <p className="text-on-surface-variant text-[11px] leading-relaxed">
                Strict multi-stage gating is enforced. AI-generated outputs cannot be dispatched without explicit human sign-off and 0 unresolved unsupported claims.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Profiles */}
        {activeTab === 'profiles' && (
          <div className="space-y-2 text-xs">
            <p className="text-on-surface-variant text-[11px]">
              Configured default communication profile templates:
            </p>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60">
                <p className="font-bold text-on-surface">Executive Leadership</p>
                <p className="text-on-surface-variant text-[11px]">Format: Executive Brief • Tone: Formal & Concise</p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60">
                <p className="font-bold text-on-surface">Cybersecurity Department</p>
                <p className="text-on-surface-variant text-[11px]">Format: Technical Advisory • Tone: Technical & Deep Telemetry</p>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60">
                <p className="font-bold text-on-surface">Media & Communications</p>
                <p className="text-on-surface-variant text-[11px]">Format: Communication Package • Tone: Plain Language & Public Safety</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: API */}
        {activeTab === 'api' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/60 space-y-1">
              <span className="font-bold text-on-surface text-xs block">Service Layer Architecture:</span>
              <p className="text-on-surface-variant text-[11px] leading-relaxed">
                All business logic is isolated in <code className="font-mono text-secondary">src/services/</code>. Ready for connection to real backend REST / GraphQL APIs.
              </p>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-on-surface-variant bg-surface-container-lowest p-2.5 rounded border border-outline-variant/60">
              <p>documentService.uploadDocument() $\rightarrow$ POST /api/v1/documents</p>
              <p>generationService.generateDeliverables() $\rightarrow$ POST /api/v1/transform</p>
              <p>verificationService.verifyClaims() $\rightarrow$ GET /api/v1/claims</p>
              <p>deliveryService.sendCommunication() $\rightarrow$ POST /api/v1/dispatch</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
