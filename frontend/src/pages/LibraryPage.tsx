import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import {
  Search,
  FileText,
  Filter,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  FileCheck
} from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const { transformation, unsupportedClaimsCount, navigate } = useAppStore();
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const libraryDocuments = [
    {
      id: transformation.id,
      name: transformation.source.name,
      type: transformation.source.type,
      size: transformation.source.size,
      pages: transformation.source.pages,
      lastTransformed: '10:42 AM Today',
      outputsCount: transformation.outputs.length,
      status: transformation.delivery.status === 'SENT'
        ? 'Delivered'
        : transformation.review.status === 'APPROVED'
        ? 'Approved'
        : unsupportedClaimsCount > 0
        ? 'Pending Review'
        : 'Completed',
      claimsCount: 23,
      isFlagged: unsupportedClaimsCount > 0
    },
    {
      id: 'DOC-2026-0089',
      name: 'Zero Trust Network Architecture Compliance Appraisal.pdf',
      type: 'PDF',
      size: '4.1 MB',
      pages: 34,
      lastTransformed: 'Yesterday',
      outputsCount: 3,
      status: 'Completed',
      claimsCount: 19,
      isFlagged: false
    },
    {
      id: 'DOC-2026-0042',
      name: 'Vendor Risk Assessment — Q2 Service Provider Review.docx',
      type: 'DOCX',
      size: '1.2 MB',
      pages: 14,
      lastTransformed: '3 days ago',
      outputsCount: 2,
      status: 'Pending Review',
      claimsCount: 12,
      isFlagged: true
    },
    {
      id: 'DOC-2025-0914',
      name: 'Critical Infrastructure Telemetry Incident Log.xlsx',
      type: 'XLSX',
      size: '8.4 MB',
      pages: 1,
      lastTransformed: '2 weeks ago',
      outputsCount: 4,
      status: 'Archived',
      claimsCount: 31,
      isFlagged: false
    }
  ];

  const filteredDocs = libraryDocuments.filter(doc => {
    if (activeTab === 'completed' && doc.status !== 'Completed' && doc.status !== 'Delivered' && doc.status !== 'Approved') return false;
    if (activeTab === 'pending' && doc.status !== 'Pending Review') return false;
    if (activeTab === 'archived' && doc.status !== 'Archived') return false;
    if (searchQuery.trim() && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex-1 bg-[#FAFAF9] overflow-y-auto px-6 py-8 lg:px-12 lg:py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-sans">
              Library
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Repository of ingested sources, grounded deliverables, and verification history.
            </p>
          </div>

          <button
            onClick={() => navigate('#/transform')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white text-xs font-semibold transition-all shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>New Transformation</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0E7F87] shadow-subtle"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 text-xs shadow-subtle">
            {(['all', 'completed', 'pending', 'archived'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors font-medium cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#0A2540] text-white font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'pending' ? 'Pending Review' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Hybrid Card / List View */}
        <div className="space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-xs text-stone-500">
              No documents found matching your filter criteria.
            </div>
          ) : (
            filteredDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => navigate('#/transform')}
                className="bg-white hover:bg-stone-50/70 border border-stone-200 rounded-2xl p-4 sm:p-5 transition-all shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-teal-50 group-hover:text-teal-700 text-stone-600 flex items-center justify-center flex-shrink-0 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-stone-900 group-hover:text-teal-900 transition-colors truncate">
                      {doc.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-1 font-mono text-[11px]">
                      <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">{doc.type}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>{doc.pages} pages</span>
                      <span>•</span>
                      <span className="text-stone-600">{doc.outputsCount} outputs</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs self-stretch sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                  <div className="text-right sm:text-right">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      doc.status === 'Pending Review'
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {doc.status === 'Pending Review' ? (
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      )}
                      {doc.status}
                    </span>
                    <span className="block text-[10px] text-stone-400 font-mono mt-0.5">
                      {doc.lastTransformed}
                    </span>
                  </div>

                  <span className="text-teal-700 group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
