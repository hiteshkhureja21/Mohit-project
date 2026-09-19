import React from 'react';
import { useAppStore } from '../store/AppContext';
import {
  Sparkles,
  ArrowRight,
  FileText,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  FileCheck
} from 'lucide-react';

import { SourceFlowLogo } from '../components/common/SourceFlowLogo';

export const OverviewPage: React.FC = () => {
  const { transformation, unsupportedClaimsCount, navigate } = useAppStore();

  return (
    <div className="flex-1 bg-[#F9FAFB] overflow-y-auto px-6 py-8 lg:px-12 lg:py-10 select-none">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Minimal Hero Section — Only SourceFlow Icon Mark */}
        <section className="py-6 sm:py-8 flex flex-col items-center text-center space-y-6">
          <div className="flex items-center justify-center p-3 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
            <SourceFlowLogo variant="mark" size="xl" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('#/transform')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white font-medium text-xs sm:text-sm transition-all shadow-xs hover:shadow-subtle cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-300" />
              <span>Start transformation</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => navigate('#/library')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 font-medium text-xs sm:text-sm transition-colors border border-stone-200 cursor-pointer"
            >
              <FolderKanban className="w-4 h-4 text-stone-400" />
              <span>Browse repository</span>
            </button>
          </div>
        </section>

        {/* Needs Your Attention Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              Needs your attention
            </h2>
            {unsupportedClaimsCount > 0 && (
              <span className="text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                {unsupportedClaimsCount} items awaiting verification
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {unsupportedClaimsCount > 0 ? (
              <div 
                onClick={() => navigate('#/transform')}
                className="bg-white hover:border-amber-300 border border-amber-200/90 rounded-2xl p-4 sm:p-5 transition-all shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 group-hover:text-amber-950 transition-colors font-sans">
                      {transformation.source.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                      <span className="text-amber-800 font-semibold font-mono">
                        {unsupportedClaimsCount} claims require verification
                      </span>
                      <span>•</span>
                      <span>Page 14 & Page 19 telemetry discrepancies</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-amber-600 text-white group-hover:bg-amber-700 transition-colors">
                    Review Claims &rarr;
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-subtle flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900 font-sans">
                      All active claims verified
                    </h3>
                    <p className="text-xs text-stone-500">
                      23 of 23 assertions anchored to source document with zero discrepancies.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('#/transform')}
                  className="text-xs font-semibold text-[#0E7F87] hover:underline px-2 py-1"
                >
                  View Workspace
                </button>
              </div>
            )}

            {/* Secondary Queue Attention Item */}
            <div 
              onClick={() => navigate('#/reviews')}
              className="bg-white hover:bg-stone-50 border border-stone-200/90 rounded-2xl p-4 sm:p-5 transition-all shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-stone-50 text-stone-600 border border-stone-200/60 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5 text-stone-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900 group-hover:text-[#0A2540] transition-colors font-sans">
                    Vendor Risk Assessment — Q2 Compliance
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                    <span className="text-stone-600 font-medium font-mono">
                      1 claim requires verification
                    </span>
                    <span>•</span>
                    <span>Secondary Queue</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 group-hover:border-stone-300 transition-colors">
                  Inspect &rarr;
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Work Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              Recent transformations
            </h2>
            <button
              type="button"
              onClick={() => navigate('#/library')}
              className="text-xs text-[#0E7F87] hover:text-[#0A2540] font-semibold"
            >
              View all (4)
            </button>
          </div>

          <div className="space-y-2">
            
            {/* Primary Project Row */}
            <div
              onClick={() => navigate('#/transform')}
              className="bg-white hover:bg-stone-50 border border-stone-200/90 rounded-2xl p-4 sm:p-5 transition-all shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-stone-50 text-[#0E7F87] border border-stone-200/60 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-stone-900 group-hover:text-[#0E7F87] transition-colors truncate font-sans">
                    {transformation.source.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                    <span>{transformation.outputs.length} outputs</span>
                    <span>•</span>
                    <span>{transformation.profiles.length} audiences</span>
                    <span>•</span>
                    <span className={`font-medium ${
                      transformation.delivery.status === 'SENT'
                        ? 'text-emerald-700'
                        : transformation.review.status === 'APPROVED'
                        ? 'text-[#0E7F87]'
                        : unsupportedClaimsCount > 0
                        ? 'text-amber-800'
                        : 'text-stone-600'
                    }`}>
                      {transformation.delivery.status === 'SENT'
                        ? 'Delivered'
                        : transformation.review.status === 'APPROVED'
                        ? 'Approved'
                        : unsupportedClaimsCount > 0
                        ? 'Verification in progress'
                        : 'Ready for approval'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-stone-400 self-end sm:self-center flex-shrink-0">
                <span className="font-mono text-stone-400">10:42 AM</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#0E7F87] group-hover:translate-x-0.5 transition-transform">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Additional Project Row */}
            <div
              onClick={() => navigate('#/library')}
              className="bg-white hover:bg-stone-50 border border-stone-200/90 rounded-2xl p-4 sm:p-5 transition-all shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-stone-50 text-stone-600 border border-stone-200/60 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-stone-900 group-hover:text-stone-950 transition-colors truncate font-sans">
                    Zero Trust Network Architecture Compliance Appraisal.pdf
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                    <span>2 outputs</span>
                    <span>•</span>
                    <span>2 audiences</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">Completed</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-stone-400 self-end sm:self-center flex-shrink-0">
                <span className="font-mono text-stone-400">Yesterday</span>
                <span className="inline-flex items-center gap-1 font-medium text-stone-600 group-hover:translate-x-0.5 transition-transform">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
};
