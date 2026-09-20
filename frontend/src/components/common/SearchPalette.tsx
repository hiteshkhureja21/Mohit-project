import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/AppContext';
import { mockDocumentsList } from '../../data/demoData';
import { GroundingClaim } from '../../types/claim';
import { Search, X, FileText, ArrowRight } from 'lucide-react';

export const SearchPalette: React.FC = () => {
  const {
    isSearchPaletteOpen,
    setIsSearchPaletteOpen,
    transformation,
    navigate,
    setSelectedClaim
  } = useAppStore();

  const [query, setQuery] = useState('');

  // Keyboard shortcut listener (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchPaletteOpen(!isSearchPaletteOpen);
      }
      if (e.key === 'Escape' && isSearchPaletteOpen) {
        setIsSearchPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchPaletteOpen, setIsSearchPaletteOpen]);

  if (!isSearchPaletteOpen) return null;

  const filteredClaims = query.trim()
    ? transformation.claims.filter((c: GroundingClaim) =>
        c.claimText.toLowerCase().includes(query.toLowerCase()) ||
        c.id.toLowerCase().includes(query.toLowerCase()) ||
        (c.sourceReference || '').toLowerCase().includes(query.toLowerCase()) ||
        c.sectionTitle.toLowerCase().includes(query.toLowerCase())
      )
    : transformation.claims.slice(0, 4);

  const filteredDocs = query.trim()
    ? mockDocumentsList.filter(j =>
        j.title.toLowerCase().includes(query.toLowerCase()) ||
        j.id.toLowerCase().includes(query.toLowerCase()) ||
        j.fileName.toLowerCase().includes(query.toLowerCase())
      )
    : mockDocumentsList;

  const handleSelectClaim = (claim: GroundingClaim) => {
    setSelectedClaim(claim);
    setIsSearchPaletteOpen(false);
    navigate('#/transform');
  };

  const handleSelectJob = (_doc: any) => {
    setIsSearchPaletteOpen(false);
    navigate('#/documents');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-primary/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-surface-container-lowest rounded-xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="p-4 border-b border-outline-variant flex items-center gap-3 bg-surface-container-low">
          <Search className="w-5 h-5 text-secondary flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search across 23 claims, documents, hashes, citations... (Esc to exit)"
            className="w-full bg-transparent font-body-md text-sm text-on-surface focus:outline-none placeholder:text-on-surface-variant"
          />
          <button
            onClick={() => setIsSearchPaletteOpen(false)}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs font-body-sm">
          
          {/* Claims Section */}
          <div className="space-y-1.5">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-bold px-2">
              Claims ({filteredClaims.length})
            </span>
            {filteredClaims.map((claim: GroundingClaim) => (
              <div
                key={claim.id}
                onClick={() => handleSelectClaim(claim)}
                className="p-2.5 rounded-lg hover:bg-surface-container-low border border-transparent hover:border-outline-variant/60 transition-colors cursor-pointer flex items-start justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-code-sm font-bold text-on-surface font-mono">
                      {claim.id}
                    </span>
                    <span className="font-code-sm text-[10px] text-on-surface-variant">
                      Page {claim.pageNumber} • {claim.sectionTitle}
                    </span>
                  </div>
                  <p className="text-on-surface text-xs line-clamp-1">
                    "{claim.claimText}"
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {claim.status === 'NEEDS_REVIEW' ? (
                    <span className="font-code-sm text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                      Needs Review
                    </span>
                  ) : (
                    <span className="font-code-sm text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                      Supported
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Documents Section */}
          <div className="space-y-1.5 pt-2 border-t border-outline-variant/40">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-bold px-2">
              Documents ({filteredDocs.length})
            </span>
            {filteredDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => handleSelectJob(doc)}
                className="p-2.5 rounded-lg hover:bg-surface-container-low border border-transparent hover:border-outline-variant/60 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-secondary flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-on-surface text-xs">{doc.title}</p>
                    <p className="font-code-sm text-[10px] text-on-surface-variant font-mono">
                      {doc.id} • {doc.fileType} • {doc.size}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-on-surface-variant" />
              </div>
            ))}
          </div>

        </div>

        {/* Search Footer */}
        <div className="px-4 py-2 border-t border-outline-variant/60 bg-surface-container-low flex items-center justify-between text-[11px] font-code-sm text-on-surface-variant">
          <span>Navigate with <kbd className="px-1 py-0.5 bg-surface-container rounded border font-mono">↑</kbd> <kbd className="px-1 py-0.5 bg-surface-container rounded border font-mono">↓</kbd></span>
          <span>Press <kbd className="px-1 py-0.5 bg-surface-container rounded border font-mono">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
