import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActiveAppointmentSummaryDTO,
  RoleDTO,
  SearchUsersFilterDTO,
  SessionDraftDTO,
  UserWithRolesDomainDTO,
} from '../../domain/user.repository.interface';
import { UserFormModal, UserFormSubmitPayload } from '../components/UserFormModal';

export interface UsersManagementPageProps {
  currentAdminUsername?: string;
  initialUsers?: UserWithRolesDomainDTO[];
  initialRoles?: RoleDTO[];
  savedUserDraft?: SessionDraftDTO | null;
  onDiscardUserDraft?: () => void;
  onSearchUsers?: (filters: SearchUsersFilterDTO) => Promise<{
    message?: string;
    data: UserWithRolesDomainDTO[];
  }>;
  onCreateUser?: (payload: UserFormSubmitPayload) => Promise<{
    message: string;
    data: UserWithRolesDomainDTO;
  }>;
  onUpdateUser?: (payload: UserFormSubmitPayload) => Promise<{
    message: string;
    data: UserWithRolesDomainDTO;
  }>;
  onToggleUserStatus?: (
    idUsuario: number,
    nuevoEstado: boolean
  ) => Promise<{
    message: string;
    data: UserWithRolesDomainDTO;
  }>;
}

const DEFAULT_ROLES_FALLBACK: RoleDTO[] = [
  { id_rol: 1, codigo: 'ROL-ADM', nombre_rol: 'Administrador del Sistema' },
  { id_rol: 2, codigo: 'ROL-ODO', nombre_rol: 'Odontólogo General' },
  { id_rol: 3, codigo: 'ROL-ESP', nombre_rol: 'Especialista en Ortodoncia' },
  { id_rol: 4, codigo: 'ROL-COA', nombre_rol: 'Coordinadora de Agendamiento' },
  { id_rol: 5, codigo: 'ROL-AUX', nombre_rol: 'Auxiliar de Odontología' },
];

export const UsersManagementPage: React.FC<UsersManagementPageProps> = ({
  initialUsers = [],
  initialRoles = DEFAULT_ROLES_FALLBACK,
  savedUserDraft,
  onDiscardUserDraft,
  onSearchUsers,
  onCreateUser,
  onUpdateUser,
  onToggleUserStatus,
}) => {
  const [users, setUsers] = useState<UserWithRolesDomainDTO[]>(initialUsers);
  const [roles, setRoles] = useState<RoleDTO[]>(initialRoles);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Estados de filtros combinados (RF-USR-004)
  const [documentoFilter, setDocumentoFilter] = useState('');
  const [nombreFilter, setNombreFilter] = useState('');
  const [rolIdFilter, setRolIdFilter] = useState<string>('ALL');
  const [estadoFilter, setEstadoFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Mensajes de feedback
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [emptySearchMessage, setEmptySearchMessage] = useState<string | null>(null);

  // Estados del modal de Crear / Editar (RF-USR-001 / RF-USR-002)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedUser, setSelectedUser] = useState<UserWithRolesDomainDTO | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [modalServerError, setModalServerError] = useState<string | null>(null);
  const [conflictingAppointments, setConflictingAppointments] = useState<
    ActiveAppointmentSummaryDTO[]
  >([]);

  const normalizeText = (text: string): string =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const executeSearch = useCallback(async () => {
    setIsLoading(true);
    setBannerError(null);
    setEmptySearchMessage(null);

    const estadoBoolean =
      estadoFilter === 'ALL' ? undefined : estadoFilter === 'ACTIVE';
    const idRolNumber = rolIdFilter === 'ALL' ? undefined : Number(rolIdFilter);

    try {
      if (onSearchUsers) {
        const result = await onSearchUsers({
          documento: documentoFilter.trim() || undefined,
          nombre: nombreFilter.trim() || undefined,
          idRol: idRolNumber,
          estado: estadoBoolean,
        });
        setUsers(result.data);
        if (result.data.length === 0) {
          setEmptySearchMessage(result.message || 'ninguna coincidencia encontrada');
        }
      } else if (initialUsers.length > 0) {
        // Filtrado local con las reglas exactas de RF-USR-004
        const filtered = initialUsers
          .filter((u) => {
            if (
              documentoFilter.trim() &&
              u.documentoIdentidad !== documentoFilter.trim()
            ) {
              return false;
            }
            if (
              nombreFilter.trim() &&
              !normalizeText(u.nombreCompleto).includes(normalizeText(nombreFilter))
            ) {
              return false;
            }
            if (
              idRolNumber !== undefined &&
              !u.roles.some(
                (r) => r.estadoAsignacion && Number(r.idRol) === idRolNumber
              )
            ) {
              return false;
            }
            if (estadoBoolean !== undefined && u.estado !== estadoBoolean) {
              return false;
            }
            return true;
          })
          .sort((a, b) =>
            a.nombreCompleto.localeCompare(b.nombreCompleto, 'es-CO', {
              sensitivity: 'base',
            })
          );

        setUsers(filtered);
        if (filtered.length === 0) {
          setEmptySearchMessage('ninguna coincidencia encontrada');
        }
      } else {
        const params = new URLSearchParams();
        if (documentoFilter.trim()) params.set('documento', documentoFilter.trim());
        if (nombreFilter.trim()) params.set('nombre', nombreFilter.trim());
        if (estadoBoolean !== undefined) params.set('estado', String(estadoBoolean));

        const res = await fetch(`/api/users-auth/users?${params.toString()}`);
        const body = await res.json();
        const list: UserWithRolesDomainDTO[] = Array.isArray(body.data)
          ? body.data
          : [];

        const filteredByRole =
          idRolNumber !== undefined
            ? list.filter((u) =>
                u.roles.some(
                  (r) => r.estadoAsignacion && Number(r.idRol) === idRolNumber
                )
              )
            : list;

        setUsers(filteredByRole);
        if (filteredByRole.length === 0) {
          setEmptySearchMessage('ninguna coincidencia encontrada');
        }
      }
    } catch (error: any) {
      setBannerError(error?.message || 'Error al consultar la lista de usuarios.');
    } finally {
      setIsLoading(false);
    }
  }, [documentoFilter, nombreFilter, rolIdFilter, estadoFilter, onSearchUsers, initialUsers]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  useEffect(() => {
    if (initialRoles.length > 0) {
      setRoles(initialRoles);
    }
  }, [initialRoles]);

  const activeUsersCount = useMemo(
    () => users.filter((u) => u.estado).length,
    [users]
  );

  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setSelectedUser(null);
    setModalServerError(null);
    setConflictingAppointments([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserWithRolesDomainDTO) => {
    setModalMode('EDIT');
    setSelectedUser(user);
    setModalServerError(null);
    setConflictingAppointments([]);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (payload: UserFormSubmitPayload) => {
    setIsSubmittingModal(true);
    setModalServerError(null);
    setConflictingAppointments([]);
    setBannerSuccess(null);

    try {
      if (modalMode === 'CREATE') {
        if (onCreateUser) {
          const result = await onCreateUser(payload);
          setBannerSuccess(result.message);
        } else {
          const res = await fetch('/api/users-auth/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              contrasenaHash: payload.contrasenaTemporal,
            }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.message);
          setBannerSuccess(body.message || 'Usuario creado en estado Activo.');
        }
      } else {
        if (onUpdateUser) {
          const result = await onUpdateUser(payload);
          setBannerSuccess(result.message);
        } else {
          const res = await fetch(`/api/users-auth/users/${payload.idUsuario}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const body = await res.json();
          if (!res.ok) {
            if (Array.isArray(body.citasPendientes)) {
              setConflictingAppointments(body.citasPendientes);
            }
            throw new Error(body.message);
          }
          setBannerSuccess(body.message || 'Datos del usuario actualizados exitosamente.');
        }
      }

      setIsModalOpen(false);
      await executeSearch();
    } catch (error: any) {
      setModalServerError(
        error?.message || 'No fue posible guardar los datos del usuario.'
      );
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleToggleStatus = async (user: UserWithRolesDomainDTO) => {
    setBannerError(null);
    setBannerSuccess(null);
    const nuevoEstado = !user.estado;

    try {
      if (onToggleUserStatus) {
        const result = await onToggleUserStatus(user.idUsuario, nuevoEstado);
        setBannerSuccess(result.message);
      } else {
        const res = await fetch(`/api/users-auth/users/${user.idUsuario}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: nuevoEstado }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message);
        setBannerSuccess(
          body.message ||
            `Usuario ${nuevoEstado ? 'activado' : 'inactivado'} exitosamente.`
        );
      }
      await executeSearch();
    } catch (error: any) {
      setBannerError(
        error?.message ||
          'No se pudo cambiar el estado del usuario (verifique si es el último administrador o tiene citas activas).'
      );
    }
  };

  const handleClearFilters = () => {
    setDocumentoFilter('');
    setNombreFilter('');
    setRolIdFilter('ALL');
    setEstadoFilter('ALL');
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] text-[#1E242B] p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabecera del Módulo */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#E2E6EA] bg-white p-5 sm:p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[#111111] px-2.5 py-1 text-[13px] font-mono font-bold text-[#D4AF37]">
                MÓDULO A
              </span>
              <span className="text-[13px] font-semibold text-[#687380]">
                RF-USR-001 a RF-USR-004
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#1E242B]">
              Administración de Usuarios
            </h1>
            <p className="mt-1 text-[13px] sm:text-sm text-[#687380]">
              Gestione las cuentas del personal del consultorio, sus roles asignados y firmas digitalizadas. Los usuarios no se eliminan; se activan o inactivan conservando su autoría (RF-USR-003).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B8942A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] transition-colors"
            >
              <span className="text-lg leading-none" aria-hidden="true">
                +
              </span>
              <span>Registrar Nuevo Usuario</span>
            </button>
          </div>
        </header>

        {/* Aviso de borrador pendiente por cierre automático en minuto 30 (RF-USR-008) */}
        {savedUserDraft && (
          <div
            role="region"
            aria-label="Borrador de usuario disponible"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#1D4ED8]/30 bg-[#DBEAFE] p-4 text-[13px] sm:text-sm text-[#1D4ED8]"
          >
            <div>
              <p className="font-bold">
                💾 Tiene un borrador sin guardar del formulario de usuarios (RF-USR-008)
              </p>
              <p className="mt-0.5">
                Conservado tras el cierre automático de su sesión anterior. Puede abrir el formulario para revisarlo o descartarlo.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="min-h-[44px] rounded-xl bg-[#1D4ED8] px-4 py-2 text-[13px] font-bold text-white hover:opacity-95"
              >
                Revisar borrador
              </button>
              {onDiscardUserDraft && (
                <button
                  type="button"
                  onClick={onDiscardUserDraft}
                  className="min-h-[44px] rounded-xl border border-[#1D4ED8]/40 bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1D4ED8]"
                >
                  Descartar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Alertas Semánticas Globales (RQNF-USA-001: Color + Ícono + Texto) */}
        {bannerSuccess && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-2xl border border-[#15803D]/30 bg-[#DCFCE7] px-5 py-4 text-sm font-semibold text-[#15803D]"
          >
            <span>✓ Confirmación: {bannerSuccess}</span>
            <button
              type="button"
              onClick={() => setBannerSuccess(null)}
              aria-label="Cerrar mensaje de confirmación"
              className="min-h-[36px] px-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {bannerError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-2xl border border-[#B91C1C]/30 bg-[#FEE2E2] px-5 py-4 text-sm font-semibold text-[#B91C1C]"
          >
            <span>✕ Restricción de negocio: {bannerError}</span>
            <button
              type="button"
              onClick={() => setBannerError(null)}
              aria-label="Cerrar mensaje de error"
              className="min-h-[36px] px-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Barra de Búsqueda y Filtros Combinados (RF-USR-004) */}
        <section
          aria-label="Filtros de búsqueda de usuarios"
          className="rounded-2xl border border-[#E2E6EA] bg-white p-5 shadow-xs space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por Documento Exacto */}
            <div>
              <label
                htmlFor="filter-user-doc"
                className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
              >
                Documento (Exacto)
              </label>
              <input
                id="filter-user-doc"
                type="text"
                inputMode="numeric"
                value={documentoFilter}
                onChange={(e) => setDocumentoFilter(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 1098765432"
                className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-[#F3F5F7] px-3.5 py-2 text-sm text-[#1E242B] placeholder-[#687380] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>

            {/* Filtro por Nombre (Insensible a mayúsculas y tildes) */}
            <div>
              <label
                htmlFor="filter-user-name"
                className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
              >
                Nombre (Completo o parcial)
              </label>
              <input
                id="filter-user-name"
                type="search"
                value={nombreFilter}
                onChange={(e) => setNombreFilter(e.target.value)}
                placeholder="Ej. diaz / Natalia Díaz"
                className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-[#F3F5F7] px-3.5 py-2 text-sm text-[#1E242B] placeholder-[#687380] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>

            {/* Filtro por Rol */}
            <div>
              <label
                htmlFor="filter-user-role"
                className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
              >
                Rol Asignado
              </label>
              <select
                id="filter-user-role"
                value={rolIdFilter}
                onChange={(e) => setRolIdFilter(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-[#F3F5F7] px-3.5 py-2 text-sm text-[#1E242B] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
              >
                <option value="ALL">Todos los roles</option>
                {roles
                  .filter((r) => r.codigo !== 'ROL-PAC')
                  .map((r) => (
                    <option key={r.id_rol} value={String(r.id_rol)}>
                      {r.nombre_rol} {r.codigo ? `(${r.codigo})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Filtro por Estado */}
            <div>
              <label
                htmlFor="filter-user-status"
                className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
              >
                Estado del Usuario
              </label>
              <select
                id="filter-user-status"
                value={estadoFilter}
                onChange={(e) =>
                  setEstadoFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
                }
                className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-[#F3F5F7] px-3.5 py-2 text-sm text-[#1E242B] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
              >
                <option value="ALL">Todos (Activos e Inactivos)</option>
                <option value="ACTIVE">Estado: Activo</option>
                <option value="INACTIVE">Estado: Inactivo</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E6EA] pt-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#687380]">
              <span className="font-semibold text-[#1E242B]">
                Total mostrados: {users.length}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[#DCFCE7] px-2 py-0.5 font-semibold text-[#15803D]">
                ✓ Activos: {activeUsersCount}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="min-h-[40px] rounded-xl border border-[#E2E6EA] bg-[#F8F9FA] px-4 py-1.5 text-[13px] font-semibold text-[#1E242B] hover:border-[#D4AF37] hover:bg-[#FBF6E6] transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </section>

        {/* Resultados de Usuarios (RF-USR-004) */}
        <section aria-label="Listado de usuarios registrados">
          {isLoading ? (
            <div className="rounded-2xl border border-[#E2E6EA] bg-white p-10 text-center text-sm font-semibold text-[#687380]">
              Cargando directorio de usuarios...
            </div>
          ) : users.length === 0 ? (
            <div
              role="status"
              className="rounded-2xl border border-[#E2E6EA] bg-white p-10 text-center space-y-2"
            >
              <p className="text-base font-bold text-[#1E242B]">
                {emptySearchMessage || 'ninguna coincidencia encontrada'}
              </p>
              <p className="text-[13px] text-[#687380]">
                Verifique el documento de identidad, el nombre o los filtros de rol y estado seleccionados (RF-USR-004).
              </p>
            </div>
          ) : (
            <>
              {/* Vista de Tabla para Escritorio (>= 768px) */}
              <div className="hidden md:block rounded-2xl border border-[#E2E6EA] bg-white shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E6EA] bg-[#F8F9FA] text-[13px] font-bold uppercase tracking-wider text-[#687380]">
                      <th className="py-3.5 px-4">Nombre Completo</th>
                      <th className="py-3.5 px-4">Documento</th>
                      <th className="py-3.5 px-4">Correo / Teléfono</th>
                      <th className="py-3.5 px-4">Roles Asignados</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6EA] text-sm">
                    {users.map((user) => (
                      <tr
                        key={user.idUsuario}
                        className="hover:bg-[#F8F9FA]/80 transition-colors"
                      >
                        <td className="py-4 px-4 font-bold text-[#1E242B]">
                          <div>{user.nombreCompleto}</div>
                          {user.firmaUrl && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded bg-[#FBF6E6] border border-[#D4AF37]/40 px-2 py-0.5 text-[13px] font-medium text-[#1E242B]">
                              ✒ Firma registrada
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono text-[13px] text-[#1E242B]">
                          {user.documentoIdentidad}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-[#1E242B] font-medium">{user.correo}</div>
                          <div className="text-[13px] text-[#687380]">
                            {user.telefono ? `Tel: ${user.telefono}` : 'Sin teléfono'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {user.roles
                              .filter((r) => r.estadoAsignacion)
                              .map((r) => (
                                <span
                                  key={r.idRol}
                                  className="inline-flex items-center rounded-lg bg-[#FBF6E6] border border-[#D4AF37]/40 px-2.5 py-1 text-[13px] font-semibold text-[#1E242B]"
                                >
                                  {r.nombreRol}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {user.estado ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#DCFCE7] px-3 py-1 text-[13px] font-bold text-[#15803D]">
                              ● Estado: Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FEE2E2] px-3 py-1 text-[13px] font-bold text-[#B91C1C]">
                              ○ Estado: Inactivo
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="min-h-[44px] rounded-xl border border-[#E2E6EA] bg-white px-3.5 py-2 text-[13px] font-bold text-[#1E242B] hover:border-[#D4AF37] hover:bg-[#FBF6E6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`min-h-[44px] rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                                user.estado
                                  ? 'border border-[#B91C1C]/30 bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white'
                                  : 'border border-[#15803D]/30 bg-[#DCFCE7] text-[#15803D] hover:bg-[#15803D] hover:text-white'
                              }`}
                            >
                              {user.estado ? 'Inactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista de Tarjetas Apiladas para Móvil (360px - 767px, cero scroll horizontal RQNF-COM-002) */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {users.map((user) => (
                  <article
                    key={user.idUsuario}
                    className="rounded-2xl border border-[#E2E6EA] bg-white p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-[#1E242B]">
                          {user.nombreCompleto}
                        </h2>
                        <p className="text-[13px] font-mono text-[#687380]">
                          Doc: {user.documentoIdentidad}
                        </p>
                      </div>
                      {user.estado ? (
                        <span className="inline-flex items-center rounded-lg bg-[#DCFCE7] px-2.5 py-1 text-[13px] font-bold text-[#15803D]">
                          ✓ Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-[#FEE2E2] px-2.5 py-1 text-[13px] font-bold text-[#B91C1C]">
                          ○ Inactivo
                        </span>
                      )}
                    </div>

                    <div className="text-[13px] text-[#1E242B] space-y-0.5">
                      <p className="break-all">
                        <span className="font-semibold text-[#687380]">Correo: </span>
                        {user.correo}
                      </p>
                      <p>
                        <span className="font-semibold text-[#687380]">Teléfono: </span>
                        {user.telefono || 'No registrado'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {user.roles
                        .filter((r) => r.estadoAsignacion)
                        .map((r) => (
                          <span
                            key={r.idRol}
                            className="rounded-lg bg-[#FBF6E6] border border-[#D4AF37]/40 px-2.5 py-1 text-[13px] font-semibold text-[#1E242B]"
                          >
                            {r.nombreRol}
                          </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E6EA]">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(user)}
                        className="min-h-[44px] rounded-xl border border-[#E2E6EA] bg-[#F8F9FA] px-3 py-2 text-[13px] font-bold text-[#1E242B] hover:border-[#D4AF37]"
                      >
                        Editar datos
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className={`min-h-[44px] rounded-xl px-3 py-2 text-[13px] font-bold ${
                          user.estado
                            ? 'bg-[#FEE2E2] text-[#B91C1C]'
                            : 'bg-[#DCFCE7] text-[#15803D]'
                        }`}
                      >
                        {user.estado ? 'Inactivar' : 'Activar'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Modal de Creación / Edición de Usuario */}
      <UserFormModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialUser={selectedUser}
        availableRoles={roles}
        isSubmitting={isSubmittingModal}
        serverError={modalServerError}
        conflictingAppointments={conflictingAppointments}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};