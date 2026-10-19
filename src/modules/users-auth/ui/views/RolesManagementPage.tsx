// src/modules/users-auth/ui/views/RolesManagementPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ADMIN_USER_ROLE_PERMISSIONS,
  CLINICAL_PERMISSIONS,
  INITIAL_ROLE_CODES,
} from '../../domain/role.entity';
import { RoleDTO } from '../../domain/user.repository.interface';
import { RolePermissionsMatrix } from '../components/RolePermissionsMatrix';

export interface RoleExtendedViewDTO extends RoleDTO {
  codigo: string;
  descripcion: string;
  permisos: string[];
  usuariosAsignadosCount?: number;
}

export interface RolesManagementPageProps {
  initialRoles?: RoleExtendedViewDTO[];
  onCreateRole?: (payload: {
    codigo: string;
    nombreRol: string;
    descripcion: string;
    permisos: string[];
  }) => Promise<{ message: string; data: RoleDTO }>;
  onUpdateRole?: (payload: {
    idRol: number;
    nombreRol: string;
    descripcion: string;
    permisos: string[];
  }) => Promise<{ message: string; data: RoleDTO }>;
  onDeleteRole?: (idRol: number) => Promise<{ message: string }>;
}

const INITIAL_ROLES_SEED: RoleExtendedViewDTO[] = [
  {
    id_rol: 1,
    codigo: 'ROL-ADM',
    nombre_rol: 'Administrador del Sistema',
    descripcion: 'Gestiona usuarios, roles, permisos, plantillas de consentimiento, agenda y datos de pacientes.',
    permisos: [
      ...ADMIN_USER_ROLE_PERMISSIONS,
      'RF-AGE-001',
      'RF-AGE-002',
      'RF-AGE-005',
      'RF-AGE-006',
      'RF-AGE-007',
      'RF-AGE-008',
      'RF-AGE-012',
      'RF-AGE-013',
      'RF-HCL-001',
      'RF-HCL-002',
      'RF-HCL-003',
      'RF-HCL-004',
      'RF-HCL-010',
      'RF-CON-004',
      'RF-CON-007',
      'RF-CON-008',
    ],
    usuariosAsignadosCount: 1,
  },
  {
    id_rol: 2,
    codigo: 'ROL-ODO',
    nombre_rol: 'Odontólogo General',
    descripcion: 'Atiende Odontología general, gestiona su agenda, historia clínica, odontograma, consentimientos y documentos clínicos.',
    permisos: [
      'RF-AGE-008',
      'RF-AGE-009',
      'RF-AGE-013',
      'RF-HCL-001',
      'RF-HCL-002',
      'RF-HCL-003',
      'RF-HCL-004',
      ...CLINICAL_PERMISSIONS,
    ],
    usuariosAsignadosCount: 1,
  },
  {
    id_rol: 3,
    codigo: 'ROL-ESP',
    nombre_rol: 'Especialista en Ortodoncia',
    descripcion: 'Atiende Ortodoncia, gestiona su agenda, historia clínica, odontograma, consentimientos y documentos clínicos.',
    permisos: [
      'RF-AGE-008',
      'RF-AGE-009',
      'RF-AGE-013',
      'RF-HCL-001',
      'RF-HCL-002',
      'RF-HCL-003',
      'RF-HCL-004',
      ...CLINICAL_PERMISSIONS,
    ],
    usuariosAsignadosCount: 1,
  },
  {
    id_rol: 4,
    codigo: 'ROL-COA',
    nombre_rol: 'Coordinadora de Agendamiento',
    descripcion: 'Gestiona la agenda de todos los profesionales, solicitudes de cita y datos administrativos de pacientes.',
    permisos: [
      'RF-AGE-001',
      'RF-AGE-002',
      'RF-AGE-005',
      'RF-AGE-006',
      'RF-AGE-007',
      'RF-AGE-008',
      'RF-AGE-012',
      'RF-AGE-013',
      'RF-HCL-001',
      'RF-HCL-002',
      'RF-HCL-003',
      'RF-HCL-004',
      'RF-HCL-010',
    ],
    usuariosAsignadosCount: 1,
  },
  {
    id_rol: 5,
    codigo: 'ROL-AUX',
    nombre_rol: 'Auxiliar de Odontología',
    descripcion: 'Apoya en agendamiento y asiste al profesional durante una cita En consulta (Regla de Negocio 5).',
    permisos: [
      'RF-AGE-001',
      'RF-AGE-002',
      'RF-AGE-005',
      'RF-AGE-006',
      'RF-AGE-007',
      'RF-AGE-008',
      'RF-AGE-012',
      'RF-AGE-013',
      'RF-HCL-001',
      'RF-HCL-002',
      'RF-HCL-003',
      'RF-HCL-004',
      'RF-HCL-007',
      'RF-HCL-009',
      'RF-CON-001',
      'RF-CON-003',
      'RF-CON-006',
      'RF-DOC-005',
    ],
    usuariosAsignadosCount: 1,
  },
  {
    id_rol: 6,
    codigo: 'ROL-PAC',
    nombre_rol: 'Paciente',
    descripcion: 'Rol público sin cuenta ni inicio de sesión para solicitar citas y firmar consentimientos en tablet.',
    permisos: [],
    usuariosAsignadosCount: 0,
  },
];

export const RolesManagementPage: React.FC<RolesManagementPageProps> = ({
  initialRoles = INITIAL_ROLES_SEED,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
}) => {
  const [roles, setRoles] = useState<RoleExtendedViewDTO[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(
    initialRoles[0]?.id_rol ?? 1
  );
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Estado del formulario de rol activo
  const [codigo, setCodigo] = useState('');
  const [nombreRol, setNombreRol] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [permisos, setPermisos] = useState<string[]>([]);

  // Mensajes y estados de proceso
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal de confirmación de eliminación (RF-USR-011)
  const [roleToDelete, setRoleToDelete] = useState<RoleExtendedViewDTO | null>(null);

  const selectedRole = useMemo(
    () => roles.find((r) => Number(r.id_rol) === Number(selectedRoleId)) ?? null,
    [roles, selectedRoleId]
  );

  useEffect(() => {
    if (isCreatingNew) {
      setCodigo('ROL-');
      setNombreRol('');
      setDescripcion('');
      setPermisos(['RF-AGE-008']);
      setErrorMessage(null);
      return;
    }

    if (selectedRole) {
      setCodigo(selectedRole.codigo);
      setNombreRol(selectedRole.nombre_rol);
      setDescripcion(selectedRole.descripcion ?? '');
      setPermisos([...(selectedRole.permisos ?? [])]);
      setErrorMessage(null);
    }
  }, [isCreatingNew, selectedRole]);

  const isInitialProtectedRole = (code: string): boolean =>
    INITIAL_ROLE_CODES.includes(code.trim().toUpperCase() as any);

  const handleStartCreateRole = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsCreatingNew(true);
  };

  const handleSelectExistingRole = (idRol: number) => {
    setIsCreatingNew(false);
    setSelectedRoleId(idRol);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanCode = codigo.trim().toUpperCase();
    const cleanName = nombreRol.trim();
    const cleanDesc = descripcion.trim();

    if (!cleanCode || !cleanName) {
      setErrorMessage('El código y el nombre del rol son obligatorios (RF-USR-007).');
      return;
    }

    if (cleanCode !== 'ROL-PAC' && permisos.length === 0) {
      setErrorMessage('El rol no puede quedar sin permisos asignados (RF-USR-007 / RF-USR-010).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isCreatingNew) {
        // Validar que no tenga permisos clínicos al crear (RF-USR-007)
        const hasClinical = permisos.some((p) => CLINICAL_PERMISSIONS.includes(p));
        if (hasClinical) {
          throw new Error(
            'No está permitido asignar permisos clínicos a un nuevo rol (RF-USR-007).'
          );
        }

        if (onCreateRole) {
          const result = await onCreateRole({
            codigo: cleanCode,
            nombreRol: cleanName,
            descripcion: cleanDesc,
            permisos,
          });
          const newEntry: RoleExtendedViewDTO = {
            id_rol: result.data.id_rol,
            codigo: cleanCode,
            nombre_rol: result.data.nombre_rol,
            descripcion: cleanDesc,
            permisos,
            usuariosAsignadosCount: 0,
          };
          setRoles((prev) => [...prev, newEntry]);
          setSelectedRoleId(newEntry.id_rol);
          setIsCreatingNew(false);
          setSuccessMessage(result.message);
        } else {
          const res = await fetch('/api/users-auth/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codigo: cleanCode,
              nombreRol: cleanName,
              descripcion: cleanDesc,
              permisos,
            }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error(body.message);

          const newId = body.data?.id_rol ?? Date.now();
          const newEntry: RoleExtendedViewDTO = {
            id_rol: newId,
            codigo: cleanCode,
            nombre_rol: cleanName,
            descripcion: cleanDesc,
            permisos,
            usuariosAsignadosCount: 0,
          };
          setRoles((prev) => [...prev, newEntry]);
          setSelectedRoleId(newId);
          setIsCreatingNew(false);
          setSuccessMessage(body.message || 'Rol creado exitosamente.');
        }
      } else if (selectedRole) {
        if (onUpdateRole) {
          const result = await onUpdateRole({
            idRol: selectedRole.id_rol,
            nombreRol: cleanName,
            descripcion: cleanDesc,
            permisos,
          });
          setRoles((prev) =>
            prev.map((r) =>
              r.id_rol === selectedRole.id_rol
                ? {
                    ...r,
                    nombre_rol: cleanName,
                    descripcion: cleanDesc,
                    permisos: [...permisos],
                  }
                : r
            )
          );
          setSuccessMessage(result.message);
        } else {
          setRoles((prev) =>
            prev.map((r) =>
              r.id_rol === selectedRole.id_rol
                ? {
                    ...r,
                    nombre_rol: cleanName,
                    descripcion: cleanDesc,
                    permisos: [...permisos],
                  }
                : r
            )
          );
          setSuccessMessage(
            'Rol actualizado exitosamente en caliente sin redespliegue (RF-USR-010 / RQNF-MAN-002).'
          );
        }
      }
    } catch (error: any) {
      setErrorMessage(error?.message || 'No se pudo guardar el rol.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isInitialProtectedRole(roleToDelete.codigo)) {
      setErrorMessage(
        `El rol ${roleToDelete.codigo} (${roleToDelete.nombre_rol}) pertenece a la configuración inicial y no puede eliminarse (RF-USR-011).`
      );
      setRoleToDelete(null);
      return;
    }

    if ((roleToDelete.usuariosAsignadosCount ?? 0) > 0) {
      setErrorMessage(
        `No se puede eliminar el rol porque está asignado a ${roleToDelete.usuariosAsignadosCount} usuario(s) (RF-USR-011).`
      );
      setRoleToDelete(null);
      return;
    }

    setIsSubmitting(true);
    try {
      if (onDeleteRole) {
        const res = await onDeleteRole(roleToDelete.id_rol);
        setSuccessMessage(res.message);
      } else {
        const res = await fetch(`/api/users-auth/roles/${roleToDelete.id_rol}`, {
          method: 'DELETE',
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message);
        setSuccessMessage(body.message || 'Rol eliminado exitosamente.');
      }

      const remaining = roles.filter((r) => r.id_rol !== roleToDelete.id_rol);
      setRoles(remaining);
      setSelectedRoleId(remaining[0]?.id_rol ?? 1);
      setRoleToDelete(null);
    } catch (error: any) {
      setErrorMessage(error?.message || 'No fue posible eliminar el rol.');
      setRoleToDelete(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] text-[#1E242B] p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabecera del Módulo de Roles */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#E2E6EA] bg-white p-5 sm:p-6 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[#111111] px-2.5 py-1 text-[13px] font-mono font-bold text-[#D4AF37]">
                RBAC JSON
              </span>
              <span className="text-[13px] font-semibold text-[#687380]">
                RF-USR-007 • RF-USR-010 • RF-USR-011 • RQNF-MAN-002
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#1E242B]">
              Gestión Dinámica de Roles y Permisos
            </h1>
            <p className="mt-1 text-[13px] sm:text-sm text-[#687380]">
              Configure roles y permisos mediante estructura JSON sin modificar ni redesplegar el código fuente. Los cambios aplican desde la siguiente acción del usuario.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartCreateRole}
            className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B8942A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] transition-colors"
          >
            <span className="text-lg leading-none" aria-hidden="true">
              +
            </span>
            <span>Crear Nuevo Rol</span>
          </button>
        </header>

        {/* Mensajes de estado (Color + Ícono + Etiqueta según RQNF-USA-001) */}
        {successMessage && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-2xl border border-[#15803D]/30 bg-[#DCFCE7] px-5 py-4 text-sm font-semibold text-[#15803D]"
          >
            <span>✓ Confirmación: {successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              aria-label="Cerrar confirmación"
              className="min-h-[36px] px-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl border border-[#B91C1C]/30 bg-[#FEE2E2] px-5 py-4 text-sm font-semibold text-[#B91C1C]"
          >
            <span>✕ Motivo del rechazo: {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Cerrar alerta de error"
              className="min-h-[36px] px-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Layout Maestro-Detalle Responsivo (1 col en móvil/tablet, 12 cols en desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Catálogo de Roles */}
          <aside
            aria-label="Catálogo de roles del sistema"
            className="lg:col-span-4 rounded-2xl border border-[#E2E6EA] bg-white p-4 sm:p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#E2E6EA] pb-3">
              <h2 className="text-base font-bold text-[#1E242B]">
                Catálogo de Roles ({roles.length})
              </h2>
              <span className="text-[13px] font-medium text-[#687380]">
                6 iniciales protegidos
              </span>
            </div>

            <div className="space-y-2.5">
              {roles.map((role) => {
                const isSelected = !isCreatingNew && role.id_rol === selectedRoleId;
                const isProtected = isInitialProtectedRole(role.codigo);

                return (
                  <div
                    key={role.id_rol}
                    onClick={() => handleSelectExistingRole(role.id_rol)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectExistingRole(role.id_rol);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    className={`w-full rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#FBF6E6] shadow-xs'
                        : 'border-[#E2E6EA] bg-[#F8F9FA] hover:border-[#D4AF37]/60 hover:bg-white'
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded bg-[#111111] px-2 py-0.5 text-[13px] font-mono font-bold text-[#D4AF37]">
                          {role.codigo}
                        </span>
                        <h3 className="mt-1 text-sm font-bold text-[#1E242B]">
                          {role.nombre_rol}
                        </h3>
                      </div>

                      {isProtected ? (
                        <span className="inline-flex items-center rounded-md bg-[#DBEAFE] px-2 py-0.5 text-[13px] font-semibold text-[#1D4ED8]">
                          🔒 Inicial
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[13px] font-semibold text-[#15803D]">
                          Personalizado
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-[13px] text-[#687380] line-clamp-2">
                      {role.descripcion || 'Sin descripción registrada.'}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-[#E2E6EA]/80 pt-2 text-[13px] font-medium text-[#687380]">
                      <span>{role.permisos.length} permiso(s)</span>
                      <span>
                        {role.usuariosAsignadosCount ?? 0} usuario(s) asignado(s)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Columna Derecha: Editor del Rol y Matriz de Permisos */}
          <section
            aria-label="Configuración del rol seleccionado"
            className="lg:col-span-8 space-y-6"
          >
            <form
              onSubmit={handleSaveRole}
              noValidate
              className="rounded-2xl border border-[#E2E6EA] border-t-4 border-t-[#D4AF37] bg-white p-5 sm:p-6 shadow-xs space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E2E6EA] pb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1E242B]">
                    {isCreatingNew
                      ? 'Crear Nuevo Rol Configurable (RF-USR-007)'
                      : `Editar Rol: ${selectedRole?.nombre_rol ?? ''} (RF-USR-010)`}
                  </h2>
                  <p className="text-[13px] text-[#687380]">
                    {isCreatingNew
                      ? 'Defina el código único, nombre, descripción y seleccione los permisos no clínicos.'
                      : 'El código del rol es inmutable. Puede modificar su nombre, descripción o permisos habilitados.'}
                  </p>
                </div>

                {!isCreatingNew && selectedRole && (
                  <button
                    type="button"
                    onClick={() => setRoleToDelete(selectedRole)}
                    className="min-h-[44px] self-start sm:self-center rounded-xl border border-[#B91C1C]/30 bg-[#FEE2E2] px-4 py-2 text-[13px] font-bold text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B91C1C] transition-colors"
                  >
                    Eliminar rol (RF-USR-011)
                  </button>
                )}
              </div>

              {/* Campos del Rol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="role-code-input"
                    className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
                  >
                    Código del Rol * {!isCreatingNew && '(No editable)'}
                  </label>
                  <input
                    id="role-code-input"
                    type="text"
                    maxLength={20}
                    disabled={!isCreatingNew}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej. ROL-AUD"
                    className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-[#F3F5F7] px-3.5 py-2.5 text-sm font-mono font-bold text-[#1E242B] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-75 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label
                    htmlFor="role-name-input"
                    className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
                  >
                    Nombre del Rol * (Máx. 40 caracteres)
                  </label>
                  <input
                    id="role-name-input"
                    type="text"
                    maxLength={40}
                    value={nombreRol}
                    onChange={(e) => setNombreRol(e.target.value)}
                    placeholder="Ej. Auditor de Calidad"
                    className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-[#F3F5F7] px-3.5 py-2.5 text-sm text-[#1E242B] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="role-desc-input"
                    className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
                  >
                    Descripción del Rol
                  </label>
                  <textarea
                    id="role-desc-input"
                    rows={2}
                    maxLength={250}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describa el alcance operativo de este rol dentro del consultorio..."
                    className="w-full rounded-xl border border-[#E2E6EA] bg-[#F3F5F7] p-3.5 text-sm text-[#1E242B] focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                </div>
              </div>

              {/* Matriz de Permisos por RF */}
              <RolePermissionsMatrix
                roleCode={codigo}
                selectedPermissions={permisos}
                onChange={setPermisos}
                disabled={isSubmitting}
              />

              {/* Botones de Acción */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-[#E2E6EA] pt-4">
                {isCreatingNew && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="min-h-[44px] rounded-xl border border-[#E2E6EA] bg-white px-5 py-2.5 text-sm font-semibold text-[#1E242B] hover:bg-[#F8F9FA]"
                  >
                    Cancelar creación
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[46px] rounded-xl bg-[#D4AF37] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B8942A] disabled:bg-[#C4C9CF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] transition-colors"
                >
                  {isSubmitting
                    ? 'Guardando configuración JSON...'
                    : isCreatingNew
                    ? 'Guardar nuevo rol'
                    : 'Guardar cambios del rol'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación de Rol (RF-USR-011) */}
      {roleToDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-role-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border-t-4 border-[#B91C1C] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FEE2E2] text-[#B91C1C] font-bold">
                ⚠
              </div>
              <div>
                <h3 id="delete-role-title" className="text-lg font-bold text-[#1E242B]">
                  Confirmar eliminación de rol (RF-USR-011)
                </h3>
                <p className="text-[13px] text-[#687380]">
                  Código: <span className="font-mono font-bold">{roleToDelete.codigo}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-[#1E242B] leading-relaxed">
              ¿Está seguro de que desea eliminar el rol{' '}
              <strong>{roleToDelete.nombre_rol}</strong> del catálogo? Si confirma y el rol no es uno de los 6 iniciales ni tiene usuarios asignados, desaparecerá inmediatamente sin requerir redespliegue.
            </p>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="min-h-[44px] rounded-xl border border-[#E2E6EA] bg-white px-4 py-2 text-sm font-semibold text-[#1E242B] hover:bg-[#F8F9FA]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRole}
                disabled={isSubmitting}
                className="min-h-[44px] rounded-xl bg-[#B91C1C] px-5 py-2 text-sm font-bold text-white hover:opacity-95"
              >
                Sí, eliminar rol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};