import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { AudienceProfile } from '../types/transformation';
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Users,
  Shield,
  Megaphone,
  Check,
  X,
  Mail,
  FileText
} from 'lucide-react';

export const ProfilesPage: React.FC = () => {
  const { transformation } = useAppStore();
  const [profiles, setProfiles] = useState<AudienceProfile[]>(transformation.profiles);
  const [editingProfile, setEditingProfile] = useState<AudienceProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newProfileName, setNewProfileName] = useState('');
  const [newTone, setNewTone] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newDeliverableType, setNewDeliverableType] = useState<
    'Executive Brief' | 'Technical Advisory' | 'Communication Package' | 'Presentation Deck'
  >('Executive Brief');
  const [newRecipients, setNewRecipients] = useState('');

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setProfiles(prev => prev.map(p => (p.id === editingProfile.id ? editingProfile : p)));
    setEditingProfile(null);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const newProf: AudienceProfile = {
      id: `prof-${Date.now()}`,
      name: newProfileName,
      tone: newTone || 'Direct · Clear · Objective',
      detailLevel: newDetail || 'Standard Operational',
      language: 'English (Standard)',
      objective: newObjective || 'Operational Alignment',
      deliverableType: newDeliverableType,
      defaultRecipients: newRecipients ? newRecipients.split(',').map(s => s.trim()) : ['team@agency.gov'],
      isSelected: true
    };

    setProfiles(prev => [...prev, newProf]);
    setIsAddModalOpen(false);
    setNewProfileName('');
    setNewTone('');
    setNewDetail('');
    setNewObjective('');
    setNewRecipients('');
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
  };

  const getProfileIcon = (name: string) => {
    if (name.toLowerCase().includes('exec')) return <Users className="w-5 h-5 text-teal-700" />;
    if (name.toLowerCase().includes('cyber')) return <Shield className="w-5 h-5 text-teal-700" />;
    return <Megaphone className="w-5 h-5 text-teal-700" />;
  };

  return (
    <div className="flex-1 bg-[#FAFAF9] overflow-y-auto px-6 py-8 lg:px-12 lg:py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-sans">
              Communication Profiles
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Define audience-specific tone rules, technical depth, default outputs, and distribution lists.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A2540] hover:bg-[#081D33] text-white text-xs font-semibold transition-all shadow-xs self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4 text-teal-300" />
            <span>Add Profile</span>
          </button>
        </div>

        {/* Profiles Grid */}
        <div className="space-y-4">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className="bg-white border border-stone-200 rounded-2xl p-5 shadow-subtle space-y-4 hover:border-stone-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                    {getProfileIcon(profile.name)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      {profile.name}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Primary Output: <span className="font-semibold text-stone-700">{profile.deliverableType}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingProfile(profile)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(profile.id)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profile Config Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                <div>
                  <span className="text-stone-400 text-[10px] uppercase font-mono block">Tone & Phrasing</span>
                  <span className="font-medium text-stone-800">{profile.tone}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] uppercase font-mono block">Detail Depth</span>
                  <span className="font-medium text-stone-800">{profile.detailLevel}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] uppercase font-mono block">Communication Goal</span>
                  <span className="font-medium text-stone-800">{profile.objective}</span>
                </div>
              </div>

              {/* Recipients Tag List */}
              <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                <Mail className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                <span className="truncate">
                  {profile.defaultRecipients.join(', ')}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-floating border border-stone-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                Edit Communication Profile
              </h3>
              <button onClick={() => setEditingProfile(null)} className="text-stone-400 hover:text-stone-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1">Profile Name</label>
                <input
                  type="text"
                  value={editingProfile.name}
                  onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-500 mb-1">Tone Formulation</label>
                <input
                  type="text"
                  value={editingProfile.tone}
                  onChange={e => setEditingProfile({ ...editingProfile, tone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-500 mb-1">Detail Level</label>
                <input
                  type="text"
                  value={editingProfile.detailLevel}
                  onChange={e => setEditingProfile({ ...editingProfile, detailLevel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-500 mb-1">Communication Objective</label>
                <input
                  type="text"
                  value={editingProfile.objective}
                  onChange={e => setEditingProfile({ ...editingProfile, objective: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 text-white font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-floating border border-stone-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold text-stone-900">
                Create New Communication Profile
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1">Audience Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g. Legal & Statutory Counsel"
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-stone-500 mb-1">Tone</label>
                <input
                  type="text"
                  placeholder="e.g. Statutory · Formal · Precise"
                  value={newTone}
                  onChange={e => setNewTone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-500 mb-1">Default Output Type</label>
                <select
                  value={newDeliverableType}
                  onChange={e => setNewDeliverableType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                >
                  <option value="Executive Brief">Executive Brief</option>
                  <option value="Technical Advisory">Technical Advisory</option>
                  <option value="Communication Package">Communication Package</option>
                  <option value="Presentation Deck">Presentation Deck</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-500 mb-1">Recipients (comma separated)</label>
                <input
                  type="text"
                  placeholder="legal@agency.gov, counsel@agency.gov"
                  value={newRecipients}
                  onChange={e => setNewRecipients(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 text-white font-semibold"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
