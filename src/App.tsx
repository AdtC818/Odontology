// src/App.tsx
import React, { useEffect, useState } from 'react';
import {
  InternalDashboardLayout,
  InternalNavigationView,
} from './app/layouts/InternalDashboardLayout';
import { useAuth, useSessionDraft } from './modules/users-auth/ui/hooks';
import {
  LoginPage,
  PasswordRecoveryPage,
  RolesManagementPage,
  UsersManagementPage,
} from './modules/users-auth/ui/views';
import { RoleExtendedViewDTO } from './modules/users-auth/ui/views/RolesManagementPage';

type AppRoute =
  | 'LOGIN'
  | 'RECOVERY'
  | 'PUBLIC_BOOKING'
  | 'INTERNAL_DASHBOARD';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('LOGIN');
  const [internalView, setInternalView] =
    useState<InternalNavigationView>('USERS');
  const [catalogRoles, setCatalogRoles] = useState<
    RoleExtendedViewDTO[] | undefined
  >(undefined);
  const [rbacBlockedMessage, setRbacBlockedMessage] = useState<string | null>(
    null
  );

  const { drafts, saveDraftForUser, discardDraft } = useSessionDraft(null);

  const auth = useAuth({
    apiBaseUrl: '/api/v1',
    onInactivityAutoSaveDraft: (idUsuario, draft) => {
      saveDraftForUser(idUsuario, draft.formularioId, draft.datosBorrador);
    },
  });

  const userDraftHook = useSessionDraft(auth.session?.usuario.idUsuario);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('token')) {
        setCurrentRoute('RECOVERY');
        return;
      }
    }
    if (auth.isAuthenticated) {
      setCurrentRoute('INTERNAL_DASHBOARD');
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    auth
      .fetchRoles()
      .then((loadedRoles) => {
        if (loadedRoles.length > 0) {
          setCatalogRoles(loadedRoles);
        }
      })
      .catch(() => {
        // Conserva los roles semilla si aún no existen registros adicionales
      });
  }, [auth.isAuthenticated, auth.fetchRoles]);

  if (currentRoute === 'PUBLIC_BOOKING') {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F8F9FA] text-[#1E242B]">
        <header className="w-full border-b border-[#E2E6EA] bg-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-lg font-extrabold text-[#1E242B]">
              Portal Público OdontoLeal (RF-USR-006)
            </span>
            <span className="block text-[13px] font-bold text-[#D4AF37]">
              SECCIÓN PÚBLICA SIN INICIO DE SESIÓN
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentRoute('LOGIN')}
            className="min-h-[44px] rounded-xl bg-[#D4AF37] px-5 py-2 text-sm font-bold text-[#111111] hover:bg-[#B8942A]"
          >
            Acceso Personal del Consultorio →
          </button>
        </header>

        <main className="mx-auto max-w-2xl p-6 text-center space-y-4">
          <div className="rounded-3xl border border-[#E2E6EA] border-t-4 border-t-[#D4AF37] bg-white p-8 shadow-md">
            <h1 className="text-2xl font-extrabold text-[#1E242B]">
              Solicitud Pública de Citas (ROL-PAC)
            </h1>
            <p className="mt-2 text-sm text-[#687380]">
              Esta página carga sin pedir credenciales y permite elegir el servicio sin exponer datos de otros pacientes (RF-USR-006 / RQNF-SEG-008).
            </p>
            <button
              type="button"
              onClick={() => setCurrentRoute('LOGIN')}
              className="mt-6 min-h-[46px] rounded-xl border border-[#E2E6EA] bg-[#F8F9FA] px-6 py-2.5 text-sm font-bold text-[#1E242B] hover:border-[#D4AF37]"
            >
              ← Volver al Inicio de Sesión
            </button>
          </div>
        </main>

        <footer className="border-t border-[#E2E6EA] bg-white py-4 text-center text-[13px] text-[#687380]">
          © 2026 OdontoLeal • Aviso de Privacidad (RQNF-SEG-006)
        </footer>
      </div>
    );
  }

  if (currentRoute === 'RECOVERY') {
    return (
      <PasswordRecoveryPage
        onRequestRecoveryLink={auth.requestPasswordRecovery}
        onResetPassword={auth.resetPasswordWithToken}
        onNavigateToLogin={() => setCurrentRoute('LOGIN')}
        onNavigateToPublicBooking={() => setCurrentRoute('PUBLIC_BOOKING')}
      />
    );
  }

  if (!auth.session || currentRoute === 'LOGIN') {
    return (
      <LoginPage
        onAuthenticate={auth.authenticate}
        onLoginSuccess={(sessionData) => {
          auth.setActiveSession(sessionData);
          setCurrentRoute('INTERNAL_DASHBOARD');
        }}
        onNavigateToRecovery={() => setCurrentRoute('RECOVERY')}
        onNavigateToPublicBooking={() => setCurrentRoute('PUBLIC_BOOKING')}
        pendingDraftsOnLogin={drafts}
        onDiscardDraft={discardDraft}
      />
    );
  }

  const canAccessUsersModule =
    auth.hasPermission('RF-USR-004') || auth.hasPermission('RF-USR-001');
  const canAccessRolesModule =
    auth.hasPermission('RF-USR-007') || auth.hasPermission('RF-USR-010');

  return (
    <InternalDashboardLayout
      currentUser={auth.session.usuario}
      activeView={internalView}
      onSelectView={(view) => {
        setRbacBlockedMessage(null);
        if (view === 'USERS' && !canAccessUsersModule) {
          setRbacBlockedMessage('No tiene permiso para realizar esta acción');
          return;
        }
        if (view === 'ROLES' && !canAccessRolesModule) {
          setRbacBlockedMessage('No tiene permiso para realizar esta acción');
          return;
        }
        setInternalView(view);
      }}
      isWarningModalOpen={auth.isWarningModalOpen}
      hasUnsavedChanges={Boolean(auth.unsavedFormDraft)}
      onContinueSession={auth.continueSessionAfterWarning}
      onTimeoutCloseSession={() => {
        auth.logout('INACTIVITY_TIMEOUT', true);
        setCurrentRoute('LOGIN');
      }}
      onManualCloseSession={async () => {
        const res = await auth.logout('MANUAL', false);
        if (res.requiresConfirmation) {
          const confirmed = window.confirm(res.message);
          if (confirmed) {
            await auth.logout('MANUAL', true);
            setCurrentRoute('LOGIN');
          }
          return;
        }
        setCurrentRoute('LOGIN');
      }}
      onSimulateMinute29={auth.simulateMinute29Warning}
    >
      {rbacBlockedMessage ? (
        <div className="p-8">
          <div
            role="alert"
            className="mx-auto max-w-xl rounded-2xl border border-[#B91C1C]/30 bg-[#FEE2E2] p-6 text-center text-[#B91C1C]"
          >
            <p className="text-lg font-extrabold">
              🔒 {rbacBlockedMessage} (RQNF-SEG-003)
            </p>
          </div>
        </div>
      ) : internalView === 'USERS' ? (
        <UsersManagementPage
          initialRoles={catalogRoles}
          savedUserDraft={userDraftHook.getDraftByFormId('USER_FORM')}
          onDiscardUserDraft={() => userDraftHook.discardDraft('USER_FORM')}
          onSearchUsers={auth.searchUsers}
          onCreateUser={auth.createUser}
          onUpdateUser={auth.updateUser}
          onToggleUserStatus={auth.toggleUserStatus}
        />
      ) : internalView === 'ROLES' ? (
        <RolesManagementPage
          initialRoles={catalogRoles}
          onCreateRole={auth.createRole}
          onUpdateRole={auth.updateRole}
          onDeleteRole={auth.deleteRole}
        />
      ) : (
        <div className="p-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-[#E2E6EA] bg-white p-8 text-center space-y-2 shadow-2xs">
            <span className="inline-flex items-center rounded-full bg-[#FBF6E6] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#B8942A]">
              MÓDULO EN CONSTRUCCIÓN
            </span>
            <h2 className="text-xl font-extrabold text-[#1E242B]">
              Vista seleccionada: {internalView}
            </h2>
            <p className="text-sm text-[#687380]">
              El Módulo A (Doctores y Roles/Permisos) se encuentra operativo. Seleccione &ldquo;Doctores&rdquo; o &ldquo;Roles y permisos&rdquo; en el menú lateral para continuar.
            </p>
          </div>
        </div>
      )}
    </InternalDashboardLayout>
  );
};

export default App;