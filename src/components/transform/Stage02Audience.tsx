import React, { useState } from 'react';
import { useAppStore } from '../../store/AppContext';
import {
  Users,
  Shield,
  Megaphone,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sliders,
  Globe,
  MessageSquare
} from 'lucide-react';

interface Stage02AudienceProps {
  onBack: () => void;
  onContinue: () => void;
}

export const Stage02Audience: React.FC<Stage02AudienceProps> = ({ onBack, onContinue }) => {
  const { transformation, toggleProfile } = useAppStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English (Standard)');
  const [selectedTone, setSelectedTone] = useState('Adaptive · Multi-Perspective');
  const [detailLevel, setDetailLevel] = useState('Audience-Optimized');

  const selectedProfiles = transformation.profiles.filter(p => p.isSelected);

  const profileIcons: Record<string, any> = {
    'prof-exec': Users,
    'prof-cyber': Shield,
    'prof-media': Megaphone
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-sans">
          Who is this for?
        </h2>
        <p className="text-sm text-stone-600 max-w-md mx-auto">
          Select the audience profiles for your deliverables. SourceFlow adapts phrasing, depth, and technical terminology automatically.
        </p>
      </div>

      {/* Selectable Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {transformation.profiles.map(profile => {
          const isSelected = profile.isSelected;
          const Icon = profileIcons[profile.id] || Users;

          return (
            <div
              key={profile.id}
              onClick={() => toggleProfile(profile.id)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'border-teal-700 bg-teal-50/40 shadow-subtle ring-1 ring-teal-700'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-teal-700 text-white shadow-subtle' : 'bg-stone-100 text-stone-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                    isSelected ? 'bg-teal-700 border-teal-700 text-white' : 'border-stone-300 bg-white'
                  }`}>
                    {isSelected && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {profile.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {profile.deliverableType}
                  </p>
                </div>

                {/* Profile Trait Pills */}
                <div className="space-y-1 pt-1">
                  {profile.id === 'prof-exec' && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200/80 text-stone-600">Formal</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200/80 text-stone-600">Concise</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200/80 text-stone-600">Decision focused</span>
                    </div>
                  )}
                  {profile.id === 'prof-cyber' && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200/80 text-stone-600">Technical</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200/80 text-stone-600">Detailed</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200/80 text-stone-600">Action oriented</span>
                    </div>
                  )}
                  {profile.id === 'prof-media' && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200/80 text-stone-600">Clear</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200/80 text-stone-600">Accessible</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/80 border border-stone-200/80 text-stone-600">Public facing</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 font-mono">
                {profile.defaultRecipients.length} default recipients
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Summary Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
          <span className="font-semibold text-stone-900">
            {selectedProfiles.length} {selectedProfiles.length === 1 ? 'audience' : 'audiences'} selected
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-stone-600">Tone: <span className="font-medium text-stone-900">{selectedTone}</span></span>
          <span className="text-stone-300">•</span>
          <span className="text-stone-600">Language: <span className="font-medium text-stone-900">{selectedLanguage}</span></span>
        </div>

        <button
          onClick={() => setShowAdvanced(prev => !prev)}
          className="text-stone-600 hover:text-stone-900 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
        >
          <Sliders className="w-3.5 h-3.5 text-stone-500" />
          <span>Advanced preferences</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Advanced Preferences Section */}
      {showAdvanced && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-subtle space-y-4 animate-in fade-in">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Global Transformation Preferences
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-stone-600 font-medium mb-1.5">Language</label>
              <select
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-teal-700"
              >
                <option>English (Standard)</option>
                <option>English (Technical)</option>
                <option>English (Plain Language)</option>
                <option>Hindi (National Adaptation)</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-600 font-medium mb-1.5">Tone Profile</label>
              <select
                value={selectedTone}
                onChange={e => setSelectedTone(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-teal-700"
              >
                <option>Adaptive · Multi-Perspective</option>
                <option>Strictly Formal</option>
                <option>Direct & Technical</option>
                <option>Public Safety & Advisory</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-600 font-medium mb-1.5">Detail Depth</label>
              <select
                value={detailLevel}
                onChange={e => setDetailLevel(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:border-teal-700"
              >
                <option>Audience-Optimized</option>
                <option>Exhaustive Telemetry</option>
                <option>Executive Brief (One Page)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-sm font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={onContinue}
          disabled={selectedProfiles.length === 0}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-subtle cursor-pointer disabled:opacity-50"
        >
          <span>Continue to Outputs</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
