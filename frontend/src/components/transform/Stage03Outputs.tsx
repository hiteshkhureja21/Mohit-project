import React, { useState } from 'react';
import { useAppStore } from '../../store/AppContext';
import { transformationService } from '../../services/transformationService';
import {
  FileText,
  ShieldAlert,
  Presentation,
  Share2,
  Twitter,
  Image,
  Layers,
  Video,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

interface Stage03OutputsProps {
  onBack: () => void;
  onGenerate: () => void;
}

interface OutputOption {
  id: string;
  name: string;
  desc: string;
  icon: any;
  defaultChecked: boolean;
}

export const Stage03Outputs: React.FC<Stage03OutputsProps> = ({ onBack, onGenerate }) => {
  const { transformation, generateDeliverables } = useAppStore();
  const [selectedOutputs, setSelectedOutputs] = useState<Record<string, boolean>>({
    summary: true,
    advisory: true,
    presentation: true,
    comm_package: true,
    linkedin: false,
    xpost: false,
    infographic: false,
    video: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const outputOptions: OutputOption[] = [
    {
      id: 'summary',
      name: 'Executive Summary',
      desc: 'A concise decision-ready overview.',
      icon: FileText,
      defaultChecked: true
    },
    {
      id: 'advisory',
      name: 'Advisory',
      desc: 'A structured professional advisory.',
      icon: ShieldAlert,
      defaultChecked: true
    },
    {
      id: 'presentation',
      name: 'Presentation',
      desc: 'Slide-ready briefing content.',
      icon: Presentation,
      defaultChecked: true
    },
    {
      id: 'comm_package',
      name: 'Communication Package',
      desc: 'Public safety bulletin and stakeholder notices.',
      icon: Layers,
      defaultChecked: true
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Post',
      desc: 'Professional public communication.',
      icon: Share2,
      defaultChecked: false
    },
    {
      id: 'xpost',
      name: 'X Post',
      desc: 'Short platform-optimized message.',
      icon: Twitter,
      defaultChecked: false
    },
    {
      id: 'infographic',
      name: 'Infographic',
      desc: 'Key messages and visual structure.',
      icon: Image,
      defaultChecked: false
    },
    {
      id: 'video',
      name: 'Video Package',
      desc: 'Script, storyboard, narration and scene guidance.',
      icon: Video,
      defaultChecked: false
    }
  ];

  const toggleOutput = (id: string) => {
    setSelectedOutputs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectedCount = Object.values(selectedOutputs).filter(Boolean).length;

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    try {
      if (transformation.id) {
        await transformationService.updateOutputConfig(transformation.id, {
          options: selectedOutputs
        });
      }
      await generateDeliverables();
    } catch (err) {
      console.warn('Backend output config update note:', err);
    } finally {
      setIsGenerating(false);
      onGenerate();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-sans">
          What should SourceFlow create?
        </h2>
        <p className="text-sm text-stone-600 max-w-md mx-auto">
          Choose the communication artefacts to synthesize from your source. Each output is grounded and verifiable against the original evidence.
        </p>
      </div>

      {/* Visual Output Picker Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {outputOptions.map(opt => {
          const isSelected = !!selectedOutputs[opt.id];
          const Icon = opt.icon;

          return (
            <div
              key={opt.id}
              onClick={() => toggleOutput(opt.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'border-teal-700 bg-teal-50/40 shadow-subtle ring-1 ring-teal-700'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-teal-700 text-white' : 'bg-stone-100 text-stone-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                  isSelected ? 'bg-teal-700 border-teal-700 text-white' : 'border-stone-300 bg-white'
                }`}>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-stone-900 leading-snug">
                  {opt.name}
                </h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  {opt.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Bottom Summary & CTAs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
          <span className="font-semibold text-stone-900">
            {selectedCount} {selectedCount === 1 ? 'output' : 'outputs'} selected
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-stone-500">All outputs will maintain strict source grounding</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium transition-colors cursor-pointer"
          >
            Back
          </button>

          <button
            onClick={handleStartGeneration}
            disabled={selectedCount === 0 || isGenerating}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs hover:shadow-subtle cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Generate outputs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
