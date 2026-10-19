// src/app/layouts/InternalDashboardLayout.tsx
import React, { useState } from 'react';
import { UserWithRolesDomainDTO } from '../../modules/users-auth/domain/user.repository.interface';
import { InactivityWarningModal } from '../../modules/users-auth/ui/components/InactivityWarningModal';

export type InternalNavigationView = 'USERS' | 'ROLES';

export interface InternalDashboardLayoutProps {
  currentUser: UserWithRolesDomainDTO;
  activeView: InternalNavigationView;
  onSelectView: (view: InternalNavigationView) => void;
  isWarningModalOpen: boolean;
  hasUnsavedChanges?: boolean;
  onContinueSession: () => void;
  onTimeoutCloseSession: () => void;
  onManualCloseSession: () => void;
  onSimulateMinute29?: () => void;
  children: React.ReactNode;
}

export const InternalDashboardLayout: React.FC<InternalDashboardLayoutProps> = ({
  currentUser,
  activeView,
  onSelectView,
  isWarningModalOpen,
  hasUnsavedChanges = false,
  onContinueSession,
  onTimeoutCloseSession,
  onManualCloseSession,
  onSimulateMinute29,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8F9FA] text-[#1E242B] overflow-x-hidden">
      {/* Barra Lateral Izquierda (#111111 con acento Dorado #D4AF37 según Manual de Estilos) */}
      <aside className="w-full lg:w-[270px] shrink-0 bg-[#111111] text-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#E2E6EA]/15">
        <div>
          {/* Marca del Consultorio */}
          <div className="flex items-center justify-between px-5 py-4 lg:py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37] text-[#D4AF37] font-extrabold"
                aria-hidden="true"
              >
                OL
              </div>
              <div>
                <span className="block text-base font-extrabold tracking-tight text-white">
                  Portal OdontoLeal
                </span>
                <span className="block text-[13px] font-bold uppercase tracking-wider text-[#D4AF37]">
                  DR. EDUAR LEAL
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Alternar menú de navegación"
              className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl border border-white/20 text-white flex items-center justify-center"
            >
              ☰
            </button>
          </div>

          {/* Menú de navegación del Módulo A */}
          <nav
            aria-label="Menú principal del sistema"
            className={`${
              mobileMenuOpen ? 'block' : 'hidden'
            } lg:block p-4 space-y-2`}
          >
            <p className="px-3 text-[13px] font-bold uppercase tracking-wider text-[#C4C9CF]">
              Módulo A: Usuarios y Roles
            </p>

            <button
              type="button"
              onClick={() => {
                onSelectView('USERS');
                setMobileMenuOpen(false);
              }}
              className={`w-full min-h-[46px] flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                activeView === 'USERS'
                  ? 'bg-[#D4AF37] text-[#111111] shadow-sm'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <span>👤 Gestión de Usuarios</span>
              <span className="text-[13px] font-mono opacity-80">RF-001..004</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectView('ROLES');
                setMobileMenuOpen(false);
              }}
              className={`w-full min-h-[46px] flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                activeView === 'ROLES'
                  ? 'bg-[#D4AF37] text-[#111111] shadow-sm'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <span>🛡 Roles y Permisos (JSON)</span>
              <span className="text-[13px] font-mono opacity-80">RF-007..011</span>
            </button>

            {onSimulateMinute29 && (
              <div className="pt-4 mt-4 border-t border-white/10">
                <p className="px-3 mb-2 text-[13px] font-semibold text-[#C4C9CF]">
                  Herramienta de Verificación SQA:
                </p>
                <button
                  type="button"
                  onClick={onSimulateMinute29}
                  className="w-full min-h-[44px] rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3.5 py-2 text-left text-[13px] font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors"
                >
                  ⏱ Simular Aviso Minuto 29 (RF-USR-008)
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Pie del Sidebar */}
        <div className="hidden lg:block p-4 border-t border-white/10 text-[13px] text-[#C4C9CF]">
          <p className="font-semibold text-white">Sesión activa protegida</p>
          <p className="mt-0.5">Cierre automático tras 30 min sin uso (RF-USR-008).</p>
        </div>
      </aside>

      {/* Contenedor Derecho: Barra Superior + Área de Trabajo */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Cabecera Superior Interna con opción "Cerrar sesión" siempre visible (RF-USR-008) */}
        <header className="w-full bg-white border-b border-[#E2E6EA] px-4 py-3.5 sm:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#FBF6E6] border border-[#D4AF37] flex items-center justify-center font-bold text-[#1E242B]">
              {currentUser.nombreCompleto.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[#1E242B]">
                  {currentUser.nombreCompleto}
                </span>
                <span className="rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[13px] font-bold text-[#15803D]">
                  ✓ Sesión Activa
                </span>
              </div>
              <p className="text-[13px] text-[#687380]">
                {currentUser.correo} • Roles:{' '}
                {currentUser.roles
                  .filter((r) => r.estadoAsignacion)
                  .map((r) => r.nombreRol)
                  .join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onManualCloseSession}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[#B91C1C]/30 bg-[#FEE2E2] px-4 py-2 text-[13px] font-bold text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C] transition-colors"
            >
              <span>Cerrar sesión</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </header>

        {/* Vista Activa */}
        <main className="flex-1">{children}</main>
      </div>

      {/* Modal de Advertencia al Minuto 29 de Inactividad (RF-USR-008) */}
      <InactivityWarningModal
        isOpen={isWarningModalOpen}
        initialSecondsRemaining={60}
        hasUnsavedChanges={hasUnsavedChanges}
        onContinueSession={onContinueSession}
        onTimeoutCloseSession={onTimeoutCloseSession}
        onManualCloseSession={onManualCloseSession}
      />
    </div>
  );
};