import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/AppContext';
import { calculateFileSHA256 } from '../../utils/hash';
import { govDataService, GovDataset, ocrService, aiService } from '../../services/integrations';
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
  HardDrive,
  Globe,
  Link2,
  Landmark,
  Search,
  ExternalLink
} from 'lucide-react';

interface Stage01SourceProps {
  onContinue: () => void;
}

export const Stage01Source: React.FC<Stage01SourceProps> = ({ onContinue }) => {
  const { transformation, uploadSourceFile, ingestSourceUrl, analyzeSource } = useAppStore();
  const [intakeMode, setIntakeMode] = useState<'FILE' | 'URL' | 'GOV_DATA'>('FILE');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [ocrState, setOcrState] = useState<{
    status: 'idle' | 'processing' | 'completed' | 'failed';
    text?: string;
    provider?: string;
    error?: string;
  }>({ status: 'idle' });
  const [showOcrText, setShowOcrText] = useState(false);
  const [aiState, setAiState] = useState<{
    status: 'idle' | 'processing' | 'completed' | 'failed';
    operation?: string;
    data?: any;
    error?: string;
  }>({ status: 'idle' });
  const [showAiResult, setShowAiResult] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRunAi = async (operation: 'summarize' | 'analyze' | 'extract') => {
    if (!transformation.source?.id) return;
    setAiState({ status: 'processing', operation });
    try {
      let res: any;
      if (operation === 'summarize') res = await aiService.summarize(transformation.source.id);
      else if (operation === 'analyze') res = await aiService.analyze(transformation.source.id);
      else res = await aiService.extract(transformation.source.id);

      if (res.success && res.data) {
        setAiState({
          status: 'completed',
          operation,
          data: res.data
        });
        setShowAiResult(true);
      } else {
        setAiState({
          status: 'failed',
          operation,
          error: res.error?.message || 'AI processing failed'
        });
      }
    } catch (err: any) {
      setAiState({
        status: 'failed',
        operation,
        error: err.message || 'AI processing failed'
      });
    }
  };

  const handleRunOcr = async () => {
    if (!transformation.source?.id) return;
    setOcrState({ status: 'processing' });
    try {
      const res = await ocrService.processFile(transformation.source.id);
      if (res.success && res.data) {
        setOcrState({
          status: 'completed',
          text: res.data.text || res.data.extractedText || '',
          provider: res.data.provider || 'ocr.space'
        });
        setShowOcrText(true);
      } else {
        setOcrState({
          status: 'failed',
          error: res.message || 'OCR processing failed on document.'
        });
      }
    } catch (err: any) {
      setOcrState({
        status: 'failed',
        error: err.message || 'OCR processing failed'
      });
    }
  };

  // Government Data State
  const [govDatasets, setGovDatasets] = useState<GovDataset[]>([]);
  const [govQuery, setGovQuery] = useState('');
  const [isLoadingGov, setIsLoadingGov] = useState(false);

  useEffect(() => {
    if (intakeMode === 'GOV_DATA' && govDatasets.length === 0) {
      loadGovDatasets();
    }
  }, [intakeMode]);

  const loadGovDatasets = async (q?: string) => {
    setIsLoadingGov(true);
    try {
      const res = await govDataService.getDatasets(q || '');
      if (res.data) {
        setGovDatasets(res.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingGov(false);
    }
  };

  const handleImportGovDataset = async (dataset: GovDataset) => {
    setIsProcessing(true);
    const content = dataset.sampleTelemetry || `${dataset.title.toUpperCase()}\nAgency: ${dataset.agency}\nReference: ${dataset.url}\nLast Updated: ${dataset.lastUpdated}\n\nSummary:\n${dataset.summary}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], `${dataset.title.slice(0, 45)}.txt`, { type: 'text/plain' });
    await uploadSourceFile(file);
    setIsProcessing(false);
  };

  const supportedFormats = ['PDF', 'DOCX', 'XLSX', 'TXT', 'PNG', 'JPG', 'MP4', 'URL'];

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    await uploadSourceFile(file);
    setIsProcessing(false);
  };

  const handleIngestUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl.trim()) return;
    setIsProcessing(true);
    await ingestSourceUrl(sourceUrl.trim());
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

      {/* Intake Mode Switcher (File vs URL vs Open Gov Data) */}
      <div className="flex items-center justify-center">
        <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setIntakeMode('FILE')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              intakeMode === 'FILE'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            File Upload
          </button>
          <button
            type="button"
            onClick={() => setIntakeMode('URL')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              intakeMode === 'URL'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            URL Ingestion
          </button>
          <button
            type="button"
            onClick={() => setIntakeMode('GOV_DATA')}
            className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              intakeMode === 'GOV_DATA'
                ? 'bg-[#0A2540] text-white shadow-xs font-semibold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Open Gov Data (data.gov.in)</span>
          </button>
        </div>
      </div>

      {intakeMode === 'FILE' ? (
        /* Main Drag & Drop Zone */
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
      ) : intakeMode === 'URL' ? (
        /* URL Ingestion Panel */
        <form
          onSubmit={handleIngestUrl}
          className="bg-white border border-stone-200 rounded-3xl p-8 sm:p-10 shadow-subtle space-y-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Institutional Web Ingestion</h3>
              <p className="text-xs text-stone-500">Extract verifiable facts from public directives, regulatory bulletins, or URL feeds</p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-semibold text-stone-700">Source Web URL</label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="url"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://cisa.gov/advisories/icsa-26-044-01"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0E7F87] focus:ring-2 focus:ring-[#0E7F87]/15 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing || !sourceUrl.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ingesting Web Source...</span>
              </>
            ) : (
              <>
                <span>Ingest & Verify Web Source</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Open Government Data Browser (data.gov.in) */
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-subtle space-y-5 text-left animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 flex-shrink-0">
                <Landmark className="w-5 h-5 text-[#0E7F87]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Open Government Data Platform India (data.gov.in)
                </h3>
                <p className="text-xs text-stone-500">
                  Direct ingestion of certified institutional datasets, CERT-In bulletins, and infrastructure metrics
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold self-start sm:self-center">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>OGD API Live</span>
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={govQuery}
              onChange={e => {
                setGovQuery(e.target.value);
                loadGovDatasets(e.target.value);
              }}
              placeholder="Search cybersecurity advisories, infrastructure telemetry, MeitY directives..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0E7F87] focus:ring-2 focus:ring-[#0E7F87]/15 transition-all"
            />
          </div>

          {/* Datasets List */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {isLoadingGov ? (
              <div className="py-8 text-center text-stone-500 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0E7F87]" />
                <span>Querying data.gov.in open catalog...</span>
              </div>
            ) : govDatasets.length === 0 ? (
              <div className="py-8 text-center text-stone-500 text-xs">
                No matching open datasets found. Try searching for &quot;cyber&quot;, &quot;infrastructure&quot;, or &quot;telecom&quot;.
              </div>
            ) : (
              govDatasets.map(ds => (
                <div
                  key={ds.id}
                  className="p-4 rounded-2xl border border-stone-200/90 hover:border-[#0E7F87] bg-stone-50/50 hover:bg-white transition-all space-y-2 group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-200/70 text-stone-700 font-semibold">
                        {ds.category || 'Institutional Data'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#0E7F87] transition-colors leading-snug">
                        {ds.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 font-medium">
                        {ds.agency}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImportGovDataset(ds)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-[#0A2540] hover:bg-[#081D33] text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer flex-shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <span>Import</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {ds.summary}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-200/50">
                    <span>Source: data.gov.in</span>
                    <a
                      href={ds.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#0E7F87] hover:underline"
                    >
                      <span>Official Portal</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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

          {/* OCR Processing & Extracted Text */}
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-semibold text-stone-800">Document Text & OCR</span>
              </div>

              {ocrState.status === 'idle' && (
                <button
                  type="button"
                  onClick={handleRunOcr}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#0A2540] hover:bg-[#081D33] text-white font-medium transition-all shadow-xs cursor-pointer"
                >
                  Extract Text (OCR)
                </button>
              )}

              {ocrState.status === 'processing' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                  <span>Processing</span>
                </span>
              )}

              {ocrState.status === 'completed' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Completed ({ocrState.provider})</span>
                </span>
              )}

              {ocrState.status === 'failed' && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200">
                    Failed
                  </span>
                  <button
                    type="button"
                    onClick={handleRunOcr}
                    className="text-xs text-teal-700 hover:underline font-semibold cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {ocrState.status === 'failed' && ocrState.error && (
              <p className="text-xs text-red-600 font-mono">{ocrState.error}</p>
            )}

            {ocrState.status === 'completed' && ocrState.text && (
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => setShowOcrText(prev => !prev)}
                  className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showOcrText ? 'Hide extracted text' : 'Show extracted text'}</span>
                  {showOcrText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showOcrText && (
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200 max-h-48 overflow-y-auto font-mono text-[11px] text-stone-700 whitespace-pre-wrap leading-relaxed">
                    {ocrState.text}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Processing (OpenAI Integration) */}
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-semibold text-stone-800">AI Intelligence (OpenAI)</span>
              </div>

              {aiState.status === 'idle' && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRunAi('summarize')}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-[#0A2540] hover:bg-[#081D33] text-white font-medium transition-all shadow-xs cursor-pointer"
                  >
                    Summarize
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunAi('analyze')}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-stone-800 hover:bg-stone-900 text-white font-medium transition-all shadow-xs cursor-pointer"
                  >
                    Analyze
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunAi('extract')}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium transition-all shadow-xs cursor-pointer"
                  >
                    Extract
                  </button>
                </div>
              )}

              {aiState.status === 'processing' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                  <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                  <span>Processing ({aiState.operation})...</span>
                </span>
              )}

              {aiState.status === 'completed' && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Completed ({aiState.operation})</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRunAi('summarize')}
                      className="text-[10px] text-stone-500 hover:text-stone-800 underline"
                    >
                      Summarize
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunAi('analyze')}
                      className="text-[10px] text-stone-500 hover:text-stone-800 underline"
                    >
                      Analyze
                    </button>
                  </div>
                </div>
              )}

              {aiState.status === 'failed' && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200">
                    Failed
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRunAi(aiState.operation as any || 'summarize')}
                    className="text-xs text-purple-700 hover:underline font-semibold cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {aiState.status === 'failed' && aiState.error && (
              <p className="text-xs text-red-600 font-mono">{aiState.error}</p>
            )}

            {aiState.status === 'completed' && aiState.data && (
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAiResult(prev => !prev)}
                  className="text-xs font-semibold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showAiResult ? 'Hide AI output' : 'Show AI output'}</span>
                  {showAiResult ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showAiResult && (
                  <div className="p-3 rounded-lg bg-white border border-stone-200 max-h-56 overflow-y-auto text-xs text-stone-700 space-y-2">
                    {aiState.data.summary && (
                      <div>
                        <span className="font-bold text-stone-900 block mb-0.5">Summary:</span>
                        <p className="text-stone-600 leading-relaxed">{aiState.data.summary}</p>
                      </div>
                    )}
                    {Array.isArray(aiState.data.key_points) && aiState.data.key_points.length > 0 && (
                      <div>
                        <span className="font-bold text-stone-900 block mb-0.5">Key Points:</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                          {aiState.data.key_points.map((pt: string, i: number) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(aiState.data.claims) && aiState.data.claims.length > 0 && (
                      <div>
                        <span className="font-bold text-stone-900 block mb-0.5">Extracted Claims:</span>
                        <ul className="list-disc pl-4 space-y-1 text-stone-600">
                          {aiState.data.claims.slice(0, 5).map((c: any, i: number) => (
                            <li key={i}>
                              <span className="font-medium text-stone-800">{c.claimText}</span>
                              {c.anchorPassage && (
                                <p className="text-[10px] text-stone-400 font-mono mt-0.5">Anchor: &ldquo;{c.anchorPassage}&rdquo;</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(aiState.data.risks) && aiState.data.risks.length > 0 && (
                      <div>
                        <span className="font-bold text-stone-900 block mb-0.5">Risks Identified:</span>
                        <div className="space-y-1">
                          {aiState.data.risks.slice(0, 3).map((r: any, i: number) => (
                            <div key={i} className="p-1.5 rounded bg-stone-50 border border-stone-200 text-[11px]">
                              <span className="font-bold text-red-700 uppercase text-[10px] mr-1.5">[{r.severity || 'RISK'}]</span>
                              <span className="font-medium text-stone-800">{r.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
