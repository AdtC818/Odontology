// src/modules/appointments/ui/components/WeeklyCalendarGrid.tsx
import React from 'react';
import { Badge } from '../../../../shared/ui/components/Badge';

export interface CalendarTimeSlot {
  idBloque: number;
  horaInicio: string; // "08:00"
  horaFin: string; // "08:30"
  habilitado: boolean;
  idCita?: number | null;
  pacienteNombre?: string | null;
  tratamiento?: string | null;
  doctorNombre?: string | null;
  estadoCita?:
    | 'Confirmada'
    | 'En consulta'
    | 'En espera'
    | 'Completada'
    | 'Cancelada'
    | 'No asistió'
    | 'Pendiente de confirmación'
    | null;
}

export interface WeeklyCalendarGridProps {
  slots: CalendarTimeSlot[];
  filterMode: 'all' | 'appointments_only' | 'requests_only';
  onSelectSlot?: (slot: CalendarTimeSlot) => void;
  onToggleSlotStatus?: (slot: CalendarTimeSlot) => void;
  onScheduleSlot?: (slot: CalendarTimeSlot) => void;
}

export const WeeklyCalendarGrid: React.FC<WeeklyCalendarGridProps> = ({
  slots,
  filterMode,
  onSelectSlot,
  onToggleSlotStatus,
  onScheduleSlot,
}) => {
  const filteredSlots = slots.filter((slot) => {
    if (filterMode === 'appointments_only') {
      return Boolean(slot.idCita && slot.estadoCita !== 'Pendiente de confirmación');
    }
    if (filterMode === 'requests_only') {
      return slot.estadoCita === 'Pendiente de confirmación';
    }
    return true; // 'all'
  });

  const getStatusBadge = (estado: CalendarTimeSlot['estadoCita']) => {
    switch (estado) {
      case 'Completada':
        return <Badge label="Completada" variant="success" size="sm" />;
      case 'En consulta':
        return <Badge label="En consulta" variant="gold" size="sm" />;
      case 'En espera':
        return <Badge label="En espera" variant="warning" size="sm" />;
      case 'Confirmada':
        return <Badge label="Confirmada" variant="info" size="sm" />;
      case 'Pendiente de confirmación':
        return <Badge label="Pendiente de confirmación" variant="warning" size="sm" />;
      case 'No asistió':
        return <Badge label="No asistió" variant="danger" size="sm" />;
      case 'Cancelada':
        return <Badge label="Cancelada" variant="neutral" size="sm" />;
      default:
        return null;
    }
  };

  if (filteredSlots.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E2E6EA] bg-white p-8 text-center text-xs text-[#8F99A3]">
        No hay bloques ni citas que coincidan con el filtro seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredSlots.map((slot) => {
        const hasAppointment = Boolean(slot.idCita);

        // Caso 1: Bloque con Cita o Solicitud
        if (hasAppointment) {
          return (
            <div
              key={slot.idBloque}
              onClick={() => onSelectSlot?.(slot)}
              className="rounded-2xl border border-[#E2E6EA] bg-white p-4 shadow-xs hover:border-[#D4AF37] hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-4">
                <div className="text-center font-extrabold text-[#1E242B] border-r border-[#E2E6EA] pr-4 flex-shrink-0">
                  <span className="text-sm block">{slot.horaInicio}</span>
                  <span className="text-xs text-[#8F99A3]">{slot.horaFin}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-[#1E242B]">
                      {slot.pacienteNombre}
                    </h4>
                    {getStatusBadge(slot.estadoCita)}
                  </div>
                  <p className="text-xs text-[#687380] mt-0.5">
                    {slot.tratamiento} {slot.doctorNombre ? `• ${slot.doctorNombre}` : ''}
                  </p>
                </div>
              </div>

              <div className="self-end sm:self-center flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs font-bold text-[#D4AF37] hover:text-[#B8942A] inline-flex items-center gap-1"
                >
                  Gestionar Cita →
                </button>
              </div>
            </div>
          );
        }

        // Caso 2: Bloque libre o deshabilitado (Vista "Todos los bloques")
        const isEnabled = slot.habilitado;

        return (
          <div
            key={slot.idBloque}
            className={`rounded-2xl border p-3.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isEnabled
                ? 'border-[#E2E6EA] bg-white'
                : 'border-dashed border-[#CBD2D9] bg-[#F8F9FA] opacity-75'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-center font-bold text-[#687380] border-r border-[#E2E6EA] pr-4 flex-shrink-0">
                <span className="text-sm block">{slot.horaInicio}</span>
                <span className="text-xs text-[#8F99A3]">{slot.horaFin}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8F99A3]">
                  {isEnabled ? '🟢 Sin cita asignada (Disponible)' : '⚪ Bloque no habilitado'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => onToggleSlotStatus?.(slot)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#E2E6EA] text-[#687380] hover:bg-[#F3F4F6] transition-colors"
              >
                {isEnabled ? 'Deshabilitar bloque' : 'Habilitar bloque'}
              </button>

              {isEnabled && onScheduleSlot && (
                <button
                  type="button"
                  onClick={() => onScheduleSlot(slot)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#D4AF37] text-black hover:bg-[#B8942A] transition-colors"
                >
                  Agendar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
