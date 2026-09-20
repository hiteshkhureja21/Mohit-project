import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  FileCheck,
  Filter
} from 'lucide-react';

export const ReviewsPage: React.FC = () => {
  const { transformation, unsupportedClaimsCount, navigate } = useAppStore();
  const [activeTab, setActiveTab] = useState<'needs_review' | 'in_progress' | 'approved' | 'all'>('needs_review');

  const reviewItems = [
    {
      id: 'REV-01',
      document: transformation.source.name,
      issue: `${unsupportedClaimsCount} claims require verification (Page 14 & Page 19)`,
      status: unsupportedClaimsCount > 0 ? 'Needs Review' : 'Approved',
      priority: 'High',
      updated: '10:42 AM Today',
      targetStage: 5
    },
    {
      id: 'REV-02',
      document: 'Vendor Risk Assessment — Q2 Service Provider Review.docx',
      issue: '1 unsupported claim regarding third-party SLA compliance',
      status: 'Needs Review',
      priority: 'Medium',
      updated: 'Yesterday',
      targetStage: 5
    },
    {
      id: 'REV-03',
      document: 'Zero Trust Network Architecture Compliance Appraisal.pdf',
      issue: 'All 19 claims grounded and signed off',
      status: 'Approved',
      priority: 'Low',
      updated: '2 days ago',
      targetStage: 6
    },
    {
      id: 'REV-04',
      document: 'Cloud Infrastructure Penetration Telemetry.pdf',
      issue: 'Automated claim cross-referencing underway',
      status: 'In Progress',
      priority: 'Medium',
      updated: '3 days ago',
      targetStage: 4
    }
  ];

  const filteredItems = reviewItems.filter(item => {
    if (activeTab === 'needs_review' && item.status !== 'Needs Review') return false;
    if (activeTab === 'in_progress' && item.status !== 'In Progress') return false;
    if (activeTab === 'approved' && item.status !== 'Approved') return false;
    return true;
  });

  return (
    <div className="flex-1 bg-[#FAFAF9] overflow-y-auto px-6 py-8 lg:px-12 lg:py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-sans">
              Reviews
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Actionable human verification inbox for factual assertions and evidence alignment.
            </p>
          </div>

          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
            {unsupportedClaimsCount} items awaiting your action
          </span>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs shadow-subtle max-w-fit">
          {[
            { id: 'needs_review', label: 'Needs Review' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'approved', label: 'Approved' },
            { id: 'all', label: 'All' }
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

        {/* Review Inbox Rows */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-xs text-stone-500">
              No review items in this status category.
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => navigate('#/transform')}
                className="bg-white hover:bg-stone-50/80 border border-stone-200 rounded-2xl p-4 sm:p-5 transition-all shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-900 group-hover:text-teal-900 transition-colors truncate">
                      {item.document}
                    </h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.priority === 'High'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : item.priority === 'Medium'
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : 'bg-stone-100 text-stone-600'
                    }`}>
                      {item.priority} Priority
                    </span>
                  </div>

                  <p className="text-xs text-stone-600">
                    {item.issue}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono pt-0.5">
                    <span>Status: {item.status}</span>
                    <span>•</span>
                    <span>Updated {item.updated}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    onClick={() => navigate('#/transform')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-all shadow-subtle group-hover:shadow-card cursor-pointer"
                  >
                    <span>Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
