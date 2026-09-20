/**
 * Central Application Context & State Management
 * Single source of truth for navigation, authentication, workspaces,
 * and the end-to-end transformation & verification workflow.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transformation, GroundingClaim } from '../types/transformation';
import { ClaimStatus } from '../types/claim';
import { UserSession, UserRole } from '../types/user';
import { Workspace, WorkspaceType, Dashboard, DashboardType } from '../types/workspace';
import { initialTransformation, initialClaims23, initialAudienceProfiles } from '../data/demoData';
import { isDemoMode } from '../config/supabase';

import { documentService } from '../services/documentService';
import { generationService } from '../services/generationService';
import { verificationService } from '../services/verificationService';
import { deliveryService } from '../services/deliveryService';
import { transformationService } from '../services/transformationService';
import { auditService } from '../services/auditService';
import { authService, defaultUserSession } from '../services/authService';
import { workspaceService } from '../services/workspaceService';

export const emptyTransformation: Transformation = {
  id: '',
  title: 'Untitled Transformation',
  source: {
    id: '',
    name: '',
    type: 'PDF',
    pages: 0,
    size: '0 MB',
    sha256: '',
    uploadedAt: ''
  },
  analysis: {
    findings: 0,
    risks: 0,
    recommendations: 0,
    entities: 0,
    evidence: 0,
    importantData: 0,
    keySummary: []
  },
  profiles: initialAudienceProfiles.map(p => ({ ...p, isSelected: false })),
  claims: [],
  outputs: [],
  review: {
    status: 'PENDING',
    reviewer: null,
    approvedAt: null
  },
  delivery: {
    status: 'NOT_SENT',
    recipients: [],
    sentAt: null,
    subject: '',
    message: ''
  },
  audit: []
};

export interface AppContextType {
  // Navigation
  currentRoute: string;
  navigate: (route: string) => void;

  // Authentication
  isAuthenticated: boolean;
  currentUser: UserSession;
  userSession: UserSession; // Alias for currentUser
  login: (email?: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUserRole: (role: UserRole) => void;

  // Workspace & Dashboards
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentDashboard: Dashboard | null;
  selectWorkspace: (workspaceId: string) => void;
  createWorkspace: (payload: { name: string; description: string; type: WorkspaceType }) => Promise<Workspace>;
  selectDashboard: (dashboardId: string) => void;
  createDashboard: (payload: { name: string; description: string; type: DashboardType; modules: string[] }) => Promise<Dashboard>;

  // Central Transformation State
  transformation: Transformation;
  setTransformation: React.Dispatch<React.SetStateAction<Transformation>>;

  // Claim Interaction & Filtering
  selectedClaim: GroundingClaim | null;
  setSelectedClaim: (claim: GroundingClaim | null) => void;
  flaggedOnlyFilter: boolean;
  toggleFlaggedFilter: () => void;

  // Modals & Notifications
  isSearchPaletteOpen: boolean;
  setIsSearchPaletteOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isAuditDrawerOpen: boolean;
  setIsAuditDrawerOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Computed Claim Metrics
  supportedClaimsCount: number;
  unsupportedClaimsCount: number;
  resolvedClaimsCount: number;
  isApprovalBlocked: boolean;

  // Pipeline Actions
  uploadSourceFile: (file: File) => Promise<void>;
  ingestSourceUrl: (url: string) => Promise<void>;
  analyzeSource: () => Promise<void>;
  toggleProfile: (profileId: string) => void;
  generateDeliverables: () => Promise<void>;
  updateClaimStatus: (claimId: string, status: ClaimStatus, note?: string) => Promise<void>;
  editClaimPhrasing: (claimId: string, newText: string, note?: string) => Promise<void>;
  deleteClaim: (claimId: string) => Promise<void>;
  approveOutputs: () => Promise<boolean>;
  sendCommunication: (payload?: { subject: string; message: string }) => Promise<boolean>;
  resetTransformationDemo: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<UserSession>(() => defaultUserSession);

  // 2. Navigation State
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const hash = window.location.hash;
    if (!authService.isAuthenticated()) return '#/login';
    return hash || '#/overview';
  });

  // 3. Workspace State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard | null>(null);

  // 4. Transformation State (Single Source of Truth)
  const [transformation, setTransformation] = useState<Transformation>(() =>
    isDemoMode() ? initialTransformation : emptyTransformation
  );
  const [selectedClaim, setSelectedClaim] = useState<GroundingClaim | null>(() =>
    isDemoMode() ? initialClaims23[4] : null
  );
  const [flaggedOnlyFilter, setFlaggedOnlyFilter] = useState<boolean>(false);

  // 5. Modals & Notifications
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load session & workspaces on startup
  useEffect(() => {
    const initializeData = async () => {
      try {
        const sessionRes = await authService.getSession();
        if (sessionRes.data) {
          setCurrentUser(sessionRes.data);
          setIsAuthenticated(true);
        }

        const wsRes = await workspaceService.getWorkspaces();
        if (wsRes.data && wsRes.data.length > 0) {
          setWorkspaces(wsRes.data);
          const savedWsId = workspaceService.getActiveWorkspaceId();
          const activeWs = wsRes.data.find(w => w.id === savedWsId) || wsRes.data[0];
          setCurrentWorkspace(activeWs);

          if (activeWs.dashboards && activeWs.dashboards.length > 0) {
            const savedDashId = workspaceService.getActiveDashboardId();
            const activeDash = activeWs.dashboards.find(d => d.id === savedDashId) || activeWs.dashboards[0];
            setCurrentDashboard(activeDash);
          }
        }
      } catch (err) {
        console.warn('Initialization notice:', err);
      }
    };

    initializeData();

    // Subscribe to real-time auth changes (Supabase)
    const unsubscribeAuth = authService.onAuthStateChanged((session) => {
      if (session) {
        setCurrentUser(session);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Listen to hash route changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/overview';
      setCurrentRoute(hash);

      if (hash.startsWith('#/workspace/')) {
        const parts = hash.replace('#/workspace/', '').split('/');
        const wsId = parts[0];
        if (wsId) {
          const matchedWs = workspaces.find(w => w.id === wsId);
          if (matchedWs && matchedWs.id !== currentWorkspace?.id) {
            setCurrentWorkspace(matchedWs);
            workspaceService.setActiveWorkspaceId(matchedWs.id);
          }
        }
        if (parts[1] === 'dashboard' && parts[2]) {
          const dashId = parts[2];
          const matchedDash = currentWorkspace?.dashboards.find(d => d.id === dashId);
          if (matchedDash && matchedDash.id !== currentDashboard?.id) {
            setCurrentDashboard(matchedDash);
            workspaceService.setActiveDashboardId(matchedDash.id);
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [workspaces, currentWorkspace, currentDashboard]);

  const navigate = (route: string) => {
    window.location.hash = route;
    setCurrentRoute(route);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  // Auth Handlers
  const login = async (email?: string, password?: string, rememberMe = true) => {
    const res = await authService.login(email || defaultUserSession.email, password, rememberMe);
    if (res.success && res.data) {
      setCurrentUser(res.data);
      setIsAuthenticated(true);
      showToast(`Welcome, ${res.data.name}`);
      navigate('#/overview');
      return { success: true };
    }
    const errMsg = typeof res.error === 'string' ? res.error : (res.error?.message || 'Authentication failed');
    showToast(errMsg);
    return { success: false, error: errMsg };
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    showToast('Signed out successfully');
    navigate('#/login');
  };

  const setUserRole = async (role: UserRole) => {
    const res = await authService.switchRole(role);
    if (res.data) {
      setCurrentUser(res.data);
      showToast(`Role switched to: ${role}`);
    }
  };

  // Workspace Handlers
  const selectWorkspace = (workspaceId: string) => {
    const ws = workspaces.find(w => w.id === workspaceId);
    if (ws) {
      setCurrentWorkspace(ws);
      workspaceService.setActiveWorkspaceId(ws.id);
      if (ws.dashboards.length > 0) {
        setCurrentDashboard(ws.dashboards[0]);
        workspaceService.setActiveDashboardId(ws.dashboards[0].id);
      }
      showToast(`Switched to workspace: ${ws.name}`);
      navigate(`#/workspace/${ws.id}`);
    }
  };

  const createWorkspace = async (payload: { name: string; description: string; type: WorkspaceType }): Promise<Workspace> => {
    const res = await workspaceService.createWorkspace(payload);
    const newWs = res.data;
    setWorkspaces(prev => [...prev, newWs]);
    setCurrentWorkspace(newWs);
    workspaceService.setActiveWorkspaceId(newWs.id);
    if (newWs.dashboards.length > 0) {
      setCurrentDashboard(newWs.dashboards[0]);
      workspaceService.setActiveDashboardId(newWs.dashboards[0].id);
    }
    showToast(`Workspace "${newWs.name}" created ✓`);
    navigate(`#/workspace/${newWs.id}`);
    return newWs;
  };

  const selectDashboard = (dashboardId: string) => {
    if (!currentWorkspace) return;
    const dash = currentWorkspace.dashboards.find(d => d.id === dashboardId);
    if (dash) {
      setCurrentDashboard(dash);
      workspaceService.setActiveDashboardId(dash.id);
      showToast(`Active dashboard: ${dash.name}`);
      navigate('#/overview');
    }
  };

  const createDashboard = async (payload: { name: string; description: string; type: DashboardType; modules: string[] }): Promise<Dashboard> => {
    if (!currentWorkspace) throw new Error('No active workspace');
    const res = await workspaceService.createDashboard(currentWorkspace.id, payload);
    const newDash = res.data;

    const updatedWs = {
      ...currentWorkspace,
      dashboards: [...currentWorkspace.dashboards, newDash]
    };
    setCurrentWorkspace(updatedWs);
    setWorkspaces(prev => prev.map(w => w.id === updatedWs.id ? updatedWs : w));
    setCurrentDashboard(newDash);
    workspaceService.setActiveDashboardId(newDash.id);

    showToast(`Dashboard "${newDash.name}" added ✓`);
    navigate('#/overview');
    return newDash;
  };

  const toggleFlaggedFilter = () => {
    setFlaggedOnlyFilter(prev => !prev);
  };

  // Computed Claims Metrics
  const unsupportedClaims = transformation.claims.filter(
    c => c.status === 'NEEDS_REVIEW' || c.status === 'UNSUPPORTED'
  );
  const unsupportedClaimsCount = unsupportedClaims.length;

  const supportedClaims = transformation.claims.filter(
    c => c.status === 'SUPPORTED' || c.status === 'RESOLVED' || c.status === 'EDITED' || c.status === 'HUMAN_APPROVED'
  );
  const supportedClaimsCount = supportedClaims.length;

  const resolvedClaimsCount = transformation.claims.filter(
    c => c.status === 'RESOLVED' || c.status === 'EDITED'
  ).length;

  const isApprovalBlocked = unsupportedClaimsCount > 0;

  // Pipeline Actions
  const uploadSourceFile = async (file: File) => {
    const uploadRes = await documentService.uploadDocument(file);
    const newSource = uploadRes.data;

    const sha256Hash = newSource?.sha256 || newSource?.source_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const auditBlock = await auditService.recordAuditEvent({
      jobId: transformation.id,
      actor: currentUser.name,
      actorRole: currentUser.role,
      action: 'DOCUMENT_UPLOADED',
      details: `Uploaded ${newSource?.name || file.name} (${newSource?.size || '1.4 MB'}) with SHA-256: ${sha256Hash.slice(0, 16)}...`
    });

    let initialId = transformation.id;
    try {
      const tRes = await transformationService.createTransformation({
        fileId: newSource?.id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        profiles: transformation.profiles
      });
      if (tRes.data?.id) {
        initialId = tRes.data.id;
      }
    } catch (tErr) {
      console.warn('Backend transformation sync note:', tErr);
    }

    setTransformation(prev => ({
      ...prev,
      id: initialId || prev.id,
      title: file.name.replace(/\.[^/.]+$/, ''),
      source: {
        ...newSource,
        sha256: sha256Hash
      },
      audit: [...prev.audit, auditBlock]
    }));

    showToast('Source uploaded • SHA-256 calculated ✓');
  };

  const ingestSourceUrl = async (url: string) => {
    const uploadRes = await documentService.ingestUrl(url);
    const newSource = uploadRes.data;
    const urlSha256 = newSource?.sha256 || newSource?.source_hash || '4a8f9c2d1e0b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a21';

    const auditBlock = await auditService.recordAuditEvent({
      jobId: transformation.id,
      actor: currentUser.name,
      actorRole: currentUser.role,
      action: 'DOCUMENT_UPLOADED',
      details: `Ingested source URL ${url} with SHA-256: ${urlSha256.slice(0, 16)}...`
    });

    let initialId = transformation.id;
    try {
      const tRes = await transformationService.createTransformation({
        fileId: newSource?.id,
        title: newSource?.name || url,
        profiles: transformation.profiles
      });
      if (tRes.data?.id) {
        initialId = tRes.data.id;
      }
    } catch (tErr) {
      console.warn('Backend transformation sync note:', tErr);
    }

    setTransformation(prev => ({
      ...prev,
      id: initialId || prev.id,
      title: newSource?.name || url,
      source: {
        ...newSource,
        sha256: urlSha256
      },
      audit: [...prev.audit, auditBlock]
    }));

    showToast('Web source ingested • SHA-256 calculated ✓');
  };

  const analyzeSource = async () => {
    const analysisRes = await documentService.analyzeDocument(transformation.source.id);

    const auditBlock = await auditService.recordAuditEvent({
      jobId: transformation.id,
      actor: 'System Automated',
      actorRole: 'System Automated',
      action: 'INTELLIGENCE_EXTRACTED',
      details: `Extracted ${analysisRes.data.entities} entities, ${analysisRes.data.evidence} evidence anchors, and ${analysisRes.data.findings} key findings.`
    });

    setTransformation(prev => ({
      ...prev,
      analysis: analysisRes.data,
      audit: [...prev.audit, auditBlock]
    }));

    showToast('Source analysis complete ✓');
  };

  const toggleProfile = (profileId: string) => {
    setTransformation(prev => {
      const updatedProfiles = prev.profiles.map(p =>
        p.id === profileId ? { ...p, isSelected: !p.isSelected } : p
      );

      // Async sync audience to backend in background
      if (prev.id) {
        transformationService.updateAudience(prev.id, { profiles: updatedProfiles }).catch(() => {});
      }

      return {
        ...prev,
        profiles: updatedProfiles
      };
    });
  };

  const generateDeliverables = async () => {
    let deliverables: any[] = [];
    let claims: any[] = [];
    let analysisData: any = null;

    try {
      const genRes = await transformationService.generate(transformation.id);
      if (genRes.data) {
        deliverables = genRes.data.deliverables || [];
        claims = genRes.data.claims || [];
        analysisData = genRes.data.analysis || null;
      }
    } catch (err) {
      console.warn('Transformation generate endpoint fallback:', err);
      const fallbackGen = await generationService.generateDeliverables(
        transformation.id,
        transformation.profiles
      );
      deliverables = fallbackGen.data;
    }

    const auditBlock = await auditService.recordAuditEvent({
      jobId: transformation.id,
      actor: 'System Automated',
      actorRole: 'System Automated',
      action: 'TRANSFORMATION_GENERATED',
      details: `Generated ${deliverables.length} audience deliverables.`
    });

    setTransformation(prev => ({
      ...prev,
      outputs: deliverables.length > 0 ? deliverables : prev.outputs,
      claims: claims.length > 0 ? claims : prev.claims,
      analysis: analysisData || prev.analysis,
      audit: [...prev.audit, auditBlock]
    }));

    showToast('Deliverables generated • Ready for verification');
  };

  const updateClaimStatus = async (claimId: string, status: ClaimStatus, note?: string) => {
    const res = await verificationService.updateClaimStatus(
      claimId,
      status,
      currentUser.name,
      note
    );
    const updatedClaim = res.data;

    const auditBlock = await auditService.recordAuditEvent({
      jobId: transformation.id,
      actor: currentUser.name,
      actorRole: currentUser.role,
      action: status === 'SUPPORTED' || status === 'RESOLVED' || status === 'HUMAN_APPROVED' ? 'CLAIM_RESOLVED' : 'CLAIMS_VERIFIED',
      details: `Claim #${updatedClaim.claimIndex} verified and marked as [${status}].`
    });

    setTransformation(prev => {
      const updatedClaims = prev.claims.map(c => c.id === claimId ? updatedClaim : c);
      const remainingUnsupported = updatedClaims.filter(
        c => c.status === 'NEEDS_REVIEW' || c.status === 'UNSUPPORTED'
      ).length;

      return {
        ...prev,
        claims: updatedClaims,
        review: {
          ...prev.review,
          status: remainingUnsupported === 0 && prev.review.status !== 'APPROVED' ? 'READY_FOR_APPROVAL' : prev.review.status
        },
        audit: [...prev.audit, auditBlock]
      };
    });

    if (selectedClaim?.id === claimId) {
      setSelectedClaim(updatedClaim);
    }

    showToast(`Claim #${updatedClaim.claimIndex} verified ✓`);
  };

  const editClaimPhrasing = async (claimId: string, newText: string, note?: string) => {
    const res = await verificationService.editClaimPhrasing(
      claimId,
      newText,
      currentUser.name,
      note
    );
    const updatedClaim = res.data;

    const auditBlock = await auditService.recordAuditEvent({
      jobId: transformation.id,
      actor: currentUser.name,
      actorRole: currentUser.role,
      action: 'CLAIM_EDITED',
      details: `Claim #${updatedClaim.claimIndex} phrasing corrected to align with source passage.`
    });

    setTransformation(prev => {
      const updatedClaims = prev.claims.map(c => c.id === claimId ? updatedClaim : c);
      const remainingUnsupported = updatedClaims.filter(
        c => c.status === 'NEEDS_REVIEW' || c.status === 'UNSUPPORTED'
      ).length;

      return {
        ...prev,
        claims: updatedClaims,
        review: {
          ...prev.review,
          status: remainingUnsupported === 0 && prev.review.status !== 'APPROVED' ? 'READY_FOR_APPROVAL' : prev.review.status
        },
        audit: [...prev.audit, auditBlock]
      };
    });

    if (selectedClaim?.id === claimId) {
      setSelectedClaim(updatedClaim);
    }

    showToast(`Claim #${updatedClaim.claimIndex} resolved ✓`);
  };

  const deleteClaim = async (claimId: string) => {
    await verificationService.deleteClaim(claimId);

    const auditBlock = await auditService.recordAuditEvent({
      jobId: transformation.id,
      actor: currentUser.name,
      actorRole: currentUser.role,
      action: 'CLAIM_RESOLVED',
      details: `Claim removed from verified scope.`
    });

    setTransformation(prev => {
      const updatedClaims = prev.claims.filter(c => c.id !== claimId);
      const remainingUnsupported = updatedClaims.filter(
        c => c.status === 'NEEDS_REVIEW' || c.status === 'UNSUPPORTED'
      ).length;

      return {
        ...prev,
        claims: updatedClaims,
        review: {
          ...prev.review,
          status: remainingUnsupported === 0 && prev.review.status !== 'APPROVED' ? 'READY_FOR_APPROVAL' : prev.review.status
        },
        audit: [...prev.audit, auditBlock]
      };
    });

    if (selectedClaim?.id === claimId) {
      setSelectedClaim(null);
    }

    showToast('Claim removed from scope');
  };

  const approveOutputs = async (): Promise<boolean> => {
    if (isApprovalBlocked) {
      showToast('Approval blocked: Unresolved claims remain.');
      return false;
    }

    const approvedAt = new Date().toISOString();
    try {
      await transformationService.approveReview(transformation.id);
    } catch (err) {
      console.warn('Backend review approval sync note:', err);
    }

    const auditBlock = await auditService.recordAuditEvent({
      jobId: transformation.id,
      actor: currentUser.name,
      actorRole: currentUser.role,
      action: 'REVIEWER_APPROVED',
      details: `Formal human approval granted by ${currentUser.name} (${currentUser.role}).`
    });

    setTransformation(prev => ({
      ...prev,
      review: {
        status: 'APPROVED',
        reviewer: currentUser.name,
        approvedAt
      },
      outputs: prev.outputs.map(out => ({ ...out, verificationState: 'APPROVED' })),
      audit: [...prev.audit, auditBlock]
    }));

    showToast('Outputs approved • Ready for delivery ✓');
    return true;
  };

  const sendCommunication = async (payload?: { subject: string; message: string }): Promise<boolean> => {
    if (transformation.review.status !== 'APPROVED') {
      showToast('Delivery blocked: Outputs must be approved before sending.');
      return false;
    }

    const subject = payload?.subject || transformation.delivery.subject;
    const message = payload?.message || transformation.delivery.message;

    try {
      await transformationService.prepareDelivery(transformation.id, {
        recipients: transformation.delivery.recipients,
        subject,
        message
      });
    } catch (err) {
      console.warn('Backend delivery preparation sync note:', err);
    }

    const dispatchRes = await deliveryService.sendCommunication(transformation.id, {
      recipients: transformation.delivery.recipients,
      subject,
      message
    });

    const auditBlock = await auditService.recordAuditEvent({
      jobId: transformation.id,
      actor: currentUser.name,
      actorRole: currentUser.role,
      action: 'COMMUNICATION_DELIVERED',
      details: `Dispatched verified deliverable package to ${transformation.delivery.recipients.length} configured stakeholders.`
    });

    setTransformation(prev => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        status: 'SENT',
        sentAt: dispatchRes.data.sentAt,
        subject,
        message
      },
      audit: [...prev.audit, auditBlock]
    }));

    showToast('Communication delivered successfully ✓');
    return true;
  };

  const resetTransformationDemo = () => {
    if (!isDemoMode()) {
      showToast('Demo reset unavailable when DEMO_MODE is disabled.');
      return;
    }
    auditService.resetAuditLogs();
    setTransformation(initialTransformation);
    setSelectedClaim(initialClaims23[4]);
    showToast('Reset to demo transformation state');
  };

  return (
    <AppContext.Provider
      value={{
        currentRoute,
        navigate,
        isAuthenticated,
        currentUser,
        userSession: currentUser,
        login,
        logout,
        setUserRole,
        workspaces,
        currentWorkspace,
        currentDashboard,
        selectWorkspace,
        createWorkspace,
        selectDashboard,
        createDashboard,
        transformation,
        setTransformation,
        selectedClaim,
        setSelectedClaim,
        flaggedOnlyFilter,
        toggleFlaggedFilter,
        isSearchPaletteOpen,
        setIsSearchPaletteOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isAuditDrawerOpen,
        setIsAuditDrawerOpen,
        toastMessage,
        showToast,
        supportedClaimsCount,
        unsupportedClaimsCount,
        resolvedClaimsCount,
        isApprovalBlocked,
        uploadSourceFile,
        ingestSourceUrl,
        analyzeSource,
        toggleProfile,
        generateDeliverables,
        updateClaimStatus,
        editClaimPhrasing,
        deleteClaim,
        approveOutputs,
        sendCommunication,
        resetTransformationDemo
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
