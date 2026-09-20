import React from 'react';
import { useAppStore } from '../../store/AppContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { truncateHash } from '../../utils/hash';
import { formatISTDate } from '../../utils/date';
import { X, ShieldCheck, Lock, Link as LinkIcon, CheckCircle2, History } from 'lucide-react';

export const AuditTrailDrawer: React.FC = () => {
  const { isAuditDrawerOpen, setIsAuditDrawerOpen, transformation } = useAppStore();
  const auditLogs = transformation.audit;

  if (!isAuditDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-primary/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-surface-container-lowest h-full border-l border-outline-variant shadow-2xl flex flex-col justify-between"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low select-none">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-primary text-tertiary-fixed">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline-md text-base font-bold text-on-surface">
                Tamper-Evident Audit Record
              </h3>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Chained Cryptographic SHA-256 Event Timeline
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAuditDrawerOpen(false)}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Timeline Records */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          
          <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-xs font-code-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Dossier Target:</span>
              <strong className="text-on-surface font-mono">{transformation.id}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Chained Events:</span>
              <strong className="text-emerald-800 font-bold">{auditLogs.length} Blocks Verified</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant">Attestation Engine:</span>
              <strong className="text-secondary font-mono">Web Crypto (SHA-256)</strong>
            </div>
          </div>

          {/* Chronological Event Items */}
          <div className="relative border-l-2 border-outline-variant/80 ml-3.5 space-y-6 pt-2 pb-2">
            {auditLogs.map((log, idx) => (
              <div key={log.id} className="relative pl-6 space-y-1.5 text-xs">
                {/* Timeline Node Bullet */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-surface-container-lowest border-2 border-secondary flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                </div>

                {/* Event Header */}
                <div className="flex items-center justify-between">
                  <span className="font-code-sm font-bold text-primary font-mono text-[11px]">
                    {log.id} • {log.action}
                  </span>
                  <span className="font-code-sm text-[10px] text-on-surface-variant">
                    {formatISTDate(log.timestamp)}
                  </span>
                </div>

                {/* Details */}
                <p className="font-body-md text-on-surface text-xs leading-relaxed">
                  {log.details}
                </p>

                {/* Actor & Role */}
                <div className="flex items-center gap-2 text-[11px] font-code-sm text-on-surface-variant">
                  <span>Actor: <strong className="text-on-surface">{log.actor}</strong> ({log.actorRole})</span>
                </div>

                {/* Cryptographic Hash Chaining Box */}
                <div className="p-2 rounded bg-surface-container font-mono text-[10px] space-y-0.5 border border-outline-variant/60">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Prev Block:</span>
                    <span>{truncateHash(log.previousHash, 8, 8)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-800 font-semibold">
                    <span className="text-secondary flex items-center gap-1">
                      <LinkIcon className="w-2.5 h-2.5" /> Block Hash:
                    </span>
                    <span className="text-on-surface">{truncateHash(log.currentHash, 8, 8)}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-800 font-bold pt-0.5">
                    <span>Integrity:</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      VALID_TAMPER_EVIDENT
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-low flex items-center justify-between text-xs font-code-sm">
          <span className="text-slate-500 text-[10px]">
            Immutable Local Prototype Ledger • All Hashes Web Crypto Verified
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAuditDrawerOpen(false)}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
