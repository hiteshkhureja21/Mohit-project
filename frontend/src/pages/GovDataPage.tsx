import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database,
  Shield,
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import { govDataService, GovDataset } from '../services/integrations';

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

const ProviderBadge: React.FC<{ name: string; configured: boolean; requiresOnboarding?: boolean }> = ({
  name,
  configured,
  requiresOnboarding
}) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium ${
    configured
      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
      : requiresOnboarding
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-stone-50 border-stone-200 text-stone-600'
  }`}>
    {configured ? (
      <CheckCircle2 className="w-3 h-3" />
    ) : (
      <AlertCircle className="w-3 h-3" />
    )}
    <span>{name}</span>
    {requiresOnboarding && !configured && (
      <span className="text-[10px] font-semibold opacity-70">• Onboarding required</span>
    )}
    {configured && <span className="text-[10px] font-semibold opacity-70">• Live</span>}
    {!configured && !requiresOnboarding && (
      <span className="text-[10px] font-semibold opacity-70">• Demo mode</span>
    )}
  </div>
);

const DatasetCard: React.FC<{
  dataset: GovDataset;
  onSelect: (d: GovDataset) => void;
}> = ({ dataset, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(dataset)}
    className="w-full text-left p-4 rounded-xl border border-stone-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all group bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {dataset.category && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-md">
              {dataset.category}
            </span>
          )}
          <span className="text-[10px] text-stone-400 font-mono">{dataset.id}</span>
        </div>
        <h3 className="text-xs font-semibold text-stone-900 leading-snug group-hover:text-teal-900 line-clamp-2">
          {dataset.title}
        </h3>
        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-stone-500">
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{dataset.agency}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-teal-500 shrink-0 mt-1 transition-colors" />
    </div>

    <p className="text-[11px] text-stone-500 leading-relaxed mt-2 line-clamp-2">
      {dataset.summary}
    </p>

    <div className="flex items-center gap-3 mt-3 text-[10px] text-stone-400">
      {dataset.recordCount !== undefined && (
        <span className="flex items-center gap-1">
          <Database className="w-2.5 h-2.5" />
          {dataset.recordCount.toLocaleString()} records
        </span>
      )}
      {dataset.lastUpdated && (
        <span className="flex items-center gap-1">
          <Calendar className="w-2.5 h-2.5" />
          {new Date(dataset.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )}
      {dataset.source && (
        <span className="flex items-center gap-1">
          <Shield className="w-2.5 h-2.5 text-teal-500" />
          {dataset.source}
        </span>
      )}
    </div>
  </button>
);

const DatasetDetail: React.FC<{
  dataset: GovDataset;
  onBack: () => void;
}> = ({ dataset, onBack }) => (
  <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
    {/* Back + Header */}
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>All Datasets</span>
      </button>
    </div>

    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
      {/* Category + ID */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {dataset.category && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
            {dataset.category}
          </span>
        )}
        <span className="text-[10px] font-mono text-stone-400 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded">
          {dataset.id}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-base font-bold text-stone-900 leading-snug">{dataset.title}</h2>

      {/* Agency */}
      <div className="flex items-center gap-1.5 mt-2 text-xs text-stone-500">
        <Building2 className="w-3.5 h-3.5 text-teal-600" />
        <span>{dataset.agency}</span>
      </div>

      {/* Metadata Row */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-stone-100 text-[11px] text-stone-500">
        {dataset.recordCount !== undefined && (
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-stone-400" />
            <span><strong className="text-stone-700">{dataset.recordCount.toLocaleString()}</strong> records</span>
          </div>
        )}
        {dataset.lastUpdated && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>Updated <strong className="text-stone-700">{new Date(dataset.lastUpdated).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
          </div>
        )}
        {dataset.source && (
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-500" />
            <span>Source: <strong className="text-teal-700">{dataset.source}</strong></span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4">
        <div className="text-[10px] font-bold uppercase tracking-wide text-stone-400 mb-1.5">Summary</div>
        <p className="text-xs text-stone-600 leading-relaxed">{dataset.summary}</p>
      </div>

      {/* External Link */}
      {dataset.url && (
        <div className="mt-4 pt-4 border-t border-stone-100">
          <a
            href={dataset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View on data.gov.in</span>
          </a>
        </div>
      )}
    </div>

    {/* Sample Telemetry */}
    {dataset.sampleTelemetry && (
      <div className="bg-[#0A2540] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-bold text-white tracking-tight">Sample Institutional Telemetry</span>
          <span className="ml-auto text-[10px] text-white/40 font-mono">OFFICIAL // RESTRICTED</span>
        </div>
        <pre className="text-[11px] text-teal-100/90 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
          {dataset.sampleTelemetry}
        </pre>
      </div>
    )}
  </div>
);

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export const GovDataPage: React.FC = () => {
  const [datasets, setDatasets] = useState<GovDataset[]>([]);
  const [providers, setProviders] = useState<Array<{ id: string; name: string; isConfigured: boolean; requiresOnboarding?: boolean }>>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<GovDataset | null>(null);

  const fetchData = useCallback(async (searchQuery = query, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [datasetsRes, providersRes] = await Promise.all([
        govDataService.getDatasets(searchQuery || undefined),
        govDataService.getProviders()
      ]);

      if (datasetsRes.success && datasetsRes.data) {
        setDatasets(datasetsRes.data);
      } else {
        const errMsg = typeof datasetsRes.error === 'string'
          ? datasetsRes.error
          : datasetsRes.error?.message ?? 'Failed to load government datasets.';
        setError(errMsg);
      }

      if (providersRes.success && providersRes.data) {
        setProviders(providersRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to government data service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  // Initial load
  useEffect(() => {
    fetchData('');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(query);
  };

  const handleRefresh = () => {
    fetchData(query, true);
  };

  return (
    <div className="flex-1 bg-[#FAFAF9] overflow-y-auto px-6 py-8 lg:px-10 lg:py-10">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ─── Page Header ─── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-[#0A2540] flex items-center justify-center shadow-sm">
                <Landmark className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">Government Open Data</h1>
            </div>
            <p className="text-xs text-stone-500 ml-10.5">
              Secure access to Indian open-government datasets via <strong>data.gov.in</strong> and <strong>API Setu</strong>.
              All credentials are server-side only.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs text-stone-600 font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>

        {/* ─── Provider Status Strip ─── */}
        {providers.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Providers:</span>
            {providers.map(p => (
              <ProviderBadge
                key={p.id}
                name={p.name}
                configured={p.isConfigured}
                requiresOnboarding={p.requiresOnboarding}
              />
            ))}
          </div>
        )}

        {/* ─── Search Bar ─── */}
        {!selectedDataset && (
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search datasets by keyword, agency, or category…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#0E3060] text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>
        )}

        {/* ─── Error State ─── */}
        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div>
              <strong className="block font-semibold mb-0.5">Could not load datasets</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ─── Loading Skeleton ─── */}
        {loading && !error && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* ─── Dataset Detail View ─── */}
        {selectedDataset && !loading && (
          <DatasetDetail
            dataset={selectedDataset}
            onBack={() => setSelectedDataset(null)}
          />
        )}

        {/* ─── Dataset List ─── */}
        {!loading && !error && !selectedDataset && (
          <>
            {datasets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-stone-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700">No datasets found</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Try a different search term or <button onClick={() => { setQuery(''); fetchData(''); }} className="text-teal-600 hover:underline cursor-pointer">view all datasets</button>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} {query ? `matching "${query}"` : 'available'}
                  </span>
                  <span className="text-[10px] text-stone-400">Click a dataset to view details</span>
                </div>
                {datasets.map(d => (
                  <DatasetCard key={`${d.source}-${d.id}`} dataset={d} onSelect={setSelectedDataset} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Footer notice ─── */}
        <div className="pt-4 border-t border-stone-100">
          <p className="text-[10px] text-stone-400 leading-relaxed">
            <strong className="text-stone-500">Security note:</strong> All government API credentials are stored server-side only.
            No API keys are ever transmitted to the browser.
            Data is sourced from official Indian government portals (<a href="https://data.gov.in" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">data.gov.in</a> and <a href="https://apisetu.gov.in" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">apisetu.gov.in</a>).
          </p>
        </div>

      </div>
    </div>
  );
};
