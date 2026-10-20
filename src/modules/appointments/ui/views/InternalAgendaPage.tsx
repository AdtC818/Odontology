// src/modules/appointments/ui/views/InternalAgendaPage.tsx
import React, { useState, useEffect } from 'react';
import { useRealtimeAgenda } from '../hooks/useRealtimeAgenda';
import { WeeklyCalendarGrid, CalendarTimeSlot } from '../components/WeeklyCalendarGrid';
import { QuickScheduleModal, DoctorCandidate, PatientCandidate } from '../components/QuickScheduleModal';
import { RequestReviewModal, AppointmentRequestDetail } from '../components/RequestReviewModal';
import { AppointmentDetailModal, AppointmentDetailData } from '../components/AppointmentDetailModal';
import { EditAppointmentModal } from '../components/EditAppointmentModal';
import { Button } from '../../../../shared/ui/components/Button';
import { Badge } from '../../../../shared/ui/components/Badge';
import { usePatients } from '../../../patients/ui/hooks/usePatients';
import { useAlertModal } from '../../../../shared/ui/hooks/useAlertModal';

export interface InternalAgendaPageProps {
  onStartAttention?: (idCita: number, idPaciente: number) => void;
  onOpenConsultationWorkspace?: (patientId: number, idCita: number) => void;
}

export const InternalAgendaPage: React.FC<InternalAgendaPageProps> = ({
  onStartAttention,
  onOpenConsultationWorkspace,
}) => {
  const {
    selectedDate,
    setSelectedDate,
    slots,
    requests,
    waitingRoom,
    filterMode,
    setFilterMode,
    doctorFilter,
    setDoctorFilter,
    fetchAgenda,
    startAttention,
    endAttention,
    cancelAppointment,
    markNoShow,
    toggleSlotStatus,
    approveRequest,
    rejectRequest,
  } = useRealtimeAgenda();

  const { patients } = usePatients();
  const [doctors, setDoctors] = useState<DoctorCandidate[]>([]);
  const { showAlert, AlertModalComponent } = useAlertModal();

  // Modales
  const [isQuickScheduleOpen, setIsQuickScheduleOpen] = useState(false);
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState<AppointmentDetailData | null>(null);
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<AppointmentRequestDetail | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentDetailData | null>(null);

  // Carga de doctores reales desde base de datos / API
  useEffect(() => {
    fetch('/api/v1/users')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        const userList: any[] = json.data || [];
        const doctorCandidates: DoctorCandidate[] = userList
          .filter((u) => u.estado !== false)
          .map((u) => ({
            idUsuario: Number(u.id_usuario ?? u.idUsuario),
            nombreCompleto: u.nombre_completo ?? u.nombreCompleto ?? 'Doctor',
            especialidad:
              u.roles?.[0]?.nombreRol ||
              u.roles?.[0]?.nombre_rol ||
              'Odontología General',
          }));

        if (doctorCandidates.length > 0) {
          setDoctors(doctorCandidates);
        } else {
          // Fallback con el profesional registrado en BD (Dr. Eduar Leal)
          setDoctors([
            { idUsuario: 1, nombreCompleto: 'Dr. Eduar Leal Álvarez', especialidad: 'Director Odontológico' },
          ]);
        }
      })
      .catch(() => {
        setDoctors([
          { idUsuario: 1, nombreCompleto: 'Dr. Eduar Leal Álvarez', especialidad: 'Director Odontológico' },
        ]);
      });
  }, []);

  const patientCandidates: PatientCandidate[] = patients.map((p) => ({
    idPaciente: p.idPaciente,
    nombreCompleto: p.nombreCompleto,
    documentoIdentidad: p.documentoIdentidad,
    telefono: p.telefono,
    correo: p.correo,
  }));

  const handleSlotClick = (slot: CalendarTimeSlot) => {
    if (!slot.idCita) return;

    if (slot.estadoCita === 'Pendiente de confirmación') {
      const req = requests.find((r) => r.horaSolicitada === slot.horaInicio) || {
        idSolicitud: 1,
        nombrePaciente: slot.pacienteNombre || 'Paciente Solicitante',
        documentoIdentidad: '1020456789',
        telefono: '3158901234',
        correo: 'paciente@odontoleal.com',
        fechaSolicitada: selectedDate,
        horaSolicitada: slot.horaInicio,
        motivoConsulta: slot.tratamiento || 'Valoración odontológica solicitada',
        esPacienteNuevo: true,
      };
      setSelectedRequestForReview(req);
      return;
    }

    const matchedPatient = patients.find(
      (p) => p.nombreCompleto === slot.pacienteNombre
    );

    setSelectedSlotForDetail({
      idCita: slot.idCita,
      idPaciente: matchedPatient?.idPaciente || 1,
      nombrePaciente: slot.pacienteNombre || 'Paciente',
      documentoIdentidad: matchedPatient?.documentoIdentidad || '1020456789',
      telefono: matchedPatient?.telefono || '3158901234',
      correo: matchedPatient?.correo || 'paciente@odontoleal.com',
      motivo: slot.tratamiento || 'Consulta Odontológica',
      doctorNombre: slot.doctorNombre || 'Dr. Eduar Leal Álvarez',
      idDoctor: 1,
      fecha: selectedDate,
      horaInicio: slot.horaInicio,
      horaFin: slot.horaFin,
      estado: (slot.estadoCita as any) || 'Confirmada',
    });
  };

  const handleConfirmSchedule = async (apptData: {
    idPaciente: number;
    idDoctor: number;
    fecha: string;
    bloques: string[];
    motivo: string;
    observaciones?: string;
  }) => {
    try {
      const formattedBlocks = apptData.bloques.map((b) => {
        const start = b.split('-')[0].trim();
        return `${apptData.fecha} ${start}:00`;
      });

      const res = await fetch('/api/v1/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: apptData.motivo,
          descripcion: apptData.observaciones,
          idPaciente: apptData.idPaciente,
          idUsuarioProfesional: apptData.idDoctor,
          idUsuarioGestor: 1,
          bloques: formattedBlocks,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Error al guardar la cita');
      }

      setIsQuickScheduleOpen(false);
      fetchAgenda();
      showAlert({
        title: '¡Cita Confirmada!',
        message: 'La cita ha sido registrada exitosamente en la agenda médica y en la base de datos.',
        type: 'success',
      });
    } catch (err: any) {
      showAlert({
        title: 'Error al agendar cita',
        message: err.message || 'No fue posible programar la cita. Verifique la disponibilidad de los bloques.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <AlertModalComponent />
      {/* Header Superior con Botón + Nueva Cita */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E242B]">
            Agenda de Citas
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#687380]">
            Control en tiempo real de sillones, citas programadas, sala de espera y solicitudes web.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsQuickScheduleOpen(true)}
          leftIcon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Nueva Cita
        </Button>
      </div>

      {/* Barra de Filtros (Pages 8, 9, 10) */}
      <div className="rounded-2xl border border-[#E7E7E3] bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#687380]">Filtrar bloques:</span>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="rounded-xl border border-[#E7E7E3] bg-[#F3F3F1] px-3 py-2 text-xs font-bold text-[#1E242B] focus:border-[#D4AF37] focus:bg-white focus:outline-none"
            >
              <option value="appointments_only">Solo bloques con citas</option>
              <option value="all">Todos los bloques</option>
              <option value="requests_only">Solicitudes</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#687380]">Filtrar por doctor:</span>
            <input
              type="text"
              placeholder="Escribir o buscar doctor..."
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="rounded-xl border border-[#E7E7E3] bg-[#F3F3F1] px-3 py-1.5 text-xs text-[#1E242B] placeholder-[#687380] focus:border-[#D4AF37] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {requests.length > 0 && (
          <div onClick={() => setFilterMode('requests_only')} className="cursor-pointer">
            <Badge
              label={`${requests.length} Solicitud pendiente`}
              variant="warning"
              icon={<span>🔔</span>}
            />
          </div>
        )}
      </div>

      {/* Layout Principal a Dos Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Lateral Izquierda (4 columnas): Mini Calendario + Sala de Espera */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-[#E7E7E3] bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E3]">
              <span className="text-sm font-extrabold text-[#1E242B]">Calendario Médico</span>
              <span className="text-xs font-bold text-[#D4AF37]">{selectedDate}</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map((d, i) => (
                <span key={i} className="font-bold text-[#687380] text-[10px] pb-1">{d}</span>
              ))}
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const dayStr = day.toString().padStart(2, '0');
                const isCurrentSelected = selectedDate.endsWith(`-${dayStr}`);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const prefix = selectedDate.slice(0, 8);
                      setSelectedDate(`${prefix}${dayStr}`);
                    }}
                    className={`h-9 w-9 mx-auto rounded-xl flex flex-col items-center justify-center text-xs transition-all ${
                      isCurrentSelected
                        ? 'bg-[#111111] text-[#D4AF37] font-extrabold shadow-xs'
                        : 'text-[#1E242B] hover:bg-[#F3F3F1]'
                    }`}
                  >
                    <span>{day}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sala de Espera */}
          <div className="rounded-3xl border border-[#E7E7E3] bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🛋️</span>
                <h3 className="text-sm font-extrabold text-[#1E242B]">Sala de Espera</h3>
              </div>
              <Badge label={`${waitingRoom.length} paciente`} variant="warning" size="sm" />
            </div>

            {waitingRoom.length === 0 ? (
              <p className="text-xs text-[#687380] py-2">No hay pacientes esperando turno actualmente.</p>
            ) : (
              waitingRoom.map((p) => (
                <div
                  key={p.idCita}
                  className="rounded-2xl border border-[#E7E7E3] bg-[#FBF3D5]/40 p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#1E242B]">
                      {p.nombrePaciente}
                    </span>
                    <span className="text-[11px] font-bold text-[#B8942A]">
                      Esperando {p.minutosEspera} min
                    </span>
                  </div>
                  <p className="text-[11px] text-[#687380]">
                    Cita: {p.horaCita} • {p.doctorNombre}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha (8 columnas): Agenda del Día */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-[#E7E7E3] bg-white p-3.5 shadow-xs flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 1);
                setSelectedDate(prev.toISOString().split('T')[0]);
              }}
              className="text-xs font-bold text-[#687380] hover:text-[#1E242B] px-3 py-1.5 rounded-xl border border-[#E7E7E3]"
            >
              ← Día anterior
            </button>
            <div className="text-center">
              <span className="text-xs font-extrabold text-[#D4AF37] block">
                AGENDA MÉDICA
              </span>
              <span className="text-sm font-extrabold text-[#1E242B]">
                {selectedDate}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 1);
                setSelectedDate(next.toISOString().split('T')[0]);
              }}
              className="text-xs font-bold text-[#687380] hover:text-[#1E242B] px-3 py-1.5 rounded-xl border border-[#E7E7E3]"
            >
              Día siguiente →
            </button>
          </div>

          <WeeklyCalendarGrid
            slots={slots}
            filterMode={filterMode}
            onSelectSlot={handleSlotClick}
            onToggleSlotStatus={toggleSlotStatus}
            onScheduleSlot={() => setIsQuickScheduleOpen(true)}
          />
        </div>
      </div>

      {/* Modal: Agendamiento Rápido con datos reales */}
      <QuickScheduleModal
        isOpen={isQuickScheduleOpen}
        onClose={() => setIsQuickScheduleOpen(false)}
        patients={patientCandidates}
        doctors={doctors}
        initialDate={selectedDate}
        onConfirmSchedule={handleConfirmSchedule}
      />

      {/* Modal: Detalle de Cita */}
      <AppointmentDetailModal
        isOpen={Boolean(selectedSlotForDetail)}
        onClose={() => setSelectedSlotForDetail(null)}
        appointment={selectedSlotForDetail}
        onStartAttention={(idCita) => {
          startAttention(idCita);
          const currentPatientId = selectedSlotForDetail?.idPaciente || 1;
          setSelectedSlotForDetail(null);
          if (onStartAttention) onStartAttention(idCita, currentPatientId);
          if (onOpenConsultationWorkspace) onOpenConsultationWorkspace(currentPatientId, idCita);
        }}
        onEndAttention={(idCita) => {
          endAttention(idCita);
          setSelectedSlotForDetail(null);
        }}
        onOpenEvolution={(appt) => {
          setSelectedSlotForDetail(null);
          if (onOpenConsultationWorkspace) {
            onOpenConsultationWorkspace(appt.idPaciente, appt.idCita);
          }
        }}
        onEditAppointment={(appt) => {
          setSelectedSlotForDetail(null);
          setEditingAppointment(appt);
        }}
        onCancelAppointment={(idCita, motivo) => {
          cancelAppointment(idCita, motivo);
          setSelectedSlotForDetail(null);
        }}
        onMarkNoShow={(idCita, motivo) => {
          markNoShow(idCita, motivo);
          setSelectedSlotForDetail(null);
        }}
        onSignConsent={(idConsentimiento) => {
          showAlert({
            title: 'Firma de Consentimiento',
            message: `Habilitando terminal táctil de firma para el consentimiento informado #${idConsentimiento}.`,
            type: 'info',
          });
        }}
      />

      {/* Modal: Editar Cita */}
      <EditAppointmentModal
        isOpen={Boolean(editingAppointment)}
        onClose={() => setEditingAppointment(null)}
        appointment={editingAppointment}
        doctors={doctors}
        onSaveReschedule={(_idCita) => {
          setEditingAppointment(null);
          fetchAgenda();
          showAlert({
            title: 'Cita Reprogramada',
            message: 'La cita ha sido modificada y actualizada en la agenda médica exitosamente.',
            type: 'success',
          });
        }}
      />

      {/* Modal: Revisar Solicitud */}
      <RequestReviewModal
        isOpen={Boolean(selectedRequestForReview)}
        onClose={() => setSelectedRequestForReview(null)}
        request={selectedRequestForReview}
        onApprove={async (idSolicitud) => {
          await approveRequest(idSolicitud);
          setSelectedRequestForReview(null);
          showAlert({
            title: 'Solicitud Aprobada',
            message: 'La solicitud ha sido aprobada y la cita se encuentra ahora en estado Confirmada en la agenda médica.',
            type: 'success',
          });
        }}
        onReject={async (idSolicitud, motivo) => {
          await rejectRequest(idSolicitud, motivo);
          setSelectedRequestForReview(null);
          showAlert({
            title: 'Solicitud Rechazada',
            message: 'La solicitud ha sido rechazada y los bloques horarios han sido liberados.',
            type: 'info',
          });
        }}
      />
    </div>
  );
};
