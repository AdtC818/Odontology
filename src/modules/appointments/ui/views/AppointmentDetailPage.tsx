// src/modules/appointments/ui/views/AppointmentDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '../../../../shared/ui/components/Button';
import { Badge } from '../../../../shared/ui/components/Badge';
import { useAlertModal } from '../../../../shared/ui/hooks/useAlertModal';

export interface AppointmentDetailPageData {
  idCita: number;
  idPaciente: number;
  nombrePaciente: string;
  documentoIdentidad: string;
  telefono: string;
  correo: string;
  titulo: string;
  descripcion?: string;
  doctorNombre: string;
  idDoctor: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  sillon?: string;
  estado:
    | 'Confirmada'
    | 'En consulta'
    | 'En espera'
    | 'Completada'
    | 'Cancelada'
    | 'No asistió';
}

export interface AppointmentDetailPageProps {
  appointment: AppointmentDetailPageData;
  onBack: () => void;
  onNavigateToPatientProfile?: (idPaciente: number) => void;
  onStartAttention?: (idCita: number, idPaciente: number) => void;
  onMarkNoShow?: (idCita: number, motivo: string) => Promise<void> | void;
  onCancelAppointment?: (idCita: number, motivo: string) => Promise<void> | void;
  onSignConsent?: (idConsentimiento: number) => void;
}

export const AppointmentDetailPage: React.FC<AppointmentDetailPageProps> = ({
  appointment,
  onBack,
  onNavigateToPatientProfile,
  onStartAttention,
  onMarkNoShow,
  onCancelAppointment,
  onSignConsent,
}) => {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReasonTag, setCancelReasonTag] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [selectedConsents, setSelectedConsents] = useState<number[]>([]);

  // Datos dinámicos cargados desde base de datos
  const [clinicalHistories, setClinicalHistories] = useState<any[]>([]);
  const [isLoadingHistories, setIsLoadingHistories] = useState(false);
  const [consentItems, setConsentItems] = useState<any[]>([]);
  const [isLoadingConsents, setIsLoadingConsents] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);

  const { showAlert, AlertModalComponent } = useAlertModal();

  // 1. Cargar historial clínico real del paciente desde la base de datos
  useEffect(() => {
    if (!appointment.idPaciente) return;
    setIsLoadingHistories(true);
    fetch(`/api/v1/clinical-records/patient/${appointment.idPaciente}`)
      .then((res) => (res.ok ? res.json() : { data: {} }))
      .then((json) => {
        const hist: any[] = json.data?.historial || [];
        const formatted = hist.map((item: any, idx: number) => {
          let dateStr = 'Fecha no registrada';
          if (item.fechaHoraRegistro) {
            try {
              const d = new Date(item.fechaHoraRegistro);
              const months = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
              ];
              dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            } catch {
              dateStr = item.fechaHoraRegistro;
            }
          }
          return {
            id: item.idCita || idx,
            title:
              item.motivoConsulta ||
              item.procedimientoRealizado ||
              item.tratamiento ||
              `Consulta Odontológica #${item.idCita || idx + 1}`,
            fecha: dateStr,
            doctor: item.profesionalResponsable || appointment.doctorNombre,
          };
        });
        setClinicalHistories(formatted);
      })
      .catch((err) => {
        console.error('Error cargando historial clínico del paciente:', err);
        setClinicalHistories([]);
      })
      .finally(() => {
        setIsLoadingHistories(false);
      });
  }, [appointment.idPaciente, appointment.doctorNombre]);

  // 2. Cargar consentimientos informados reales del paciente desde la base de datos
  useEffect(() => {
    if (!appointment.idPaciente) return;
    setIsLoadingConsents(true);
    fetch(`/api/v1/consents/patient/${appointment.idPaciente}`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        const raw: any[] = json.data || [];
        setConsentItems(raw);
      })
      .catch((err) => {
        console.error('Error cargando consentimientos del paciente:', err);
        setConsentItems([]);
      })
      .finally(() => {
        setIsLoadingConsents(false);
      });
  }, [appointment.idPaciente]);

  // 3. Cargar plantillas de consentimientos para modal de adjuntar
  useEffect(() => {
    fetch('/api/v1/consents/templates')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        setAvailableTemplates(json.data || []);
      })
      .catch(() => {
        setAvailableTemplates([]);
      });
  }, []);

  const handleConfirmCancel = () => {
    const fullReason = [cancelReasonTag, cancelReasonText].filter(Boolean).join(': ');
    if (!fullReason.trim()) {
      showAlert({
        title: 'Motivo de Cancelación Requerido',
        message: 'Por favor seleccione una categoría o escriba el motivo de la cancelación.',
        type: 'warning',
      });
      return;
    }
    onCancelAppointment?.(appointment.idCita, fullReason);
    setIsCancelModalOpen(false);
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <AlertModalComponent />

      {/* Botón Volver a la Agenda */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#687380] hover:text-[#1E242B] transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a la Agenda
        </button>
      </div>

      {/* Tarjeta Principal de la Cita (Imagen 2) */}
      <div className="rounded-3xl border border-[#E2E6EA] border-l-6 border-l-[#D4AF37] bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#D4AF37] flex items-center justify-center shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E242B]">
                  {appointment.titulo || 'Valoración Odontológica'}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {appointment.estado}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1.5 text-xs text-[#687380] font-medium">
                <span className="text-[#D4AF37]">🕒</span>
                <span>
                  {appointment.fecha} • {appointment.horaInicio} - {appointment.horaFin} hrs ({appointment.sillon || 'Gabinete 02'})
                </span>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-[#4B5563] leading-relaxed max-w-3xl">
                {appointment.descripcion || 'Valoración clínica y diagnóstico general odontológico.'}
              </p>

              <div className="mt-4 flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-full bg-[#111827] text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {getInitials(appointment.doctorNombre)}
                </div>
                <span className="text-xs text-[#687380]">
                  Doctor encargado: <strong className="text-[#1E242B]">{appointment.doctorNombre}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Botones de Acción (Imagen 2) */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 lg:self-start shrink-0">
            {appointment.estado === 'Confirmada' && (
              <button
                type="button"
                onClick={() => onStartAttention?.(appointment.idCita, appointment.idPaciente)}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C29E2F] text-black text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <span>▶</span> Iniciar Cita
              </button>
            )}

            <button
              type="button"
              className="px-3 py-2 rounded-xl border border-[#E2E6EA] bg-white text-[#1E242B] hover:bg-[#F3F4F6] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>✏</span> Editar Cita
            </button>

            <button
              type="button"
              onClick={() => onMarkNoShow?.(appointment.idCita, 'El paciente no se presentó')}
              className="px-3 py-2 rounded-xl border border-[#E2E6EA] bg-white text-[#1E242B] hover:bg-[#F3F4F6] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-[#687380]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Marcar Inasistencia
            </button>

            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="px-3 py-2 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>✕</span> Cancelar Cita
            </button>
          </div>
        </div>
      </div>

      {/* INFORMACIÓN DEL PACIENTE (Imagen 2) */}
      <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-[#D4AF37] tracking-wider">
          <span>📋</span>
          <h3>Información del Paciente</h3>
        </div>

        <div className="rounded-2xl border border-[#E2E6EA] bg-[#F8F9FA] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[#111827] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
              {getInitials(appointment.nombrePaciente)}
            </div>
            <div>
              <span className="block text-[11px] font-bold text-[#8F99A3]">Nombre del Paciente</span>
              <button
                type="button"
                onClick={() => onNavigateToPatientProfile?.(appointment.idPaciente)}
                className="text-base font-extrabold text-[#1E242B] hover:text-[#D4AF37] hover:underline cursor-pointer transition-colors text-left flex items-center gap-1.5 group"
                title="Haga click para ver la información y ficha médica completa de este paciente"
              >
                <span>{appointment.nombrePaciente}</span>
                <span className="text-xs text-[#D4AF37] font-bold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 text-xs">
            <div>
              <span className="block text-[11px] font-bold text-[#8F99A3] flex items-center gap-1">
                📞 Teléfono
              </span>
              <span className="font-extrabold text-[#1E242B]">{appointment.telefono}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-[#8F99A3] flex items-center gap-1">
                ✉ Correo Electrónico
              </span>
              <span className="font-extrabold text-[#1E242B]">{appointment.correo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historias Clínicas Traídas de la Base de Datos (Imagen 2) */}
      <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E6EA]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#111827] text-[#D4AF37] flex items-center justify-center shrink-0">
              🎓
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#1E242B]">Historias Clínicas</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E]">
                {clinicalHistories.length} historia{clinicalHistories.length !== 1 ? 's clínicas' : ' clínica'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToPatientProfile?.(appointment.idPaciente)}
            className="text-xs font-bold text-[#687380] hover:text-[#1E242B] flex items-center gap-1 cursor-pointer"
          >
            Ver antecedentes ⌃
          </button>
        </div>

        {isLoadingHistories ? (
          <div className="py-6 text-center text-xs text-[#8F99A3]">
            Consultando historias clínicas desde la base de datos...
          </div>
        ) : clinicalHistories.length === 0 ? (
          <div className="py-6 text-center rounded-2xl border border-dashed border-[#E2E6EA] text-xs text-[#8F99A3]">
            No hay historias clínicas ni evoluciones previas registradas para este paciente en la base de datos.
          </div>
        ) : (
          <div className="divide-y divide-[#E2E6EA]">
            {clinicalHistories.map((h, i) => (
              <div key={i} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-bold text-[#1E242B]">{h.title}</span>
                  {h.doctor && <span className="block text-[11px] text-[#687380] mt-0.5">{h.doctor}</span>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[#687380] font-medium">{h.fecha}</span>
                  <button
                    type="button"
                    onClick={() => onNavigateToPatientProfile?.(appointment.idPaciente)}
                    className="font-bold text-[#D4AF37] hover:text-[#B8942A] cursor-pointer"
                  >
                    Consultar →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consentimientos Informados Traídos de la Base de Datos (Imagen 2) */}
      <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E6EA]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#111827] text-white flex items-center justify-center shrink-0">
              📋
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#1E242B]">Consentimientos Informados</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F3F4F6] text-[#4B5563]">
                {consentItems.length} documento{consentItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsConsentModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#C29E2F] text-black text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>+</span> Adjuntar consentimiento
            </button>
            <span className="text-xs text-[#687380] font-bold">Ver documentos ⌃</span>
          </div>
        </div>

        {isLoadingConsents ? (
          <div className="py-6 text-center text-xs text-[#8F99A3]">
            Consultando consentimientos desde la base de datos...
          </div>
        ) : consentItems.length === 0 ? (
          <div className="py-6 text-center rounded-2xl border border-dashed border-[#E2E6EA] text-xs text-[#8F99A3]">
            No hay consentimientos informados registrados para este paciente en la base de datos.
          </div>
        ) : (
          <div className="divide-y divide-[#E2E6EA]">
            {consentItems.map((c, i) => (
              <div
                key={c.id_consentimiento || c.id || i}
                className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-bold text-[#1E242B]">
                    {c.nombre_plantilla || c.nombre_documento || c.title || 'Consentimiento Odontológico'}
                  </h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#687380] text-[11px] font-semibold">
                      ⚪ {c.firmado ? 'Firmado' : 'Sin firmar'}
                    </span>
                    {c.fecha_creacion && (
                      <span className="text-[11px] text-[#8F99A3]">{String(c.fecha_creacion).split('T')[0]}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!c.firmado && (
                    <button
                      type="button"
                      onClick={() => onSignConsent?.(c.id_consentimiento || c.id)}
                      className="px-3 py-1.5 rounded-xl border border-[#E2E6EA] text-[#1E242B] hover:bg-[#F3F4F6] font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>✏</span> Firmar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateToPatientProfile?.(appointment.idPaciente)}
                    className="font-bold text-[#D4AF37] hover:text-[#B8942A] pl-2 cursor-pointer"
                  >
                    Consultar →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Cancelar Cita (Imagen 4) */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-[#E2E6EA] bg-white p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6EA]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
                  📅
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1E242B]">Cancelar Cita</h3>
                  <p className="text-xs text-[#8F99A3]">Registro de anulación y liberación de horario en agenda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-[#8F99A3] hover:text-[#1E242B] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-[#E2E6EA] bg-[#F8F9FA] p-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#8F99A3]">Paciente:</span>
                <span className="font-extrabold text-[#1E242B]">{appointment.nombrePaciente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8F99A3]">Cita:</span>
                <span className="font-bold text-[#1E242B]">{appointment.titulo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8F99A3]">Fecha y hora:</span>
                <span className="font-bold text-[#D4AF37]">
                  {appointment.fecha} • {appointment.horaInicio} - {appointment.horaFin} hrs
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase text-[#1E242B] flex items-center justify-between">
                <span>MOTIVO DE CANCELACIÓN</span>
                <span className="text-[#DC2626]">* OBLIGATORIO</span>
              </label>

              <div className="flex flex-wrap gap-2">
                {['Inconveniente paciente', 'Reprogramación', 'Disponibilidad médica'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCancelReasonTag(tag)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      cancelReasonTag === tag
                        ? 'border-[#D4AF37] bg-[#FFFBEB] text-[#92400E]'
                        : 'border-[#E2E6EA] bg-white text-[#687380] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder="Describe detalladamente el motivo de la cancelación de la cita..."
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
                className="w-full rounded-2xl border border-[#E2E6EA] p-3 text-xs text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E6EA]">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E6EA] text-xs font-bold text-[#687380] hover:bg-[#F3F4F6] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-[#DC2626] text-white text-xs font-extrabold hover:bg-[#B91C1C] flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>✓</span> Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Adjuntar Consentimientos Informados (Imagen 4) */}
      {isConsentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-[#E2E6EA] bg-white p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6EA]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#111827] text-[#D4AF37] flex items-center justify-center">
                  📄
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1E242B]">Adjuntar Consentimientos Informados</h3>
                  <p className="text-xs text-[#8F99A3]">Selecciona plantillas registradas en base de datos para asociarlas a esta cita.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConsentModalOpen(false)}
                className="text-[#8F99A3] hover:text-[#1E242B] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-[#687380]">
              <span>Plantillas disponibles en el sistema:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                {selectedConsents.length} seleccionados
              </span>
            </div>

            {availableTemplates.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#8F99A3]">
                No hay plantillas de consentimientos configuradas en el sistema.
              </p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {availableTemplates.map((t) => {
                  const id = t.id_plantilla || t.id;
                  const isSelected = selectedConsents.includes(id);
                  return (
                    <div
                      key={id}
                      onClick={() => {
                        setSelectedConsents((prev) =>
                          isSelected ? prev.filter((item) => item !== id) : [...prev, id]
                        );
                      }}
                      className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#FFFBEB]/40'
                          : 'border-[#E2E6EA] bg-white hover:bg-[#F8F9FA]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-1 h-4 w-4 rounded accent-[#D4AF37]"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-[#1E242B]">{t.titulo || t.nombre}</h4>
                            <span className="text-[10px] text-[#8F99A3]">Activo</span>
                          </div>
                          <p className="text-[11px] text-[#687380] line-clamp-1">{t.descripcion || 'Plantilla oficial OdontoLeal'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E6EA]">
              <button
                type="button"
                onClick={() => setIsConsentModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E2E6EA] text-xs font-bold text-[#687380] hover:bg-[#F3F4F6] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  showAlert({
                    title: 'Consentimientos Asociados',
                    message: `Se han seleccionado ${selectedConsents.length} plantillas para asociar a la atención médica.`,
                    type: 'success',
                  });
                  setIsConsentModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] text-black text-xs font-extrabold hover:bg-[#C29E2F] flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>✓</span> Adjuntar seleccionados ({selectedConsents.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
