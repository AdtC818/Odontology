import React, { useEffect, useMemo, useState } from 'react';
import { SignatureImageInput } from '../../domain/user.entity';
import {
  ActiveAppointmentSummaryDTO,
  RoleDTO,
  UserWithRolesDomainDTO,
} from '../../domain/user.repository.interface';

export interface UserFormSubmitPayload {
  idUsuario?: number;
  nombreCompleto: string;
  documentoIdentidad: string;
  correo: string;
  telefono?: string;
  contrasenaTemporal?: string;
  rolesIds: number[];
  firma?: SignatureImageInput | null;
}

export interface UserFormModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  initialUser?: UserWithRolesDomainDTO | null;
  availableRoles: RoleDTO[];
  isSubmitting?: boolean;
  serverError?: string | null;
  conflictingAppointments?: ActiveAppointmentSummaryDTO[];
  onClose: () => void;
  onSubmit: (payload: UserFormSubmitPayload) => Promise<void> | void;
}

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024; // 2 MB (RF-USR-001)
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  mode,
  initialUser,
  availableRoles,
  isSubmitting = false,
  serverError,
  conflictingAppointments = [],
  onClose,
  onSubmit,
}) => {
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasenaTemporal, setContrasenaTemporal] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRolesIds, setSelectedRolesIds] = useState<number[]>([]);
  const [signatureData, setSignatureData] = useState<SignatureImageInput | null>(null);
  const [signatureFileName, setSignatureFileName] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Excluir ROL-PAC porque no se asigna a ninguna cuenta de usuario (RF-USR-001)
  const assignableRoles = useMemo(
    () =>
      availableRoles.filter(
        (r) =>
          r.codigo?.toUpperCase() !== 'ROL-PAC' &&
          r.nombre_rol.trim().toUpperCase() !== 'PACIENTE'
      ),
    [availableRoles]
  );

  // Determinar si alguno de los roles seleccionados es ROL-ODO o ROL-ESP para habilitar firma
  const hasProfessionalRoleSelected = useMemo(() => {
    const selectedObjects = assignableRoles.filter((r) =>
      selectedRolesIds.includes(Number(r.id_rol))
    );
    return selectedObjects.some((r) => {
      const code = (r.codigo ?? '').toUpperCase();
      const name = r.nombre_rol.toLowerCase();
      return (
        code === 'ROL-ODO' ||
        code === 'ROL-ESP' ||
        name.includes('odont') ||
        name.includes('especialista') ||
        name.includes('ortodon')
      );
    });
  }, [assignableRoles, selectedRolesIds]);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'EDIT' && initialUser) {
      setDocumentoIdentidad(initialUser.documentoIdentidad);
      setNombreCompleto(initialUser.nombreCompleto);
      setCorreo(initialUser.correo);
      setTelefono(initialUser.telefono ?? '');
      setContrasenaTemporal('');
      setSelectedRolesIds(
        initialUser.roles.filter((r) => r.estadoAsignacion).map((r) => Number(r.idRol))
      );
      if (initialUser.firmaUrl) {
        setSignatureData({
          mimeType: 'image/png',
          sizeInBytes: 0,
          urlOrBase64: initialUser.firmaUrl,
        });
        setSignatureFileName('Firma actual registrada');
      } else {
        setSignatureData(null);
        setSignatureFileName('');
      }
    } else {
      setDocumentoIdentidad('');
      setNombreCompleto('');
      setCorreo('');
      setTelefono('');
      setContrasenaTemporal('');
      setSelectedRolesIds([]);
      setSignatureData(null);
      setSignatureFileName('');
    }
    setFieldErrors({});
  }, [isOpen, mode, initialUser]);

  // Cerrar con tecla Escape (Accesibilidad por teclado RQNF-USA-001)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const toggleRoleSelection = (idRol: number) => {
    setSelectedRolesIds((prev) =>
      prev.includes(idRol) ? prev.filter((id) => id !== idRol) : [...prev, idRol]
    );
    setFieldErrors((prev) => ({ ...prev, roles: '' }));
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setFieldErrors((prev) => ({
        ...prev,
        firma: 'La imagen de firma debe estar en formato PNG o JPG.',
      }));
      return;
    }

    if (file.size > MAX_SIGNATURE_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        firma: 'La imagen de firma supera el peso máximo permitido de 2 MB.',
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setSignatureData({
        mimeType: file.type,
        sizeInBytes: file.size,
        urlOrBase64: result,
      });
      setSignatureFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      setFieldErrors((prev) => ({ ...prev, firma: '' }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!documentoIdentidad.trim() || !/^\d+$/.test(documentoIdentidad.trim())) {
      errors.documentoIdentidad =
        'El documento es obligatorio y debe contener únicamente dígitos numéricos.';
    }
    if (!nombreCompleto.trim()) {
      errors.nombreCompleto = 'El nombre completo del usuario es obligatorio.';
    }
    if (!correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      errors.correo = 'Ingrese un correo válido con formato usuario@dominio.';
    }
    if (telefono.trim() !== '' && !/^\d{10}$/.test(telefono.trim())) {
      errors.telefono = 'El teléfono debe tener exactamente 10 dígitos numéricos.';
    }

    if (mode === 'CREATE' || contrasenaTemporal.trim() !== '') {
      if (
        contrasenaTemporal.length < 8 ||
        !/[a-zA-Z]/.test(contrasenaTemporal) ||
        !/\d/.test(contrasenaTemporal)
      ) {
        errors.contrasenaTemporal =
          'La contraseña temporal debe tener mínimo 8 caracteres, al menos una letra y un número.';
      }
    }

    if (selectedRolesIds.length === 0) {
      errors.roles = 'Debe asignar al menos un rol válido al usuario.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    await onSubmit({
      idUsuario: initialUser?.idUsuario,
      documentoIdentidad: documentoIdentidad.trim(),
      nombreCompleto: nombreCompleto.trim(),
      correo: correo.trim().toLowerCase(),
      telefono: telefono.trim() || undefined,
      contrasenaTemporal: contrasenaTemporal.trim() || undefined,
      rolesIds: selectedRolesIds,
      firma: hasProfessionalRoleSelected ? signatureData : null,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 p-3 sm:p-5 backdrop-blur-xs overflow-x-hidden"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border-t-4 border-[#D4AF37] bg-white shadow-2xl overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E6EA] px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#FBF6E6] text-[#D4AF37]"
              aria-hidden="true"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h2 id="user-modal-title" className="text-lg sm:text-xl font-bold text-[#1E242B]">
                {mode === 'CREATE' ? 'Registrar Nuevo Usuario' : 'Editar Usuario del Sistema'}
              </h2>
              <p className="text-[13px] sm:text-sm text-[#687380]">
                {mode === 'CREATE'
                  ? 'El usuario se creará en estado Activo y cambiará su clave en el primer ingreso.'
                  : 'Los cambios de roles se aplican desde la siguiente acción del usuario.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar ventana modal"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E2E6EA] text-[#687380] hover:border-[#1E242B] hover:text-[#1E242B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo con scroll interno adaptable a 200% zoom */}
        <form onSubmit={handleFormSubmit} noValidate className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 space-y-5">
          {/* Error general del servidor o conflicto de citas */}
          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-[#B91C1C]/30 bg-[#FEE2E2] p-4 text-[13px] sm:text-sm text-[#B91C1C]"
            >
              <p className="font-bold">✕ No se pudo guardar el usuario:</p>
              <p className="mt-1">{serverError}</p>

              {conflictingAppointments.length > 0 && (
                <div className="mt-3 rounded-lg bg-white/90 p-3 border border-[#B91C1C]/20">
                  <p className="font-bold text-[#1E242B] text-[13px]">
                    Listado de citas asociadas por atender:
                  </p>
                  <ul className="mt-1.5 list-disc list-inside space-y-1 text-[13px] text-[#1E242B]">
                    {conflictingAppointments.map((cita) => (
                      <li key={cita.idCita}>
                        Cita #{cita.idCita} — <span className="font-semibold">{cita.titulo}</span> (Estado: {cita.estado})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Grilla de campos básicos: 1 col en móvil (360px), 2 cols en tablet/desktop (768px+) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Documento de identidad */}
            <div>
              <label
                htmlFor="user-doc-input"
                className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
              >
                Documento de Identidad *
              </label>
              <input
                id="user-doc-input"
                type="text"
                inputMode="numeric"
                maxLength={20}
                value={documentoIdentidad}
                onChange={(e) => {
                  setDocumentoIdentidad(e.target.value.replace(/\D/g, ''));
                  setFieldErrors((prev) => ({ ...prev, documentoIdentidad: '' }));
                }}
                placeholder="Solo dígitos (ej. 1098765432)"
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-[#1E242B] placeholder-[#687380] transition-colors focus:bg-white focus:outline-none focus:ring-2 ${
                  fieldErrors.documentoIdentidad
                    ? 'border-[#B91C1C] bg-[#FEE2E2]/30 focus:ring-[#B91C1C]/30'
                    : 'border-[#E2E6EA] bg-[#F3F5F7] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
                }`}
              />
              {fieldErrors.documentoIdentidad && (
                <p role="alert" className="mt-1.5 text-[13px] font-medium text-[#B91C1C]">
                  ✕ {fieldErrors.documentoIdentidad}
                </p>
              )}
            </div>

            {/* Teléfono */}
            <div>
              <label
                htmlFor="user-phone-input"
                className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
              >
                Teléfono Móvil (10 dígitos)
              </label>
              <input
                id="user-phone-input"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value.replace(/\D/g, ''));
                  setFieldErrors((prev) => ({ ...prev, telefono: '' }));
                }}
                placeholder="Ej. 3101234567"
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-[#1E242B] placeholder-[#687380] transition-colors focus:bg-white focus:outline-none focus:ring-2 ${
                  fieldErrors.telefono
                    ? 'border-[#B91C1C] bg-[#FEE2E2]/30 focus:ring-[#B91C1C]/30'
                    : 'border-[#E2E6EA] bg-[#F3F5F7] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
                }`}
              />
              {fieldErrors.telefono && (
                <p role="alert" className="mt-1.5 text-[13px] font-medium text-[#B91C1C]">
                  ✕ {fieldErrors.telefono}
                </p>
              )}
            </div>

            {/* Nombre Completo */}
            <div className="md:col-span-2">
              <label
                htmlFor="user-name-input"
                className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
              >
                Nombre Completo *
              </label>
              <input
                id="user-name-input"
                type="text"
                maxLength={150}
                value={nombreCompleto}
                onChange={(e) => {
                  setNombreCompleto(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, nombreCompleto: '' }));
                }}
                placeholder="Ej. Dra. Natalia Díaz"
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-[#1E242B] placeholder-[#687380] transition-colors focus:bg-white focus:outline-none focus:ring-2 ${
                  fieldErrors.nombreCompleto
                    ? 'border-[#B91C1C] bg-[#FEE2E2]/30 focus:ring-[#B91C1C]/30'
                    : 'border-[#E2E6EA] bg-[#F3F5F7] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
                }`}
              />
              {fieldErrors.nombreCompleto && (
                <p role="alert" className="mt-1.5 text-[13px] font-medium text-[#B91C1C]">
                  ✕ {fieldErrors.nombreCompleto}
                </p>
              )}
            </div>

            {/* Correo Electrónico */}
            <div>
              <label
                htmlFor="user-email-input"
                className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
              >
                Correo Electrónico *
              </label>
              <input
                id="user-email-input"
                type="email"
                maxLength={150}
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, correo: '' }));
                }}
                placeholder="correo@gmail.com"
                className={`w-full min-h-[44px] rounded-xl border px-3.5 py-2.5 text-sm text-[#1E242B] placeholder-[#687380] transition-colors focus:bg-white focus:outline-none focus:ring-2 ${
                  fieldErrors.correo
                    ? 'border-[#B91C1C] bg-[#FEE2E2]/30 focus:ring-[#B91C1C]/30'
                    : 'border-[#E2E6EA] bg-[#F3F5F7] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
                }`}
              />
              {fieldErrors.correo && (
                <p role="alert" className="mt-1.5 text-[13px] font-medium text-[#B91C1C]">
                  ✕ {fieldErrors.correo}
                </p>
              )}
            </div>

            {/* Contraseña Temporal */}
            <div>
              <label
                htmlFor="user-pass-input"
                className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
              >
                {mode === 'CREATE' ? 'Contraseña Temporal *' : 'Nueva Contraseña Temporal (Opcional)'}
              </label>
              <div className="relative">
                <input
                  id="user-pass-input"
                  type={showPassword ? 'text' : 'password'}
                  value={contrasenaTemporal}
                  onChange={(e) => {
                    setContrasenaTemporal(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, contrasenaTemporal: '' }));
                  }}
                  placeholder={
                    mode === 'CREATE'
                      ? 'Mín. 8 caracteres (letra y número)'
                      : 'Vacío para conservar la actual'
                  }
                  className={`w-full min-h-[44px] rounded-xl border pl-3.5 pr-12 py-2.5 text-sm text-[#1E242B] placeholder-[#687380] transition-colors focus:bg-white focus:outline-none focus:ring-2 ${
                    fieldErrors.contrasenaTemporal
                      ? 'border-[#B91C1C] bg-[#FEE2E2]/30 focus:ring-[#B91C1C]/30'
                      : 'border-[#E2E6EA] bg-[#F3F5F7] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-[#687380] hover:text-[#1E242B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {mode === 'EDIT' && !fieldErrors.contrasenaTemporal && (
                <p className="mt-1 text-[13px] text-[#687380]">
                  Si asigna una nueva, quedará como temporal para su próximo ingreso.
                </p>
              )}
              {fieldErrors.contrasenaTemporal && (
                <p role="alert" className="mt-1.5 text-[13px] font-medium text-[#B91C1C]">
                  ✕ {fieldErrors.contrasenaTemporal}
                </p>
              )}
            </div>
          </div>

          {/* Selector de Roles (Múltiple, excluyendo ROL-PAC) */}
          <div className="pt-2">
            <span className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1">
              Roles Asignados * (Sus permisos se suman)
            </span>
            <p className="text-[13px] text-[#687380] mb-3">
              Seleccione al menos un rol. El rol Paciente (ROL-PAC) está excluido por regla de negocio.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {assignableRoles.map((role) => {
                const idRol = Number(role.id_rol);
                const isSelected = selectedRolesIds.includes(idRol);

                return (
                  <button
                    key={idRol}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => toggleRoleSelection(idRol)}
                    className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#FBF6E6] text-[#1E242B] shadow-xs'
                        : 'border-[#E2E6EA] bg-[#F8F9FA] text-[#1E242B] hover:border-[#D4AF37]/60'
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]`}
                  >
                    <div>
                      <span className="block text-sm font-bold">{role.nombre_rol}</span>
                      {role.codigo && (
                        <span className="text-[13px] font-mono text-[#687380]">{role.codigo}</span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[13px] font-semibold ${
                        isSelected
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : 'bg-[#E2E6EA] text-[#687380]'
                      }`}
                    >
                      {isSelected ? '✓ Activo' : 'Asignar'}
                    </span>
                  </button>
                );
              })}
            </div>
            {fieldErrors.roles && (
              <p role="alert" className="mt-2 text-[13px] font-medium text-[#B91C1C]">
                ✕ {fieldErrors.roles}
              </p>
            )}
          </div>

          {/* Carga de Imagen de Firma (Solo visible para ROL-ODO y ROL-ESP según RF-USR-001 / RF-DOC-004) */}
          {hasProfessionalRoleSelected && (
            <div className="rounded-2xl border border-[#D4AF37]/50 bg-[#FBF6E6]/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#1E242B]">
                    Firma Digitalizada del Profesional
                  </h3>
                  <p className="text-[13px] text-[#687380]">
                    Formato permitido: PNG o JPG de máximo 2 MB. Se fusionará (flatten) en órdenes, incapacidades y remisiones.
                  </p>
                </div>
                <span className="rounded-lg bg-[#DBEAFE] px-2.5 py-1 text-[13px] font-semibold text-[#1D4ED8]">
                  Habilitado para ROL-ODO / ROL-ESP
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#D4AF37] bg-white px-4 py-2 text-sm font-semibold text-[#1E242B] hover:bg-[#FBF6E6] transition-colors">
                  <span>Seleccionar imagen PNG / JPG</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleSignatureFileChange}
                    className="sr-only"
                  />
                </label>

                {signatureData && (
                  <div className="flex items-center gap-3 rounded-xl border border-[#E2E6EA] bg-white px-3 py-2">
                    <img
                      src={signatureData.urlOrBase64}
                      alt="Vista previa de la firma del profesional"
                      className="h-10 w-24 object-contain border border-[#E2E6EA] rounded bg-[#F8F9FA]"
                    />
                    <div className="text-[13px]">
                      <p className="font-semibold text-[#15803D]">✓ {signatureFileName}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureData(null);
                          setSignatureFileName('');
                        }}
                        className="text-[#B91C1C] underline font-medium hover:opacity-80"
                      >
                        Quitar imagen
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {fieldErrors.firma && (
                <p role="alert" className="text-[13px] font-medium text-[#B91C1C]">
                  ✕ {fieldErrors.firma}
                </p>
              )}
            </div>
          )}

          {/* Pie de acciones del modal */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-[#E2E6EA] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] rounded-xl border border-[#E2E6EA] bg-white px-5 py-2.5 text-sm font-semibold text-[#1E242B] hover:bg-[#F8F9FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] rounded-xl bg-[#D4AF37] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B8942A] disabled:bg-[#C4C9CF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] transition-colors"
            >
              {isSubmitting
                ? 'Guardando...'
                : mode === 'CREATE'
                ? 'Crear usuario en estado Activo'
                : 'Guardar cambios del usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};