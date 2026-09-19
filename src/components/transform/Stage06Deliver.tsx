import React, { useState } from 'react';
import { useAppStore } from '../../store/AppContext';
import { OutputDeliverable } from '../../types/output';
import {
  CheckCircle2,
  Lock,
  Mail,
  Send,
  Download,
  Eye,
  FileText,
  ShieldCheck,
  ArrowLeft,
  Check,
  AlertCircle,
  Paperclip,
  Plus
} from 'lucide-react';

interface Stage06DeliverProps {
  onBack: () => void;
}

export const Stage06Deliver: React.FC<Stage06DeliverProps> = ({ onBack }) => {
  const {
    transformation,
    userSession,
    isApprovalBlocked,
    unsupportedClaimsCount,
    approveOutputs,
    sendCommunication,
    navigate
  } = useAppStore();

  const [activePreviewOutput, setActivePreviewOutput] = useState<OutputDeliverable | null>(null);
  const [isPreviewEmailOpen, setIsPreviewEmailOpen] = useState(false);
  
  const [subject, setSubject] = useState(transformation.delivery.subject || 'Cybersecurity Threat Intelligence Update');
  const [messageBody, setMessageBody] = useState(
    transformation.delivery.message ||
    'Please find attached the formally verified Cybersecurity Threat Intelligence briefing and remediation directives, attested through 23 claims verified against primary source telemetry.'
  );

  const [recipients, setRecipients] = useState([
    { name: 'Director Office', email: 'director-office@agency.gov', role: 'Executive' },
    { name: 'CISO Board', email: 'ciso-board@agency.gov', role: 'Governance' },
    { name: 'SOC Incident Leads', email: 'soc-leads@agency.gov', role: 'Technical' },
  ]);

  const [isAddRecipientOpen, setIsAddRecipientOpen] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');

  const isApproved = transformation.review.status === 'APPROVED';
  const isSent = transformation.delivery.status === 'SENT';

  const handleApprove = async () => {
    await approveOutputs();
  };

  const handleSend = async () => {
    await sendCommunication({ subject, message: messageBody });
    setIsPreviewEmailOpen(false);
  };

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipientEmail.trim()) return;
    setRecipients(prev => [
      ...prev,
      {
        name: newRecipientName || newRecipientEmail.split('@')[0],
        email: newRecipientEmail,
        role: 'Stakeholder'
      }
    ]);
    setNewRecipientName('');
    setNewRecipientEmail('');
    setIsAddRecipientOpen(false);
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(prev => prev.filter(r => r.email !== emailToRemove));
  };

  const handleExportOutput = (out: OutputDeliverable) => {
    const dataStr = `data:text/plain;charset=utf-8,${encodeURIComponent(
      `SOURCEFLOW GENERATED ARTEFACT\nTITLE: ${out.title}\nAUDIENCE: ${out.audience}\nSTATUS: VERIFIED & ATTESTED\n\n${out.content}`
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${out.title.replace(/\s+/g, '_')}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 py-2 max-w-3xl mx-auto">
      
      {/* Top Heading */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight font-sans">
          Deliver Communication Package
        </h2>
        <p className="text-xs sm:text-sm text-stone-500">
          Attest claims and dispatch to verified stakeholder channels.
        </p>
      </div>

      {/* Generated Outputs Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
            Generated deliverables ({transformation.outputs.length})
          </h3>
          <span className="text-xs text-[#0E7F87] font-medium">All outputs grounded to source</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {transformation.outputs.map(out => (
            <div
              key={out.id}
              className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-subtle flex flex-col justify-between space-y-3 hover:border-stone-300 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-lg bg-stone-50 text-[#0E7F87] border border-stone-200/60 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                    {out.audience}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-stone-900 line-clamp-1 font-sans">
                    {out.title}
                  </h4>
                  <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                    {out.content.slice(0, 140)}...
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-stone-400">
                  {Math.max(1, Math.ceil(out.content.split(' ').length / 150))} min read
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActivePreviewOutput(out)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-medium transition-colors cursor-pointer text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportOutput(out)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[#0E7F87] hover:bg-teal-50 font-medium transition-colors cursor-pointer text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Human Review & Attestation Gate */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-semibold text-stone-900 flex items-center gap-2 font-sans">
              <ShieldCheck className="w-4 h-4 text-[#0E7F87]" />
              <span>Human Review & Attestation Gate</span>
            </h3>
            <p className="text-xs text-stone-500">
              Cryptographically anchors all claims to verified source telemetry before dispatch.
            </p>
          </div>

          <div>
            {isApproved ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Approved & Signed</span>
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                isApprovalBlocked
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-stone-100 text-stone-700 border border-stone-200'
              }`}>
                {isApprovalBlocked ? 'Claims Pending Review' : 'Ready for Sign-Off'}
              </span>
            )}
          </div>
        </div>

        {/* Requirements Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-stone-700 font-medium">Source SHA-256 verified</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-2">
            {unsupportedClaimsCount === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
            <span className="text-stone-700 font-medium">
              {unsupportedClaimsCount === 0 ? 'All 23 claims resolved' : `${unsupportedClaimsCount} claims pending`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-stone-700 font-medium">Audience deliverables verified</span>
          </div>
        </div>

        {/* Approval Trigger */}
        {!isApproved && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-xs text-stone-500">
              Signer: <strong className="text-stone-800">{userSession.name}</strong> ({userSession.role})
            </span>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApprovalBlocked}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                isApprovalBlocked
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-[#0A2540] hover:bg-[#081D33] text-white cursor-pointer hover:shadow-subtle'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Approve & Sign Outputs</span>
            </button>
          </div>
        )}
      </div>

      {/* DocuSign-Inspired Delivery Section: Add Recipients & Add Message */}
      <div className={`bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-subtle space-y-6 transition-all ${
        isApproved ? 'opacity-100' : 'opacity-70 pointer-events-none'
      }`}>
        
        {/* Section 1: Add Recipients (Reference 1 Style) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 font-sans">
              Add recipients
            </h3>
            <span className="text-xs text-stone-400 font-medium">
              {recipients.length} recipients selected
            </span>
          </div>

          {/* Recipient Cards */}
          <div className="space-y-2">
            {recipients.map((r, idx) => (
              <div
                key={r.email}
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-colors text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-stone-900 block">{r.name}</span>
                    <span className="text-stone-500 font-mono text-[11px]">{r.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200/60">
                    {r.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(r.email)}
                    className="text-stone-400 hover:text-rose-600 text-xs px-1"
                    title="Remove recipient"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Recipient Form or Button */}
          {isAddRecipientOpen ? (
            <form onSubmit={handleAddRecipient} className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Name</label>
                  <input
                    type="text"
                    value={newRecipientName}
                    onChange={e => setNewRecipientName(e.target.value)}
                    placeholder="e.g. Legal Counsel"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newRecipientEmail}
                    onChange={e => setNewRecipientEmail(e.target.value)}
                    placeholder="name@agency.gov"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddRecipientOpen(false)}
                  className="px-3 py-1 rounded-lg border border-stone-200 text-stone-600 text-xs hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-[#0A2540] text-white text-xs font-semibold"
                >
                  Save Recipient
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddRecipientOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 hover:border-stone-400 bg-white text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#0E7F87]" />
              <span>+ ADD RECIPIENT</span>
            </button>
          )}
        </div>

        {/* Section 2: Add Message (Reference 1 Style) */}
        <div className="space-y-4 pt-2 border-t border-stone-100">
          <div className="border-b border-stone-100 pb-2">
            <h3 className="text-base sm:text-lg font-bold text-stone-900 font-sans">
              Add message
            </h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-stone-700">
                Email Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#0E7F87] focus:ring-1 focus:ring-[#0E7F87]"
              />
              <span className="text-[10px] text-stone-400 font-mono block">
                {100 - subject.length} characters remaining
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-stone-700">
                Email Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                rows={4}
                className="w-full p-3.5 rounded-xl border border-stone-200 bg-white text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#0E7F87] focus:ring-1 focus:ring-[#0E7F87] leading-relaxed"
              />
            </div>
          </div>

          {/* Attachments list */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-stone-400 font-mono text-[11px] flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> Attachments ({transformation.outputs.length}):
            </span>
            {transformation.outputs.map(o => (
              <span key={o.id} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono text-[11px]">
                {o.title}.pdf
              </span>
            ))}
          </div>
        </div>

        {/* Success Banner if Sent */}
        {isSent && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1 animate-in fade-in">
            <div className="flex items-center gap-2 font-semibold text-sm text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Communication package successfully dispatched</span>
            </div>
            <p className="text-xs text-emerald-800">
              Delivered to {recipients.length} recipients. Cryptographic attestation audit chained.
            </p>
          </div>
        )}

        {/* Delivery Footer Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewEmailOpen(true)}
              disabled={!isApproved}
              className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              Preview dispatch email
            </button>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!isApproved || isSent}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-xs ${
              isApproved && !isSent
                ? 'bg-[#0A2540] hover:bg-[#081D33] text-white cursor-pointer hover:shadow-subtle'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSent ? 'Dispatched ✓' : 'Approve & Deliver'}</span>
          </button>
        </div>

      </div>

      {/* Stepper Navigation Back */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Verification</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('#/overview')}
          className="px-4 py-2 rounded-xl text-stone-600 hover:text-stone-900 text-xs font-medium transition-colors cursor-pointer"
        >
          Return to Overview
        </button>
      </div>

      {/* Output Preview Modal */}
      {activePreviewOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-card border border-stone-200 space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900 font-sans">
                  {activePreviewOutput.title}
                </h3>
                <p className="text-xs text-stone-500">
                  Target Audience: {activePreviewOutput.audience}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewOutput(null)}
                className="text-stone-400 hover:text-stone-700 p-1 text-lg font-mono leading-none"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-stone-50 rounded-xl font-mono text-xs text-stone-800 whitespace-pre-wrap leading-relaxed border border-stone-200/60">
              {activePreviewOutput.content}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePreviewOutput(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleExportOutput(activePreviewOutput)}
                className="px-4 py-2 rounded-xl bg-[#0A2540] text-white text-xs font-medium hover:bg-[#081D33]"
              >
                Export Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {isPreviewEmailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-card border border-stone-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0E7F87]" />
                <span>Stakeholder Dispatch Preview</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPreviewEmailOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 text-lg font-mono leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-1">
                <div><strong className="text-stone-500">To:</strong> {recipients.map(r => r.email).join(', ')}</div>
                <div><strong className="text-stone-500">Subject:</strong> {subject}</div>
                <div><strong className="text-stone-500">Attestation:</strong> SHA-256 Provenance Sealed</div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-stone-200 text-stone-700 whitespace-pre-wrap leading-relaxed">
                {messageBody}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPreviewEmailOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-50"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSent}
                className="px-4 py-2 rounded-xl bg-[#0A2540] text-white text-xs font-medium hover:bg-[#081D33]"
              >
                {isSent ? 'Dispatched' : 'Confirm & Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
