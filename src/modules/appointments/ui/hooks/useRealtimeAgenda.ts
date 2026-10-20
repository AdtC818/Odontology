// src/modules/appointments/ui/hooks/useRealtimeAgenda.ts
import { useState, useEffect, useCallback } from 'react';
import { CalendarTimeSlot } from '../components/WeeklyCalendarGrid';
import { AppointmentRequestDetail } from '../components/RequestReviewModal';

export interface WaitingRoomPatient {
  idCita: number;
  nombrePaciente: string;
  horaCita: string;
  doctorNombre: string;
  minutosEspera: number;
}

export function useRealtimeAgenda(apiBaseUrl = '/api/v1') {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Fecha actual en Colombia o fecha por defecto
    const today = new Date().toISOString().split('T')[0];
    return today;
  });
  const [slots, setSlots] = useState<CalendarTimeSlot[]>([]);
  const [requests, setRequests] = useState<AppointmentRequestDetail[]>([]);
  const [filterMode, setFilterMode] = useState<'appointments_only' | 'all' | 'requests_only'>(
    'appointments_only'
  );
  const [doctorFilter, setDoctorFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formateador de horas HH:mm
  const formatTimeHHmm = (dateStr: string | Date): string => {
    if (!dateStr) return '00:00';
    if (typeof dateStr === 'string' && dateStr.includes(':')) {
      const parts = dateStr.split(' ');
      const timePart = parts.length > 1 ? parts[1] : parts[0];
      const [h, m] = timePart.split(':');
      if (h !== undefined && m !== undefined) {
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? '00:00'
      : `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // Sala de espera calculada de citas en estado 'En espera'
  const waitingRoom: WaitingRoomPatient[] = slots
    .filter((s) => s.estadoCita === 'En espera')
    .map((s) => ({
      idCita: s.idCita!,
      nombrePaciente: s.pacienteNombre || 'Paciente en sala',
      horaCita: s.horaInicio,
      doctorNombre: s.doctorNombre || 'Odontólogo Asignado',
      minutosEspera: 5,
    }));

  // Fetch agenda real desde base de datos
  const fetchAgenda = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Obtener citas de la agenda
      const agendaRes = await fetch(`${apiBaseUrl}/appointments/agenda`);
      const agendaJson = agendaRes.ok ? await agendaRes.json() : { data: [] };
      const agendaItems: any[] = agendaJson.data || [];

      // 2. Obtener bloques de horario configurados para la fecha seleccionada
      const slotsRes = await fetch(
        `${apiBaseUrl}/appointments/slots?desde=${selectedDate} 00:00:00&hasta=${selectedDate} 23:59:59`
      );
      const slotsJson = slotsRes.ok ? await slotsRes.json() : { data: [] };
      const rawSlots: any[] = slotsJson.data || [];

      // Mapeo de citas activas por bloque de horario
      const appointmentsByBlock = new Map<string, any>();
      for (const appt of agendaItems) {
        if (Array.isArray(appt.bloques)) {
          for (const b of appt.bloques) {
            appointmentsByBlock.set(String(b), appt);
          }
        }
      }

      // Si hay bloques reales en la base de datos para esta fecha
      if (rawSlots.length > 0) {
        const unifiedSlots: CalendarTimeSlot[] = rawSlots.map((raw, idx) => {
          const inicioStr = String(raw.inicio);
          const finalStr = String(raw.final);
          const matchedAppt = appointmentsByBlock.get(inicioStr);

          return {
            idBloque: idx + 1,
            horaInicio: formatTimeHHmm(inicioStr),
            horaFin: formatTimeHHmm(finalStr),
            habilitado: raw.estado === true,
            idCita: matchedAppt ? matchedAppt.idCita : null,
            pacienteNombre: matchedAppt ? matchedAppt.nombrePaciente : null,
            tratamiento: matchedAppt ? matchedAppt.titulo : null,
            doctorNombre: matchedAppt ? matchedAppt.nombreProfesional : null,
            estadoCita: matchedAppt ? matchedAppt.estado : null,
          };
        });

        setSlots(unifiedSlots);
      } else {
        // Si aún no se han generado bloques para este día, mostramos las citas directamente si existen
        const directSlots: CalendarTimeSlot[] = agendaItems.map((appt, idx) => ({
          idBloque: idx + 1,
          horaInicio: formatTimeHHmm(appt.bloques?.[0] || '08:00'),
          horaFin: formatTimeHHmm(appt.bloques?.[appt.bloques.length - 1] || '09:00'),
          habilitado: true,
          idCita: appt.idCita,
          pacienteNombre: appt.nombrePaciente,
          tratamiento: appt.titulo,
          doctorNombre: appt.nombreProfesional,
          estadoCita: appt.estado,
        }));
        setSlots(directSlots);
      }
    } catch (err: any) {
      console.error('Error fetching real agenda:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, selectedDate]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  // Transiciones de estado de cita en la base de datos (RF-AGE-009, RF-AGE-013)
  const changeStateAPI = async (
    idCita: number,
    nuevoEstado: string,
    motivo: string,
    liberarBloques?: boolean
  ) => {
    try {
      const res = await fetch(`${apiBaseUrl}/appointments/${idCita}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuevoEstado,
          idUsuarioGestor: 1,
          motivo,
          liberarBloques,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Error al cambiar estado de cita');
      }
      // Actualizar estado local reactivo
      setSlots((prev) =>
        prev.map((s) => (s.idCita === idCita ? { ...s, estadoCita: nuevoEstado as any } : s))
      );
    } catch (err: any) {
      console.error('Error al actualizar estado:', err.message);
      setError(err.message);
      throw err;
    }
  };

  const startAttention = useCallback((idCita: number) => {
    changeStateAPI(idCita, 'En consulta', 'Inicio de atención clínica');
  }, []);

  const endAttention = useCallback((idCita: number) => {
    changeStateAPI(idCita, 'Completada', 'Atención finalizada con éxito');
  }, []);

  const cancelAppointment = useCallback((idCita: number, motivo: string) => {
    changeStateAPI(idCita, 'Cancelada', motivo, true);
  }, []);

  const markNoShow = useCallback((idCita: number, motivo: string) => {
    changeStateAPI(idCita, 'No asistió', motivo, false);
  }, []);

  const toggleSlotStatus = useCallback(
    async (slot: CalendarTimeSlot) => {
      try {
        const inicio = `${selectedDate} ${slot.horaInicio}:00`;
        const final = `${selectedDate} ${slot.horaFin}:00`;
        await fetch(`${apiBaseUrl}/appointments/slots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inicio,
            final,
            estado: !slot.habilitado,
          }),
        });
        setSlots((prev) =>
          prev.map((s) =>
            s.idBloque === slot.idBloque ? { ...s, habilitado: !s.habilitado } : s
          )
        );
      } catch (err: any) {
        console.error('Error toggling slot:', err.message);
      }
    },
    [apiBaseUrl, selectedDate]
  );

  const approveRequest = useCallback(
    async (idSolicitud: number) => {
      try {
        await fetch(`${apiBaseUrl}/appointments/requests/${idSolicitud}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idUsuarioGestor: 1,
            aprobar: true,
            motivo: 'Aprobada formalmente por el consultorio',
          }),
        });
        setRequests((prev) => prev.filter((r) => r.idSolicitud !== idSolicitud));
        fetchAgenda();
      } catch (err: any) {
        console.error('Error approving request:', err.message);
      }
    },
    [apiBaseUrl, fetchAgenda]
  );

  const rejectRequest = useCallback(
    async (idSolicitud: number, motivo: string) => {
      try {
        await fetch(`${apiBaseUrl}/appointments/requests/${idSolicitud}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idUsuarioGestor: 1,
            aprobar: false,
            motivo,
          }),
        });
        setRequests((prev) => prev.filter((r) => r.idSolicitud !== idSolicitud));
        fetchAgenda();
      } catch (err: any) {
        console.error('Error rejecting request:', err.message);
      }
    },
    [apiBaseUrl, fetchAgenda]
  );

  return {
    selectedDate,
    setSelectedDate,
    slots,
    setSlots,
    requests,
    waitingRoom,
    filterMode,
    setFilterMode,
    doctorFilter,
    setDoctorFilter,
    isLoading,
    error,
    fetchAgenda,
    startAttention,
    endAttention,
    cancelAppointment,
    markNoShow,
    toggleSlotStatus,
    approveRequest,
    rejectRequest,
  };
}
