import React, { useState } from 'react';
import { useAppStore } from '../../store/AppContext';
import { SourceFlowLogo } from '../common/SourceFlowLogo';
import {
  LayoutDashboard,
  Sparkles,
  FolderKanban,
  CheckSquare,
  Clock,
  Sliders,
  Settings,
  X,
  User,
  ShieldCheck
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentRoute, navigate, userSession, setUserRole, unsupportedClaimsCount } = useAppStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const workspaceNav = [
    { label: 'Overview', route: '#/overview', icon: LayoutDashboard },
    { label: 'Transform', route: '#/transform', icon: Sparkles, badge: '6 Stages' },
    { label: 'Library', route: '#/library', icon: FolderKanban },
    {
      label: 'Reviews',
      route: '#/reviews',
      icon: CheckSquare,
      count: unsupportedClaimsCount > 0 ? unsupportedClaimsCount : undefined,
      alert: unsupportedClaimsCount > 0
    },
    { label: 'Activity', route: '#/activity', icon: Clock },
  ];

  const secondaryNav = [
    { label: 'Communication Profiles', route: '#/profiles', icon: Sliders },
    { label: 'Settings', route: '#/settings', icon: Settings },
  ];

  const isCurrent = (route: string) => {
    if (route === '#/overview' && (currentRoute === '#/dashboard' || currentRoute === '#/' || currentRoute === '')) return true;
    if (route === '#/transform' && (currentRoute === '#/new-transformation' || currentRoute === '#/output-studio')) return true;
    if (route === '#/library' && (currentRoute === '#/documents' || currentRoute === '#/projects')) return true;
    if (route === '#/reviews' && (currentRoute === '#/review' || currentRoute === '#/source-evidence')) return true;
    if (route === '#/activity' && (currentRoute === '#/audit')) return true;
    return currentRoute === route;
  };

  const handleNavigate = (route: string) => {
    navigate(route);
    setIsMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-stone-200/90 w-64 select-none">
      
      {/* Mobile-only Brand Header */}
      <div className="md:hidden px-4 py-3.5 border-b border-stone-100 flex items-center justify-between">
        <SourceFlowLogo
          variant="mark"
          size="md"
          onClick={() => handleNavigate('#/overview')}
        />
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          title="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        
        {/* Main Workspace Navigation */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400 font-mono">
            Navigation
          </div>
          <nav className="space-y-1">
            {workspaceNav.map(item => {
              const active = isCurrent(item.route);
              const Icon = item.icon;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNavigate(item.route)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-teal-50/60 text-[#0A2540] font-semibold border border-teal-100/80 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-[#0E7F87]' : 'text-stone-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      item.alert
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-stone-100 text-stone-700'
                    }`}>
                      {item.count}
                    </span>
                  )}

                  {item.badge && !active && (
                    <span className="text-[10px] text-stone-400 font-normal">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Configuration Section */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400 font-mono">
            Configuration
          </div>
          <nav className="space-y-1">
            {secondaryNav.map(item => {
              const active = isCurrent(item.route);
              const Icon = item.icon;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => handleNavigate(item.route)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-teal-50/60 text-[#0A2540] font-semibold border border-teal-100/80 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#0E7F87]' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Calm Status Callout */}
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-stone-900 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0E7F87]" />
            <span>Provable Grounding</span>
          </div>
          <p className="text-[11px] text-stone-500 leading-snug">
            All outputs are cross-referenced with cryptographic hash anchoring.
          </p>
        </div>

      </div>

      {/* User Footer Profile & Role Switcher */}
      <div className="p-3 border-t border-stone-100 bg-white relative">
        <div 
          onClick={() => setShowRoleMenu(prev => !prev)}
          className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 border border-stone-200/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#0A2540] text-white flex items-center justify-center text-xs font-semibold">
              {userSession.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-stone-900 truncate">
                {userSession.name}
              </div>
              <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{userSession.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Role Switcher Popup */}
        {showRoleMenu && (
          <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-card border border-stone-200 p-2 z-50 animate-in fade-in zoom-in-95">
            <div className="text-[10px] font-bold uppercase text-stone-400 px-2 py-1">
              Switch User Role
            </div>
            {(['Content Operator', 'Reviewer', 'Approver'] as const).map(role => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setUserRole(role);
                  setShowRoleMenu(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  userSession.role === role
                    ? 'bg-teal-50 text-[#0E7F87] font-semibold'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>{role}</span>
                {userSession.role === role && <span className="text-[10px] font-bold">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col h-full flex-shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-stone-900/20 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-card z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
