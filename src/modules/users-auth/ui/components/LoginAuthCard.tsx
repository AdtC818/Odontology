import React, { useState } from 'react';

export interface LoginAuthSubmitParams {
  correo: string;
  contrasena: string;
  nuevaContrasena?: string;
  confirmacionNuevaContrasena?: string;
}

export interface LoginAuthCardProps {
  requiresTemporaryPasswordChange?: boolean;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  isLockedOut?: boolean;
  onSubmit: (params: LoginAuthSubmitParams) => Promise<void> | void;
  onForgotPasswordClick: () => void;
  onBackToPublicBookingClick: () => void;
}

export const LoginAuthCard: React.FC<LoginAuthCardProps> = ({
  requiresTemporaryPasswordChange = false,
  isSubmitting = false,
  errorMessage,
  isLockedOut = false,
  onSubmit,
  onForgotPasswordClick,
  onBackToPublicBookingClick,
}) => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacionNuevaContrasena, setConfirmacionNuevaContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidationError(null);

    if (!correo.trim() || !contrasena) {
      setLocalValidationError('Correo o contraseña incorrectos');
      return;
    }

    if (requiresTemporaryPasswordChange) {
      if (nuevaContrasena !== confirmacionNuevaContrasena) {
        setLocalValidationError('La nueva contraseña y su confirmación no coinciden.');
        return;
      }
      if (nuevaContrasena === contrasena) {
        setLocalValidationError('La nueva contraseña debe ser distinta de la contraseña temporal.');
        return;
      }
      if (
        nuevaContrasena.length < 8 ||
        !/[a-zA-Z]/.test(nuevaContrasena) ||
        !/\d/.test(nuevaContrasena)
      ) {
        setLocalValidationError(
          'La nueva contraseña debe tener mínimo 8 caracteres con al menos una letra y un número.'
        );
        return;
      }
    }

    await onSubmit({
      correo: correo.trim().toLowerCase(),
      contrasena,
      nuevaContrasena: requiresTemporaryPasswordChange ? nuevaContrasena : undefined,
      confirmacionNuevaContrasena: requiresTemporaryPasswordChange
        ? confirmacionNuevaContrasena
        : undefined,
    });
  };

  const displayedError = localValidationError || errorMessage;

  return (
    <div className="w-full max-w-[440px] mx-auto rounded-3xl border border-[#E2E6EA] border-t-4 border-t-[#D4AF37] bg-white shadow-xl overflow-hidden">
      <div className="px-6 pt-8 pb-7 sm:px-9 sm:pt-10">
        {/* Ícono superior en contenedor Dorado Suave (#FBF6E6) igual al diseño adjunto */}
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#FBF6E6] text-[#D4AF37]"
          aria-hidden="true"
        >
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Título y subtítulo */}
        <div className="mt-5 text-center">
          <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#1E242B]">
            {requiresTemporaryPasswordChange ? 'Cambiar Contraseña' : 'Iniciar Sesión'}
          </h1>
          <p className="mt-1.5 text-sm text-[#687380] leading-relaxed">
            {requiresTemporaryPasswordChange
              ? 'Por seguridad, actualice su contraseña temporal en este primer ingreso (RF-USR-005)'
              : 'Accede al sistema de gestión clínica de OdontoLeal'}
          </p>
        </div>

        {/* Alerta de error o bloqueo de 15 minutos (RF-USR-005 / RQNF-USA-001) */}
        {displayedError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#B91C1C]/30 bg-[#FEE2E2] p-3.5 text-[13px] sm:text-sm font-medium text-[#B91C1C]"
          >
            <span aria-hidden="true" className="font-bold">
              {isLockedOut ? '🔒' : '✕'}
            </span>
            <span>{displayedError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          {/* Campo Correo Electrónico */}
          <div>
            <label
              htmlFor="login-email-input"
              className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-2"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#687380]"
                aria-hidden="true"
              >
                @
              </span>
              <input
                id="login-email-input"
                type="email"
                autoComplete="email"
                disabled={isSubmitting || requiresTemporaryPasswordChange}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="eduard.leal@gmail.com"
                className="w-full min-h-[46px] rounded-xl border border-[#E2E6EA] bg-[#F3F5F7] pl-10 pr-4 py-2.5 text-sm text-[#1E242B] placeholder-[#687380] transition-colors focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-70"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label
                htmlFor="login-password-input"
                className="text-[13px] font-bold uppercase tracking-wider text-[#1E242B]"
              >
                {requiresTemporaryPasswordChange ? 'Contraseña Temporal Actual' : 'Contraseña'}
              </label>

              {!requiresTemporaryPasswordChange && (
                <button
                  type="button"
                  onClick={onForgotPasswordClick}
                  className="text-[13px] font-medium text-[#687380] hover:text-[#1E242B] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>

            <div className="relative">
              <span
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#687380]"
                aria-hidden="true"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </span>

              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isSubmitting || isLockedOut}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full min-h-[46px] rounded-xl border border-[#E2E6EA] bg-[#F3F5F7] pl-10 pr-11 py-2.5 text-sm text-[#1E242B] placeholder-[#687380] transition-colors focus:border-[#D4AF37] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-70"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-[#687380] hover:text-[#1E242B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Campos adicionales en caso de cambio obligatorio de contraseña temporal (RF-USR-005) */}
          {requiresTemporaryPasswordChange && (
            <div className="space-y-4 rounded-2xl border border-[#D4AF37]/40 bg-[#FBF6E6]/40 p-4">
              <div>
                <label
                  htmlFor="new-password-input"
                  className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
                >
                  Nueva Contraseña Personal *
                </label>
                <div className="relative">
                  <input
                    id="new-password-input"
                    type={showNewPassword ? 'text' : 'password'}
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    placeholder="Mín. 8 caracteres (letra y número)"
                    className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-white px-3.5 pr-10 py-2 text-sm text-[#1E242B] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#687380] p-1.5"
                  >
                    {showNewPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-new-password-input"
                  className="block text-[13px] font-bold uppercase tracking-wider text-[#1E242B] mb-1.5"
                >
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  id="confirm-new-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmacionNuevaContrasena}
                  onChange={(e) => setConfirmacionNuevaContrasena(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-white px-3.5 py-2 text-sm text-[#1E242B] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                />
              </div>
            </div>
          )}

          {/* Botón Principal Dorado (#D4AF37 -> hover #B8942A) */}
          <button
            type="submit"
            disabled={isSubmitting || isLockedOut}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#B8942A] disabled:bg-[#C4C9CF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] transition-colors"
          >
            <span>
              {isSubmitting
                ? 'Verificando...'
                : requiresTemporaryPasswordChange
                ? 'Actualizar contraseña e ingresar'
                : 'Iniciar sesión'}
            </span>
            <span aria-hidden="true">→</span>
          </button>
        </form>

        {/* Divisor "o si eres paciente" y retorno a sección pública (RF-USR-006) */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E2E6EA]" />
          <span className="text-[13px] font-medium text-[#687380]">o si eres paciente</span>
          <div className="h-px flex-1 bg-[#E2E6EA]" />
        </div>

        <button
          type="button"
          onClick={onBackToPublicBookingClick}
          className="w-full min-h-[46px] flex items-center justify-center gap-2 rounded-xl border border-[#E2E6EA] bg-white px-4 py-2.5 text-sm font-bold text-[#1E242B] hover:border-[#D4AF37] hover:bg-[#FBF6E6]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] transition-colors"
        >
          <span aria-hidden="true" className="text-[#687380]">
            ←
          </span>
          <span>Volver a solicitud de cita</span>
        </button>
      </div>

      {/* Pie de tarjeta con indicador de cifrado TLS (RQNF-SEG-001) */}
      <div className="flex items-center justify-center gap-2 border-t border-[#E2E6EA] bg-[#F8F9FA] px-4 py-3.5 text-[13px] font-medium text-[#687380]">
        <svg
          className="h-4 w-4 text-[#15803D]"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM13.707 8.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span>Acceso encriptado y seguro</span>
      </div>
    </div>
  );
};