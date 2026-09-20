import React from 'react';
import { useAppStore } from './store/AppContext';
import { ApplicationHeader } from './components/shell/ApplicationHeader';
import { Sidebar } from './components/shell/Sidebar';
import { Toast } from './components/common/Toast';
import { SearchPalette } from './components/common/SearchPalette';
import { SettingsModal } from './components/shell/SettingsModal';
import { AuditTrailDrawer } from './components/review/AuditTrailDrawer';

// Modern Workspace Pages
import { OverviewPage } from './pages/OverviewPage';
import { TransformPage } from './pages/TransformPage';
import { LibraryPage } from './pages/LibraryPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { ActivityPage } from './pages/ActivityPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { WorkspaceSelectorPage } from './pages/WorkspaceSelectorPage';
import { DashboardSelectorPage } from './pages/DashboardSelectorPage';
import { GovDataPage } from './pages/GovDataPage';

export const AppContent: React.FC = () => {
  const { currentRoute, isAuthenticated } = useAppStore();

  // Auth Guard: Unauthenticated users are strictly routed to LoginPage
  if (!isAuthenticated || currentRoute === '#/login') {
    return (
      <div className="min-h-screen w-screen overflow-x-hidden bg-stone-50 font-sans">
        <LoginPage />
        <Toast />
      </div>
    );
  }

  // Workspaces Hub Route
  if (currentRoute === '#/workspaces') {
    return (
      <div className="min-h-screen w-screen overflow-x-hidden bg-stone-50 font-sans">
        <WorkspaceSelectorPage />
        <Toast />
        <SearchPalette />
      </div>
    );
  }

  // Dashboard Hub Route: #/workspace/:workspaceId (without inner sub-route)
  if (
    currentRoute.startsWith('#/workspace/') &&
    !currentRoute.includes('/dashboard/') &&
    !currentRoute.includes('/overview') &&
    !currentRoute.includes('/transform')
  ) {
    return (
      <div className="min-h-screen w-screen overflow-x-hidden bg-stone-50 font-sans">
        <DashboardSelectorPage />
        <Toast />
        <SearchPalette />
      </div>
    );
  }

  // Active Workspace Route Renderer
  const renderRoute = () => {
    // Normalise route in case of nested #/workspace/:id/dashboard/:id/overview
    const route = currentRoute.includes('/overview')
      ? '#/overview'
      : currentRoute.includes('/transform')
      ? '#/transform'
      : currentRoute.includes('/library')
      ? '#/library'
      : currentRoute.includes('/reviews')
      ? '#/reviews'
      : currentRoute.includes('/activity')
      ? '#/activity'
      : currentRoute;

    switch (route) {
      case '#/new-transformation':
      case '#/transform':
      case '#/output-studio':
        return <TransformPage />;
      case '#/library':
      case '#/documents':
      case '#/projects':
        return <LibraryPage />;
      case '#/reviews':
      case '#/review':
      case '#/source-evidence':
        return <ReviewsPage />;
      case '#/activity':
      case '#/audit':
        return <ActivityPage />;
      case '#/profiles':
        return <ProfilesPage />;
      case '#/settings':
        return <SettingsPage />;
      case '#/govdata':
      case '#/gov-data':
      case '#/government':
        return <GovDataPage />;
      case '#/overview':
      case '#/dashboard':
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAFAF9] text-stone-900 font-sans">
      {/* Top Application Header with Brand, Workspace Switcher, and Nav Tabs */}
      <ApplicationHeader />

      {/* Main App Body with Collapsible Sidebar & Workspace Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {renderRoute()}
        </main>
      </div>

      {/* Global Utilities */}
      <Toast />
      <SearchPalette />
      <SettingsModal />
      <AuditTrailDrawer />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;
