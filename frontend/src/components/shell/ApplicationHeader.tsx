import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/AppContext';
import { SourceFlowLogo } from '../common/SourceFlowLogo';
import { CreateWorkspaceModal } from '../workspace/CreateWorkspaceModal';
import { CreateDashboardModal } from '../workspace/CreateDashboardModal';
import {
  ChevronDown,
  Plus,
  Search,
  Settings,
  LogOut,
  Check,
  LayoutGrid,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { UserRole } from '../../types/user';

export const ApplicationHeader: React.FC = () => {
  const {
    navigate,
    workspaces,
    currentWorkspace,
    currentDashboard,
    selectWorkspace,
    selectDashboard,
    currentUser,
    setUserRole,
    setIsSearchPaletteOpen,
    setIsSettingsModalOpen,
    logout
  } = useAppStore();

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isDashboardMenuOpen, setIsDashboardMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isCreateDashOpen, setIsCreateDashOpen] = useState(false);

  const wsMenuRef = useRef<HTMLDivElement>(null);
  const dashMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wsMenuRef.current && !wsMenuRef.current.contains(e.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (dashMenuRef.current && !dashMenuRef.current.contains(e.target as Node)) {
        setIsDashboardMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles: UserRole[] = ['Content Operator', 'Reviewer', 'Approver'];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200/90 select-none">
        <div className="w-full px-4 sm:px-6 flex items-center justify-between h-14">
          
          {/* Left: Brand Identity & Workspace Switcher */}
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Pure SourceFlow Icon/Logo Mark */}
            <SourceFlowLogo
              variant="mark"
              size="md"
              onClick={() => navigate('#/overview')}
              className="cursor-pointer"
            />

            <div className="h-4 w-px bg-stone-200 hidden sm:block" />

            {/* Workspace Switcher */}
            <div className="relative" ref={wsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen);
                  setIsDashboardMenuOpen(false);
                  setIsUserMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-all cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#0E7F87]" />
                <span className="max-w-[130px] sm:max-w-[170px] truncate font-medium">
                  {currentWorkspace?.name || 'Select Workspace'}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400 ml-0.5" />
              </button>

              {/* Workspace Dropdown */}
              {isWorkspaceMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-card border border-stone-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Switch Workspace
                  </div>
                  {workspaces.map(ws => {
                    const isSelected = ws.id === currentWorkspace?.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          selectWorkspace(ws.id);
                          setIsWorkspaceMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition-colors text-left cursor-pointer"
                      >
                        <div className="truncate">
                          <div className="font-semibold text-stone-900">{ws.name}</div>
                          <div className="text-[10px] text-stone-400 truncate">{ws.description}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#0E7F87] shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                  <div className="border-t border-stone-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      setIsCreateWsOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#0E7F87] hover:bg-teal-50/50 transition-colors text-left cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Workspace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      navigate('#/workspaces');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors text-left cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-stone-400" />
                    <span>All Workspaces</span>
                  </button>
                </div>
              )}
            </div>

            {/* Dashboard Switcher */}
            {currentWorkspace && (
              <div className="relative hidden md:block" ref={dashMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsDashboardMenuOpen(!isDashboardMenuOpen);
                    setIsWorkspaceMenuOpen(false);
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer border border-transparent hover:border-stone-200"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-stone-400" />
                  <span className="max-w-[130px] truncate">
                    {currentDashboard?.name || 'Dashboard'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {/* Dashboard Dropdown */}
                {isDashboardMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-card border border-stone-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Dashboards in {currentWorkspace.name}
                    </div>
                    {currentWorkspace.dashboards.map(dash => {
                      const isSelected = dash.id === currentDashboard?.id;
                      return (
                        <button
                          key={dash.id}
                          type="button"
                          onClick={() => {
                            selectDashboard(dash.id);
                            setIsDashboardMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors text-left cursor-pointer"
                        >
                          <span className="truncate">{dash.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#0E7F87] shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                    <div className="border-t border-stone-100 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsDashboardMenuOpen(false);
                        setIsCreateDashOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#0E7F87] hover:bg-teal-50/50 transition-colors text-left cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Dashboard</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Security Status, Command Palette, Settings, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Subtle Verification Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-50 border border-stone-200 text-stone-600 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0E7F87]" />
              <span>Grounded Attestation</span>
            </div>

            {/* Quick Search Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchPaletteOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-50 border border-stone-200 transition-colors cursor-pointer"
              title="Search and commands (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline text-xs">Search</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono bg-stone-100 border border-stone-200 rounded text-stone-500">
                ⌘K
              </kbd>
            </button>

            {/* Settings Trigger */}
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors cursor-pointer"
              title="Workspace Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* User Profile & Role Switcher */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(!isUserMenuOpen);
                  setIsWorkspaceMenuOpen(false);
                  setIsDashboardMenuOpen(false);
                }}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#0A2540] text-white text-[10px] font-bold flex items-center justify-center">
                  {currentUser?.avatar || 'KV'}
                </div>
                <span className="text-xs font-medium text-stone-800 hidden sm:inline">
                  {currentUser?.name?.split(' ')[0] || 'Operator'}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-card border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-stone-100">
                    <div className="font-semibold text-xs text-stone-900">{currentUser?.name}</div>
                    <div className="text-[11px] text-stone-500 truncate">{currentUser?.email}</div>
                    <div className="text-[10px] text-[#0E7F87] font-semibold mt-0.5">{currentUser?.designation}</div>
                  </div>

                  <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Switch Active Role
                  </div>
                  {roles.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setUserRole(role);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition-colors text-left cursor-pointer"
                    >
                      <span className={currentUser?.role === role ? 'font-semibold text-[#0A2540]' : ''}>
                        {role}
                      </span>
                      {currentUser?.role === role && <Check className="w-3.5 h-3.5 text-[#0E7F87]" />}
                    </button>
                  ))}

                  <div className="border-t border-stone-100 my-1.5" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <CreateWorkspaceModal
        isOpen={isCreateWsOpen}
        onClose={() => setIsCreateWsOpen(false)}
      />

      <CreateDashboardModal
        isOpen={isCreateDashOpen}
        onClose={() => setIsCreateDashOpen(false)}
      />
    </>
  );
};
