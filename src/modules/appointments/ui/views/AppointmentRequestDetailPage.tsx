// src/modules/appointments/ui/views/AppointmentRequestDetailPage.tsx
import React, { useState } from 'react';
import { Button } from '../../../../shared/ui/components/Button';
import { Badge } from '../../../../shared/ui/components/Badge';
import { useAlertModal } from '../../../../shared/ui/hooks/useAlertModal';

export interface RequestDetailData {
  idSolicitud: number;
  idCita?: number | null;
  nombrePaciente: string;
  documentoIdentidad: string;
  telefono: string;
  correo: string;
  fechaSolicitada: string;
  horaSolicitada: string;
  motivoConsulta: string;
  fechaSolicitud?: string;
  sexo?: string;
  edad?: number;
  esPacienteNuevo?: boolean;
  doctorAsignado?: string;
}

export interface RequestReviewDoctorOption {
  idUsuario: number;
  nombreCompleto: string;
  especialidad?: string;
}

export interface AppointmentRequestDetailPageProps {
  request: RequestDetailData;
  doctors?: RequestReviewDoctorOption[];
  onBack: () => void;
  onApprove: (idSolicitud: number, idDoctor?: number, motivo?: string) => Promise<void> | void;
  onReject: (idSolicitud: number, motivo: string) => Promise<void> | void;
  isLoading?: boolean;
}

export const AppointmentRequestDetailPage: React.FC<AppointmentRequestDetailPageProps> = ({
  request,
  doctors = [],
  onBack,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(() => {
    if (doctors.length > 0) return doctors[0].idUsuario;
    return 101; // Dr. Mateo Gómez
  });
  const [tituloCita, setTituloCita] = useState(request.motivoConsulta || 'Valoración Odontológica');
  const { showAlert, AlertModalComponent } = useAlertModal();

  // Formateo de fecha en español (ej. Jueves 29 de Octubre de 2026)
  const formatSpanishDate = (dateStr: string) => {
    if (!dateStr) return 'Fecha por confirmar';
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      const [year, month, day] = cleanDate.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ];
      return `${days[d.getDay()]} ${day} de ${months[d.getMonth()]} de ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Cálculo de iniciales
  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Formateo de DNI con puntos: 1025884320 -> 1.025.884.320
  const formatDni = (dni: string) => {
    if (!dni) return 'Sin documento';
    const digits = dni.replace(/\D/g, '');
    if (!digits) return dni;
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleConfirmReject = () => {
    if (!motivoRechazo.trim()) {
      showAlert({
        title: 'Motivo de Rechazo Requerido',
        message: 'Debe ingresar el motivo por el cual se rechaza la solicitud de cita para notificar al paciente.',
        type: 'warning',
      });
      return;
    }
    onReject(request.idSolicitud, motivoRechazo.trim());
    setIsRejectModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <AlertModalComponent />

      {/* Botón Superior: Volver */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#687380] hover:text-[#1E242B] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Solicitudes de Citas
        </button>
      </div>

      {/* Cabecera Principal con Acciones */}
      <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E242B]">
                Detalle de Solicitud de Cita
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]"></span>
                Pendiente de Aprobación
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-[#687380]">
              Revisa la información enviada por el paciente y confirma o rechaza la reserva en la agenda médica.
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsRejectModalOpen(true)}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-[#FCA5A5] text-[#DC2626] bg-white hover:bg-[#FEF2F2] text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Rechazar Solicitud
          </button>

          <button
            type="button"
            onClick={() => onApprove(request.idSolicitud, selectedDoctorId, tituloCita)}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#C29E2F] text-black text-xs font-extrabold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Crear cita
          </button>
        </div>
      </div>

      {/* Grid de 2 Columnas Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda (7 cols): Horario, Motivo y Callout de Impacto */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Fecha y Horario Solicitado */}
          <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#1E242B]">
              <span className="text-[#D4AF37]">🕒</span>
              <h3>Fecha y Horario Solicitado</h3>
            </div>

            <div className="rounded-2xl border border-[#E2E6EA] bg-[#F8F9FA] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase text-[#8F99A3] tracking-wider flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Fecha Solicitada
                </span>
                <p className="mt-1 text-base font-extrabold text-[#1E242B]">
                  {formatSpanishDate(request.fechaSolicitada)}
                </p>
              </div>

              <div className="sm:text-right">
                <span className="text-[11px] font-extrabold uppercase text-[#8F99A3] tracking-wider flex items-center sm:justify-end gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Hora Solicitada
                </span>
                <p className="mt-1 text-base font-extrabold text-[#1E242B]">
                  {request.horaSolicitada}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Motivo de Consulta Registrado */}
          <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#1E242B]">
              <span className="text-[#D4AF37]">💬</span>
              <h3>Motivo de Consulta Registrado</h3>
            </div>

            <div className="rounded-2xl border border-[#E2E6EA] bg-[#F8F9FA] p-5 space-y-3">
              <p className="text-sm italic text-[#374151] font-medium leading-relaxed">
                "{request.motivoConsulta}"
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#059669] font-medium pt-1 border-t border-[#E2E6EA]">
                <svg className="w-4 h-4 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Registrado vía formulario web de solicitud el 24 de Octubre de 2026 a las 09:15 AM
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Asignación de Profesional y Detalles de la Cita */}
          <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-extrabold text-[#1E242B]">
              <span className="text-[#D4AF37]">🩺</span>
              <h3>Asignación de Profesional y Cita Médica</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#687380] mb-1.5">
                  Profesional Odontológico Asignado:
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E2E6EA] bg-[#F8F9FA] px-3 py-2 text-xs font-bold text-[#1E242B] focus:border-[#D4AF37] focus:bg-white focus:outline-none"
                >
                  {doctors.length > 0 ? (
                    doctors.map((d) => (
                      <option key={d.idUsuario} value={d.idUsuario}>
                        {d.nombreCompleto} {d.especialidad ? `(${d.especialidad})` : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={101}>Dr. Mateo Gómez (Odontología General)</option>
                      <option value={102}>Dra. Valeria Silva (Ortodoncia)</option>
                      <option value={1}>Dr. Eduar Leal Álvarez (Especialista)</option>
                      <option value={103}>Dr. Alejandro Ruiz (Cirugía Oral)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#687380] mb-1.5">
                  Procedimiento / Título de la Cita:
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={tituloCita}
                  onChange={(e) => setTituloCita(e.target.value)}
                  placeholder="Ej. Valoración Odontológica General"
                  className="w-full rounded-xl border border-[#E2E6EA] bg-[#F8F9FA] px-3 py-2 text-xs font-medium text-[#1E242B] focus:border-[#D4AF37] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Impacto de la Confirmación (Alert Box) */}
          <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5 flex items-start gap-3">
            <span className="text-base text-[#D97706] mt-0.5">ⓘ</span>
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-[#92400E]">
                Impacto de la confirmación
              </h4>
              <p className="text-xs text-[#78350F] leading-relaxed">
                Al hacer click en <strong>Crear cita</strong>, se confirmará formalmente la cita en la agenda del doctor seleccionado, el bloque quedará reservado y se enviará de inmediato el correo de confirmación al <strong>paciente</strong> y la notificación al <strong>doctor</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Columna Derecha (5 cols): Datos del Paciente y Alta Automática */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Datos del Paciente */}
          <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6EA]">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#1E242B]">
                <span className="text-[#D4AF37]">👤</span>
                <h3>Datos del Paciente</h3>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                {request.esPacienteNuevo !== false ? 'Paciente Nueva' : 'Paciente Registrado'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-[#111827] text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-xs border-2 border-white">
                {getInitials(request.nombrePaciente)}
              </div>
              <div>
                <h4 className="text-base font-extrabold text-[#1E242B]">
                  {request.nombrePaciente}
                </h4>
                <p className="text-xs font-medium text-[#687380] mt-0.5">
                  DNI: {formatDni(request.documentoIdentidad)}
                </p>
                <div className="mt-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3F4F6] text-[#4B5563]">
                    {request.sexo || 'Femenino'} • {request.edad || 29} años
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#E2E6EA] text-xs">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#F8F9FA] border border-[#E2E6EA] flex items-center justify-center text-[#687380] shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold uppercase text-[#8F99A3]">
                    Teléfono Móvil
                  </span>
                  <span className="font-bold text-[#1E242B]">
                    {request.telefono || '+57 318 459 2011'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#F8F9FA] border border-[#E2E6EA] flex items-center justify-center text-[#687380] shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold uppercase text-[#8F99A3]">
                    Correo Electrónico
                  </span>
                  <span className="font-bold text-[#1E242B] break-all">
                    {request.correo}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Alta Automática */}
          <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[#1D4ED8] tracking-wider">
              <svg className="w-4 h-4 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Alta Automática</span>
            </div>
            <p className="text-xs text-[#1E3A8A] leading-relaxed">
              Al ser <strong>paciente nueva</strong>, al aceptar y confirmar la cita se creará automáticamente el registro del paciente en el sistema con los datos ingresados en la solicitud y cita.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Rechazo de Solicitud */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E6EA]">
              <h3 className="text-base font-extrabold text-[#DC2626] flex items-center gap-2">
                <span>🚫</span> Rechazar Solicitud de Cita
              </h3>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="text-[#8F99A3] hover:text-[#1E242B] text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#687380]">
              Indica el motivo de rechazo para liberar el bloque de horario y notificar al paciente solicitante:
            </p>
            <textarea
              rows={3}
              placeholder="Ej. El horario solicitado no tiene disponibilidad médica o los datos no pudieron ser verificados..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              className="w-full rounded-2xl border border-[#E2E6EA] p-3 text-xs text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleConfirmReject} isLoading={isLoading}>
                Confirmar Rechazo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
