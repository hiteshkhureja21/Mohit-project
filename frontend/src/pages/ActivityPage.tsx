import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { formatISTDate } from '../utils/date';
import { truncateHash } from '../utils/hash';
import {
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Shield,
  FileCheck,
  Send,
  Sparkles,
  Lock,
  Search,
  Filter
} from 'lucide-react';

export const ActivityPage: React.FC = () => {
  const { transformation } = useAppStore();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const auditEvents = [...transformation.audit].reverse();

  const toggleExpand = (id: string) => {
    setExpandedEventId(prev => (prev === id ? null : id));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'COMMUNICATION_DELIVERED':
        return <Send className="w-4 h-4 text-emerald-600" />;
      case 'REVIEWER_APPROVED':
        return <Lock className="w-4 h-4 text-teal-700" />;
      case 'CLAIM_EDITED':
      case 'CLAIM_RESOLVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'CLAIMS_VERIFIED':
        return <FileCheck className="w-4 h-4 text-teal-600" />;
      case 'TRANSFORMATION_GENERATED':
        return <Sparkles className="w-4 h-4 text-teal-700" />;
      case 'INTELLIGENCE_EXTRACTED':
      case 'DOCUMENT_UPLOADED':
      default:
        return <Clock className="w-4 h-4 text-stone-500" />;
    }
  };

  const getActionFriendlyTitle = (action: string) => {
    switch (action) {
      case 'COMMUNICATION_DELIVERED':
        return 'Communication delivered';
      case 'REVIEWER_APPROVED':
        return 'Outputs approved';
      case 'CLAIM_EDITED':
        return 'Claim phrasing updated';
      case 'CLAIM_RESOLVED':
        return 'Claim resolved & verified';
      case 'CLAIMS_VERIFIED':
        return 'Verification completed';
      case 'TRANSFORMATION_GENERATED':
        return 'Outputs generated';
      case 'INTELLIGENCE_EXTRACTED':
        return 'Intelligence extracted';
      case 'DOCUMENT_UPLOADED':
        return 'Source document ingested';
      default:
        return action.replace(/_/g, ' ').toLowerCase();
    }
  };

  const filteredEvents = auditEvents.filter(ev =>
    ev.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.actor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 bg-[#FAFAF9] overflow-y-auto px-6 py-8 lg:px-12 lg:py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-sans">
              Activity
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Chronological provenance timeline and cryptographic attestation record.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ledger Valid • {auditEvents.length} chained events</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search activity by actor, action, or keyword..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-teal-700 shadow-subtle"
          />
        </div>

        {/* Vertical Timeline */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
          {filteredEvents.map((item, index) => {
            const isExpanded = expandedEventId === item.id;
            const timeFormatted = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={item.id} className="relative group">
                
                {/* Timeline Dot Icon */}
                <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-teal-700 flex items-center justify-center text-[10px] shadow-subtle z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-700" />
                </div>

                {/* Event Card */}
                <div
                  onClick={() => toggleExpand(item.id)}
                  className={`bg-white border border-stone-200 rounded-2xl p-4 transition-all shadow-subtle cursor-pointer hover:border-stone-300 ${
                    isExpanded ? 'ring-1 ring-teal-700' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center flex-shrink-0">
                        {getActionIcon(item.action)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-stone-400 font-semibold">
                            {timeFormatted}
                          </span>
                          <span className="text-stone-300">•</span>
                          <h4 className="text-xs font-bold text-stone-900">
                            {getActionFriendlyTitle(item.action)}
                          </h4>
                        </div>

                        <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                          {item.details}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleExpand(item.id);
                      }}
                      className="text-stone-400 hover:text-stone-700 p-1 flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expandable Cryptographic Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-stone-100 space-y-2 text-xs font-mono text-stone-600 animate-in fade-in">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-stone-400">Actor / Role:</span>
                        <span className="text-stone-800 font-semibold">{item.actor} ({item.actorRole})</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-stone-400">Event Block ID:</span>
                        <span className="text-stone-700">{item.id}</span>
                      </div>
                      <div className="flex justify-between text-[11px] truncate">
                        <span className="text-stone-400">Current SHA-256:</span>
                        <span className="text-teal-800 font-bold truncate max-w-xs">{item.currentHash}</span>
                      </div>
                      <div className="flex justify-between text-[11px] truncate">
                        <span className="text-stone-400">Previous Block Hash:</span>
                        <span className="text-stone-500 truncate max-w-xs">{item.previousHash}</span>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
