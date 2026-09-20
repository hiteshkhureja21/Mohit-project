import React, { useState } from 'react';
import { useAppStore } from '../../store/AppContext';
import { GroundingClaim } from '../../types/claim';
import { primaryMockDocument } from '../../data/mockDocuments';
import {
  CheckCircle2,
  AlertTriangle,
  Flag,
  Edit3,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  FileText,
  Search,
  ExternalLink,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface Stage05ReviewProps {
  onBack: () => void;
  onContinue: () => void;
}

export const Stage05Review: React.FC<Stage05ReviewProps> = ({ onBack, onContinue }) => {
  const {
    transformation,
    selectedClaim,
    setSelectedClaim,
    supportedClaimsCount,
    unsupportedClaimsCount,
    resolvedClaimsCount,
    isApprovalBlocked,
    updateClaimStatus,
    editClaimPhrasing,
    deleteClaim
  } = useAppStore();

  const [filterFlaggedOnly, setFilterFlaggedOnly] = useState(false);
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);

  const claims = transformation.claims;
  const filteredClaims = filterFlaggedOnly
    ? claims.filter(c => c.status === 'NEEDS_REVIEW' || c.status === 'UNSUPPORTED')
    : claims;

  // Active claim defaults to first flagged or currently selected
  const activeClaim = selectedClaim || claims.find(c => c.status === 'NEEDS_REVIEW') || claims[0];

  // Document page for evidence viewer
  const doc = primaryMockDocument;
  const activePageNum = activeClaim?.pageNumber || 19;
  const activePageData = doc.pages.find(p => p.pageNumber === activePageNum) || doc.pages[0];

  const handleSelectClaim = (claim: GroundingClaim) => {
    setSelectedClaim(claim);
    setEditingClaimId(null);
  };

  const handleStartEdit = (claim: GroundingClaim) => {
    setEditingClaimId(claim.id);
    setEditInputText(
      claim.id === 'CLM-005'
        ? 'Forensic memory dumps revealed that the adversary leveraged modified commodity Cobalt Strike beacons and PowerShell scripts alongside a single chained CVE-2025-4127 privilege escalation flaw.'
        : claim.id === 'CLM-017'
        ? 'Adversary dwell time inside the isolated honeypot perimeter was measured at exactly 4 hours and 18 minutes before automated heuristic rules triggered quarantine.'
        : claim.anchorPassage || claim.claimText
    );
  };

  const handleSaveEdit = async (claimId: string) => {
    await editClaimPhrasing(claimId, editInputText);
    setEditingClaimId(null);
  };

  const handleReplaceWithExact = async (claim: GroundingClaim) => {
    const exactText = claim.anchorPassage || claim.claimText;
    await editClaimPhrasing(claim.id, exactText, 'Replaced with exact phrasing from source page.');
  };

  const handleAccept = async (claimId: string) => {
    await updateClaimStatus(claimId, 'SUPPORTED', 'Accepted and verified against source telemetry.');
  };

  const handleRemove = async (claimId: string) => {
    await deleteClaim(claimId);
  };

  return (
    <div className="space-y-6 py-2">
      
      {/* Top Fact-Checking Header Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              Claim Verification & Grounding
            </h2>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              {claims.length} claims checked
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs mt-1.5 font-medium">
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{supportedClaimsCount} supported</span>
            </span>
            <span className="text-stone-300">•</span>
            <span className={`flex items-center gap-1 ${
              unsupportedClaimsCount > 0 ? 'text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200' : 'text-stone-500'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{unsupportedClaimsCount} require review</span>
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-stone-500">
              {resolvedClaimsCount} resolved issues
            </span>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setFilterFlaggedOnly(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer ${
              filterFlaggedOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-subtle'
                : 'bg-white hover:bg-stone-50 text-stone-600 border-stone-200'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${filterFlaggedOnly ? 'text-amber-700' : 'text-stone-400'}`} />
            <span>Show flagged only ({unsupportedClaimsCount})</span>
          </button>
        </div>
      </div>

      {/* Modern 2-Column Verification Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-[620px] min-h-0">
        
        {/* Left Column: Claims List */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 overflow-y-auto space-y-3 shadow-subtle">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            <span>Derived Claims ({filteredClaims.length})</span>
            <span className="normal-case font-normal text-stone-500">
              Click claim to view linked evidence
            </span>
          </div>

          {filteredClaims.map(claim => {
            const isSelected = activeClaim?.id === claim.id;
            const isFlagged = claim.status === 'NEEDS_REVIEW' || claim.status === 'UNSUPPORTED';
            const isEditing = editingClaimId === claim.id;

            return (
              <div
                key={claim.id}
                onClick={() => handleSelectClaim(claim)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? isFlagged
                      ? 'border-amber-400 bg-amber-50/40 shadow-subtle ring-1 ring-amber-400'
                      : 'border-teal-700 bg-teal-50/40 shadow-subtle ring-1 ring-teal-700'
                    : isFlagged
                    ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      Claim #{claim.claimIndex}
                    </span>
                    <span className="text-xs font-semibold text-stone-600">
                      {claim.sectionTitle}
                    </span>
                  </div>

                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isFlagged
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {isFlagged ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Requires Review
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Supported
                      </>
                    )}
                  </span>
                </div>

                {/* Claim Statement */}
                {isEditing ? (
                  <div className="space-y-2 pt-1" onClick={e => e.stopPropagation()}>
                    <textarea
                      value={editInputText}
                      onChange={e => setEditInputText(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:border-teal-700"
                      rows={3}
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setEditingClaimId(null)}
                        className="px-2.5 py-1 rounded text-xs text-stone-500 hover:text-stone-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(claim.id)}
                        className="px-3 py-1 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                      >
                        Save Phrasing
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-stone-900 leading-relaxed">
                    "{claim.claimText}"
                  </p>
                )}

                {/* Citation & Flag Details */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100/80">
                  <span className="font-mono">
                    Source: Page {claim.pageNumber} • {claim.sourceReference || 'Primary Telemetry'}
                  </span>
                  <span className="font-mono font-medium text-teal-800">
                    Confidence: {claim.confidenceScore}%
                  </span>
                </div>

                {/* Flagged Issue Warning Box */}
                {isFlagged && claim.flagReason && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
                    <p className="font-semibold text-[11px] text-amber-900">
                      Discrepancy detected:
                    </p>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      {claim.flagReason}
                    </p>
                  </div>
                )}

                {/* Action Buttons for this Claim */}
                <div className="flex flex-wrap items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                  {isFlagged ? (
                    <>
                      <button
                        onClick={() => handleReplaceWithExact(claim)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-subtle"
                      >
                        Replace with Exact Phrasing
                      </button>

                      <button
                        onClick={() => handleAccept(claim.id)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Accept
                      </button>

                      <button
                        onClick={() => handleStartEdit(claim)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(claim)}
                        className="px-2 py-0.5 rounded text-[11px] text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                      >
                        Edit Phrasing
                      </button>
                      <button
                        onClick={() => handleRemove(claim.id)}
                        className="px-2 py-0.5 rounded text-[11px] text-stone-400 hover:text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Source Document & Grounding Viewer */}
        <div className="bg-white border border-stone-200 rounded-2xl flex flex-col min-h-0 shadow-subtle overflow-hidden">
          
          {/* Viewer Control Bar */}
          <div className="h-11 px-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-teal-700 flex-shrink-0" />
              <span className="font-semibold text-stone-800 truncate max-w-[220px]">
                {transformation.source.name}
              </span>
              <span className="font-mono text-[10px] text-stone-400 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                PDF
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-stone-700 bg-white px-2 py-0.5 rounded border border-stone-200">
                Page {activePageNum} of {transformation.source.pages || 20}
              </span>

              <div className="flex items-center gap-1 border border-stone-200 rounded-md bg-white p-0.5">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(80, prev - 10))}
                  className="p-1 hover:bg-stone-100 rounded text-stone-500"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
                  className="p-1 hover:bg-stone-100 rounded text-stone-500"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Document Content Canvas with Yellow Highlight */}
          <div className="flex-1 p-6 overflow-y-auto bg-stone-50/40 text-xs space-y-4">
            
            <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-subtle space-y-4 font-serif text-stone-800 leading-relaxed max-w-xl mx-auto">
              
              {/* Document Page Header */}
              <div className="border-b border-stone-100 pb-3 font-sans text-stone-400 text-[10px] flex justify-between uppercase tracking-wider">
                <span>{activePageData.sectionHeader}</span>
                <span>Page {activePageNum}</span>
              </div>

              {/* Page Body Paragraphs */}
              {(activePageData.content ? activePageData.content.split('\n\n') : []).map((pText: string, pIdx: number) => {
                const isAnchorParagraph = activeClaim && pText.includes(activeClaim.anchorPassage || '');

                if (isAnchorParagraph && activeClaim?.anchorPassage) {
                  const parts = pText.split(activeClaim.anchorPassage);
                  return (
                    <p key={pIdx} className="text-stone-800 text-[13px] leading-relaxed">
                      {parts[0]}
                      <mark className="bg-amber-200/90 text-stone-900 px-1 py-0.5 rounded font-sans font-medium border-b-2 border-amber-500">
                        {activeClaim.anchorPassage}
                      </mark>
                      {parts[1]}
                    </p>
                  );
                }

                return (
                  <p key={pIdx} className="text-stone-700 text-[13px] leading-relaxed">
                    {pText}
                  </p>
                );
              })}

              {/* Exact Evidence Card */}
              {activeClaim && (
                <div className="mt-4 p-3 rounded-xl bg-teal-50/70 border border-teal-200 font-sans text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-teal-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                      <span>Exact Grounding Passage for Claim #{activeClaim.claimIndex}</span>
                    </span>
                    <span className="font-mono text-[10px] text-teal-700">Page {activeClaim.pageNumber}</span>
                  </div>
                  <p className="text-stone-800 text-xs italic bg-white p-2.5 rounded-lg border border-teal-100 leading-relaxed">
                    "{activeClaim.anchorPassage}"
                  </p>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* Bottom Status Banner & Navigation */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {unsupportedClaimsCount === 0 ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All 23 claims verified • Ready for human approval</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{unsupportedClaimsCount} claims require resolution before approval gate unlocks</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium transition-colors cursor-pointer"
          >
            Back
          </button>

          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white text-xs font-semibold transition-all shadow-xs hover:shadow-subtle cursor-pointer"
          >
            <span>Proceed to Output Delivery</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
