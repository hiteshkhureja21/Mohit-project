import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/AppContext';
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  ArrowRight,
  FileText,
  Layers,
  ShieldCheck,
  Cpu
} from 'lucide-react';

interface Stage04GenerateProps {
  onComplete: () => void;
}

export const Stage04Generate: React.FC<Stage04GenerateProps> = ({ onComplete }) => {
  const { transformation } = useAppStore();
  const [completedMilestones, setCompletedMilestones] = useState<number>(0);

  const milestones = [
    { title: 'Source understood', desc: 'Ingested 20 pages, 2.8 MB threat intelligence report' },
    { title: 'Context extracted', desc: 'Identified 18 key entities and chronological breach timeline' },
    { title: 'Audience requirements mapped', desc: 'Synthesized tone profiles for Executive, Cyber, and Media' },
    { title: 'Important facts identified', desc: 'Isolated 23 verifiable assertions with page citations' },
    { title: 'Executive Summary generated', desc: 'One-page strategic briefing for leadership' },
    { title: 'Advisory generated', desc: 'Deep technical telemetry with remediation protocols' },
    { title: 'Presentation generated', desc: 'Slide-ready briefing artefacts synthesized' },
    { title: 'Verification engine running...', desc: 'Cross-referencing 23 claims against source passages' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCompletedMilestones(prev => {
        if (prev < milestones.length) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 420);

    return () => clearInterval(timer);
  }, [milestones.length]);

  const isAllDone = completedMilestones >= milestones.length;

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      
      {/* Central Visual Graphic: ONE SOURCE -> MULTIPLE AUDIENCE-AWARE OUTPUTS */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-subtle text-center space-y-6">
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          
          {/* Source Node */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shadow-subtle">
              <FileText className="w-8 h-8" />
            </div>
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                ONE SOURCE
              </span>
              <p className="text-xs text-stone-600 font-semibold max-w-[140px] truncate">
                {transformation.source.name}
              </p>
            </div>
          </div>

          {/* Flow Arrow with Animated Wave */}
          <div className="flex flex-col items-center space-y-1 text-stone-400">
            <span className="text-[10px] font-mono uppercase tracking-widest text-teal-600 font-bold">
              TRANSFORMING
            </span>
            <div className="w-24 h-0.5 bg-gradient-to-r from-teal-500 via-teal-700 to-teal-500 relative overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-white/60 animate-pulse"></div>
            </div>
            <span className="text-xs font-bold text-teal-700">↓</span>
          </div>

          {/* Multiple Outputs Node */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-teal-700 border border-teal-800 flex items-center justify-center text-white shadow-subtle">
              <Layers className="w-8 h-8" />
            </div>
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                MULTIPLE OUTPUTS
              </span>
              <p className="text-xs text-stone-600 font-semibold">
                Audience-Aware & Grounded
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Pipeline Milestones Checklist */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-700" />
            <span>Transformation Pipeline</span>
          </h3>
          <span className="text-xs font-mono font-medium text-stone-500">
            {Math.min(completedMilestones, milestones.length)} of {milestones.length} milestones
          </span>
        </div>

        <div className="space-y-3">
          {milestones.map((item, idx) => {
            const isDone = completedMilestones > idx;
            const isCurrent = completedMilestones === idx;

            return (
              <div
                key={item.title}
                className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                  isCurrent ? 'bg-teal-50/60 border border-teal-200' : 'bg-transparent'
                }`}
              >
                <div className="pt-0.5 flex-shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-stone-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-semibold ${
                      isDone ? 'text-stone-900' : isCurrent ? 'text-teal-950 font-bold' : 'text-stone-400'
                    }`}>
                      {item.title}
                    </h4>
                    {isDone && (
                      <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] ${
                    isDone || isCurrent ? 'text-stone-500' : 'text-stone-400'
                  }`}>
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA when generation is finished */}
        <div className="pt-4 border-t border-stone-100 flex justify-end">
          <button
            onClick={onComplete}
            disabled={!isAllDone}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-xs transition-all shadow-subtle ${
              isAllDone
                ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer hover:shadow-card'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <span>Proceed to Claim Verification</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
