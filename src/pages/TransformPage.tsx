import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Stage01Source } from '../components/transform/Stage01Source';
import { Stage02Audience } from '../components/transform/Stage02Audience';
import { Stage03Outputs } from '../components/transform/Stage03Outputs';
import { Stage04Generate } from '../components/transform/Stage04Generate';
import { Stage05Review } from '../components/transform/Stage05Review';
import { Stage06Deliver } from '../components/transform/Stage06Deliver';

export const TransformPage: React.FC = () => {
  const { unsupportedClaimsCount } = useAppStore();
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  const stages = [
    { num: 1, label: '01 Source' },
    { num: 2, label: '02 Audience' },
    { num: 3, label: '03 Outputs' },
    { num: 4, label: '04 Generate' },
    {
      num: 5,
      label: '05 Review',
      badge: unsupportedClaimsCount > 0 ? `${unsupportedClaimsCount} review` : '✓ 23'
    },
    { num: 6, label: '06 Deliver' }
  ];

  return (
    <div className="flex-1 bg-[#FAFAF9] overflow-y-auto px-4 py-8 lg:px-12 lg:py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Workspace Top Header & Minimal Horizontal Progress Ribbon */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-stone-900 tracking-tight font-sans">
              Transform
            </h1>
            <p className="text-xs text-stone-500 font-normal">
              Start with your source. We'll handle the rest.
            </p>
          </div>

          {/* Minimal 6-Stage Progress Indicator */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-2.5 sm:p-3 shadow-subtle max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              {stages.map((stage, idx) => {
                const isDone = currentStage > stage.num;
                const isCurrent = currentStage === stage.num;
                const isAccessible = currentStage >= stage.num || isDone;

                return (
                  <React.Fragment key={stage.num}>
                    <button
                      onClick={() => isAccessible && setCurrentStage(stage.num as any)}
                      disabled={!isAccessible}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
                        isCurrent
                          ? 'text-[#0A2540] font-bold'
                          : isDone
                          ? 'text-[#0E7F87] hover:text-[#0A2540] cursor-pointer'
                          : 'text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold transition-all ${
                          isCurrent
                            ? 'bg-[#0A2540] text-white shadow-xs'
                            : isDone
                            ? 'bg-teal-50 text-[#0E7F87] border border-teal-200'
                            : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {isDone ? '✓' : `0${stage.num}`}
                      </span>
                      <span className="hidden md:inline font-sans text-[11px]">
                        {stage.label.replace(/^\d+\s*/, '')}
                      </span>
                    </button>

                    {idx < stages.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 transition-all ${
                        currentStage > stage.num ? 'bg-[#0E7F87]/40' : 'bg-stone-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Current Stage Content */}
        <div className="animate-in fade-in duration-200">
          {currentStage === 1 && (
            <Stage01Source onContinue={() => setCurrentStage(2)} />
          )}

          {currentStage === 2 && (
            <Stage02Audience
              onBack={() => setCurrentStage(1)}
              onContinue={() => setCurrentStage(3)}
            />
          )}

          {currentStage === 3 && (
            <Stage03Outputs
              onBack={() => setCurrentStage(2)}
              onGenerate={() => setCurrentStage(4)}
            />
          )}

          {currentStage === 4 && (
            <Stage04Generate onComplete={() => setCurrentStage(5)} />
          )}

          {currentStage === 5 && (
            <Stage05Review
              onBack={() => setCurrentStage(3)}
              onContinue={() => setCurrentStage(6)}
            />
          )}

          {currentStage === 6 && (
            <Stage06Deliver onBack={() => setCurrentStage(5)} />
          )}
        </div>

      </div>
    </div>
  );
};
