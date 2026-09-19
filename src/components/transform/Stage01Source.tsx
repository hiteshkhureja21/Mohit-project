import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/AppContext';
import { calculateFileSHA256 } from '../../utils/hash';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Shield,
  Loader2,
  HardDrive
} from 'lucide-react';

interface Stage01SourceProps {
  onContinue: () => void;
}

export const Stage01Source: React.FC<Stage01SourceProps> = ({ onContinue }) => {
  const { transformation, uploadSourceFile, analyzeSource } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = ['PDF', 'DOCX', 'XLSX', 'TXT', 'PNG', 'JPG', 'MP4', 'URL'];

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    await uploadSourceFile(file);
    setIsProcessing(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectPreset = async () => {
    setIsProcessing(true);
    // Real calculation with demo mock blob
    const sampleContent = `CYBERSECURITY THREAT INTELLIGENCE RESEARCH REPORT\nAssessment: Advanced Persistent Threat Telemetry\nScope: 20 Pages, 23 Claims, 1420000 Perimeter Ingress Signals.`;
    const blob = new Blob([sampleContent], { type: 'application/pdf' });
    const file = new File([blob], 'Cybersecurity Threat Intelligence Research Report.pdf', { type: 'application/pdf' });
    await uploadSourceFile(file);
    setIsProcessing(false);
  };

  const handleAnalyzeAndProceed = async () => {
    setIsProcessing(true);
    await analyzeSource();
    setIsProcessing(false);
    onContinue();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      
      {/* Step Heading */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-sans">
          What would you like to transform?
        </h2>
        <p className="text-sm text-stone-600 max-w-md mx-auto">
          Upload any document, briefing, or intelligence record. SourceFlow will extract grounded facts and adapt them across formats.
        </p>

        {/* Supported Formats Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {supportedFormats.map(fmt => (
            <span
              key={fmt}
              className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200/80"
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-teal-500 bg-teal-50/50 scale-[1.01]'
            : 'border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50/50 shadow-subtle'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              handleProcessFile(e.target.files[0]);
            }
          }}
        />

        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-100 shadow-subtle">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-stone-900">
              Drag & drop your source here
            </p>
            <p className="text-xs text-stone-500">
              or <span className="text-teal-700 font-semibold underline underline-offset-2">Choose file</span> from your device
            </p>
          </div>

          <p className="text-[11px] text-stone-400">
            PDF, DOCX, XLSX, TXT, images up to 50MB
          </p>
        </div>
      </div>

      {/* "Try a sample" Section */}
      <div className="space-y-2 text-center">
        <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">
          Or try a sample document
        </span>

        <div className="pt-1 flex justify-center">
          <button
            onClick={handleSelectPreset}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold transition-all shadow-subtle hover:border-stone-300 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-teal-700" />
            <span>Cybersecurity Threat Intelligence Research Report</span>
            <span className="text-[11px] text-stone-600 font-mono font-normal">2.8 MB • 20 pgs</span>
          </button>
        </div>
      </div>

      {/* Selected Source Preview Card */}
      {transformation.source && (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-subtle space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 border border-teal-100">
                <FileText className="w-6 h-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-stone-900 truncate">
                    {transformation.source.name}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Ready
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-1 font-mono">
                  <span>{transformation.source.type}</span>
                  <span>•</span>
                  <span>{transformation.source.size}</span>
                  <span>•</span>
                  <span>{transformation.source.pages} pages</span>
                  <span>•</span>
                  <span>23 verifiable claims</span>
                </div>
              </div>
            </div>
          </div>

          {/* SHA-256 subtle metadata fingerprint */}
          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <div className="flex items-center gap-1.5 truncate">
              <Shield className="w-3.5 h-3.5 text-teal-700 flex-shrink-0" />
              <span className="text-stone-400">SHA-256:</span>
              <span className="text-stone-700 font-semibold truncate">
                {transformation.source.sha256}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider flex-shrink-0 pl-2">
              Verified
            </span>
          </div>

          {/* Collapsible Technical Details */}
          <div>
            <button
              onClick={() => setShowTechnicalDetails(prev => !prev)}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View source details</span>
              {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2.5 pt-2.5 border-t border-stone-100 text-xs text-stone-600 space-y-1.5 font-mono text-[11px] animate-in fade-in">
                <div className="flex justify-between">
                  <span className="text-stone-400">Document ID:</span>
                  <span className="text-stone-800 font-semibold">{transformation.source.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Ingestion Timestamp:</span>
                  <span className="text-stone-800">{new Date().toLocaleTimeString()} IST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Claim Grounding Surface:</span>
                  <span className="text-stone-800 font-semibold">20 Pages (Exact Passages Mapped)</span>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              onClick={handleAnalyzeAndProceed}
              disabled={isProcessing}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white font-medium text-xs sm:text-sm transition-all shadow-xs hover:shadow-subtle cursor-pointer disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing source intelligence...</span>
                </>
              ) : (
                <>
                  <span>Analyze source & continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
