// src/modules/appointments/ui/views/PublicBookingPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../../../../shared/ui/components/Button';
import { Input } from '../../../../shared/ui/components/Input';
import { Modal } from '../../../../shared/ui/components/Modal';
import { useAlertModal } from '../../../../shared/ui/hooks/useAlertModal';
import { Badge } from '../../../../shared/ui/components/Badge';

export interface PublicBookingPageProps {
  onNavigateToStaffLogin?: () => void;
  onSubmitPublicBooking?: (bookingData: any) => Promise<void> | void;
}

interface SlotItem {
  inicio: string;
  final: string;
  estado: boolean;
  ocupacion: boolean;
  hora12: string;
  isAvailable: boolean;
}

export const PublicBookingPage: React.FC<PublicBookingPageProps> = ({
  onNavigateToStaffLogin,
  onSubmitPublicBooking,
}) => {
  // 1. Selector de Servicio y Profesional (RF-AGE-012)
  const [servicio, setServicio] = useState<'Odontología general' | 'Ortodoncia'>('Odontología general');

  // 2. Datos del Paciente / Solicitante (RF-AGE-003, RF-HCL-001)
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [genero, setGenero] = useState<'Femenino' | 'Masculino' | 'Indeterminado'>('Femenino');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [motivoConsulta, setMotivoConsulta] = useState('');

  // 3. Ventana de Selección de Fecha: entre 5 y 60 días calendario (Regla de Negocio 2, RF-AGE-003)
  const { minDateStr, maxDateStr, defaultDateStr } = useMemo(() => {
    const today = new Date();
    const minD = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
    const maxD = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    return {
      minDateStr: minD.toISOString().split('T')[0],
      maxDateStr: maxD.toISOString().split('T')[0],
      defaultDateStr: minD.toISOString().split('T')[0],
    };
  }, []);

  const [selectedDate, setSelectedDate] = useState(defaultDateStr);
  const [selectedTime, setSelectedTime] = useState(''); // hora formato 12h ej: "08:30 AM"

  // 4. Autorización de tratamiento de datos personales (RQNF-SEG-005, RQNF-SEG-006)
  const [autorizacionDatos, setAutorizacionDatos] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // 5. Estado de Bloques de Horario cargados desde la API (RF-AGE-003, RQNF-SEG-008)
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // 6. Modales y Alertas
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert, AlertModalComponent } = useAlertModal();

  // Profesional asignado según servicio (RF-AGE-012)
  const idProfesional = servicio === 'Ortodoncia' ? 2 : 1;
  const profesionalNombre = servicio === 'Ortodoncia' ? 'Dra. Natalia Díaz' : 'Dr. Eduar Leal Álvarez';
  const profesionalCargo = servicio === 'Ortodoncia' ? 'Especialista en Ortodoncia' : 'Odontólogo General y Director Médico';

  // Formateador seguro a formato 12h
  const formatSlotTime12h = (timeStr: string): string => {
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const timePart = timeStr.includes(' ') ? timeStr.split(' ')[1] : timeStr;
    const [hStr, mStr] = timePart.split(':');
    const h = Number(hStr) || 0;
    const m = Number(mStr) || 0;
    const isPM = h >= 12;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const period = isPM ? 'PM' : 'AM';
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  };

  // Convertidor de hora 12h a formato 24h HH:mm:00
  const parseHourTo24 = (timeStr: string): string => {
    const isPM = timeStr.toUpperCase().includes('PM');
    const isAM = timeStr.toUpperCase().includes('AM');
    const clean = timeStr.replace(/AM|PM/gi, '').trim();
    let [h, m] = clean.split(':').map(Number);
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}:00`;
  };

  // Carga de disponibilidad real de bloques desde el backend (RF-AGE-003, RQNF-DES-001)
  const fetchSlotsForDate = useCallback(async (date: string) => {
    setIsLoadingSlots(true);
    try {
      const res = await fetch(`/api/v1/appointments/slots?desde=${date} 00:00:00&hasta=${date} 23:59:59`);
      if (res.ok) {
        const json = await res.json();
        const rawSlots: any[] = json.data || [];
        const processedSlots: SlotItem[] = rawSlots.map((raw) => {
          const inicioStr = String(raw.inicio);
          const finalStr = String(raw.final);
          const hora12 = formatSlotTime12h(inicioStr);
          const isAvailable = raw.estado === true && raw.ocupacion === false;
          return {
            inicio: inicioStr,
            final: finalStr,
            estado: raw.estado === true,
            ocupacion: raw.ocupacion === true,
            hora12,
            isAvailable,
          };
        });

        setSlots(processedSlots);

        // Si el horario seleccionado previamente ya no está disponible en la nueva fecha, resetear
        setSelectedTime((prev) => {
          const match = processedSlots.find((s) => s.hora12 === prev);
          return match && match.isAvailable ? prev : '';
        });
      } else {
        setSlots([]);
      }
    } catch (err) {
      console.error('Error al cargar bloques de horario:', err);
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchSlotsForDate(selectedDate);
    }
  }, [selectedDate, fetchSlotsForDate]);

  // Manejador previo de validación antes de abrir el modal de confirmación
  const handlePreConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreCompleto.trim() || !documentoIdentidad.trim() || !correo.trim() || !telefono.trim()) {
      showAlert({
        title: 'Campos Obligatorios Incompletos',
        message: 'Por favor complete su Nombre Completo, Documento de Identidad, Teléfono de Contacto y Correo Electrónico antes de continuar.',
        type: 'warning',
      });
      return;
    }

    if (!selectedTime) {
      showAlert({
        title: 'Horario no Seleccionado',
        message: 'Por favor elija un horario disponible (marcado en verde) para continuar con su solicitud.',
        type: 'warning',
      });
      return;
    }

    // Verificar si el horario seleccionado sigue disponible
    const chosenSlot = slots.find((s) => s.hora12 === selectedTime);
    if (chosenSlot && !chosenSlot.isAvailable) {
      showAlert({
        title: 'Horario no Disponible',
        message: 'El horario seleccionado se encuentra ocupado. Por favor elija un bloque en verde disponible.',
        type: 'error',
      });
      return;
    }

    // Validación de Autorización de Tratamiento de Datos (RQNF-SEG-005, RF-AGE-003)
    if (!autorizacionDatos) {
      showAlert({
        title: 'Autorización Requerida',
        message: 'Debe autorizar el tratamiento de datos personales y aceptar la política de privacidad de OdontoLeal para enviar la solicitud de cita (Ley 1581 de 2012).',
        type: 'warning',
      });
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Envío final de la solicitud al backend
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const time24 = parseHourTo24(selectedTime);
      const bloqueSolicitado = `${selectedDate} ${time24}`;

      const payload = {
        nombreSolicitante: nombreCompleto.trim(),
        documentoSolicitante: documentoIdentidad.trim(),
        correoSolicitante: correo.trim().toLowerCase(),
        telefonoSolicitante: telefono.trim(),
        fechaNacimiento: fechaNacimiento.trim() || undefined,
        genero,
        servicio,
        idProfesional,
        bloqueSolicitado,
        descripcion: motivoConsulta.trim() || 'Solicitud de valoración odontológica',
        autorizacionDatos: true,
      };

      if (onSubmitPublicBooking) {
        await onSubmitPublicBooking(payload);
      }

      const res = await fetch('/api/v1/appointments/public-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setIsConfirmModalOpen(false);

        // Refrescar los bloques para reflejar en tiempo real la ocupación (RQNF-DES-002)
        await fetchSlotsForDate(selectedDate);
        setSelectedTime('');

        showAlert({
          title: 'No se pudo registrar la solicitud',
          message:
            errJson.message ||
            'El bloque horario seleccionado ya no se encuentra disponible. Por favor seleccione otro horario.',
          type: 'error',
        });
        return;
      }

      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);
      // Refrescar para que el bloque recién solicitado pase a rojo
      await fetchSlotsForDate(selectedDate);
    } catch (err: any) {
      console.error('Error al enviar solicitud pública:', err.message);
      setIsConfirmModalOpen(false);
      showAlert({
        title: 'Error de Comunicación',
        message: 'No fue posible comunicar con el servidor para registrar la cita. Verifique su conexión a internet.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E242B] flex flex-col justify-between">
      <AlertModalComponent />

      {/* Header Superior del Portal (RF-USR-006) */}
      <header className="w-full border-b border-[#E2E6EA] bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#111111] text-[#D4AF37] font-extrabold flex items-center justify-center text-sm shadow-xs">
            OL
          </div>
          <div>
            <span className="text-base font-extrabold text-[#1E242B] tracking-tight block">
              OdontoLeal • Portal de Pacientes
            </span>
            <span className="text-[11px] font-bold text-[#8F99A3]">
              Consultorio Odontológico Dr. Eduar Leal Álvarez
            </span>
          </div>
        </div>

        {onNavigateToStaffLogin && (
          <button
            type="button"
            onClick={onNavigateToStaffLogin}
            className="min-h-[40px] rounded-xl border border-[#E2E6EA] px-4 py-2 text-xs font-bold text-[#1E242B] hover:border-[#D4AF37] hover:bg-[#FBF6E6]/40 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <svg className="h-4 w-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Ingreso Personal / Staff
          </button>
        )}
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center rounded-full bg-[#FBF6E6] border border-[#EAD89B] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#8F721A]">
            ✨ Solicitud Pública de Cita
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E242B]">
            Agenda tu Cita Odontológica
          </h1>
          <p className="text-xs sm:text-sm text-[#687380] max-w-xl mx-auto">
            Consulta la disponibilidad en tiempo real y solicita tu valoración médica de forma rápida y sin necesidad de crear cuenta.
          </p>
        </div>

        <form
          onSubmit={handlePreConfirm}
          className="rounded-3xl border border-[#E2E6EA] border-t-4 border-t-[#D4AF37] bg-white p-6 sm:p-8 shadow-md space-y-8"
        >
          {/* PASO 1: Selección de Servicio y Profesional (RF-AGE-012) */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1E242B] flex items-center gap-2 pb-2 border-b border-[#E2E6EA]">
              <span className="h-6 w-6 rounded-full bg-[#111111] text-[#D4AF37] text-xs flex items-center justify-center font-bold">
                1
              </span>
              Selecciona el Servicio Odontológico
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opción 1: Odontología General */}
              <button
                type="button"
                onClick={() => setServicio('Odontología general')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  servicio === 'Odontología general'
                    ? 'border-[#D4AF37] bg-[#FBF6E6]/60 ring-2 ring-[#D4AF37]/50 shadow-xs'
                    : 'border-[#E2E6EA] bg-white hover:border-[#CBD2D9]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-extrabold text-[#1E242B]">Odontología General</span>
                    {servicio === 'Odontología general' && (
                      <span className="h-5 w-5 rounded-full bg-[#D4AF37] text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#687380] mb-2">
                    Valoración inicial, limpiezas, operatoria dental y salud bucal preventiva.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#E2E6EA]/60 flex items-center gap-2 text-[11px] font-bold text-[#8F721A]">
                  <span>👨‍⚕️ Dr. Eduar Leal Álvarez</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-[#EAD89B]">ROL-ODO</span>
                </div>
              </button>

              {/* Opción 2: Ortodoncia */}
              <button
                type="button"
                onClick={() => setServicio('Ortodoncia')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  servicio === 'Ortodoncia'
                    ? 'border-[#D4AF37] bg-[#FBF6E6]/60 ring-2 ring-[#D4AF37]/50 shadow-xs'
                    : 'border-[#E2E6EA] bg-white hover:border-[#CBD2D9]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-extrabold text-[#1E242B]">Ortodoncia Especializada</span>
                    {servicio === 'Ortodoncia' && (
                      <span className="h-5 w-5 rounded-full bg-[#D4AF37] text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#687380] mb-2">
                    Alineación dental, ortodoncia preventiva, brackets y estética oclusal.
                  </p>
                </div>
                <div className="pt-2 border-t border-[#E2E6EA]/60 flex items-center gap-2 text-[11px] font-bold text-[#7C3AED]">
                  <span>👩‍⚕️ Dra. Natalia Díaz</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-purple-200">ROL-ESP</span>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* PASO 2: Datos del Solicitante */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1E242B] flex items-center gap-2 pb-2 border-b border-[#E2E6EA]">
                <span className="h-6 w-6 rounded-full bg-[#111111] text-[#D4AF37] text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Datos del Paciente
              </h3>

              <Input
                label="Nombre Completo"
                required
                placeholder="Ejemplo: Marcela González Ramírez"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Documento de Identidad"
                  required
                  placeholder="1020304050"
                  value={documentoIdentidad}
                  onChange={(e) => setDocumentoIdentidad(e.target.value.replace(/\D/g, ''))}
                  helperText="Solo números sin puntos"
                />

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#687380] mb-1.5">
                    Género <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={genero}
                    onChange={(e) => setGenero(e.target.value as any)}
                    className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-white px-3 py-2 text-xs font-semibold text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Indeterminado">Indeterminado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#687380] mb-1.5">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] px-3 text-xs text-[#1E242B]"
                  />
                </div>

                <Input
                  label="Teléfono / WhatsApp"
                  required
                  placeholder="3001234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <Input
                type="email"
                label="Correo Electrónico"
                required
                placeholder="ejemplo@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                helperText="Enviaremos la confirmación oficial a este correo (RQNF-FIA-004)"
              />

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#687380] mb-1.5">
                  Motivo de la Cita / Síntomas
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe brevemente tus síntomas o el procedimiento que deseas consultar..."
                  value={motivoConsulta}
                  onChange={(e) => setMotivoConsulta(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E6EA] p-3 text-xs text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
                />
              </div>
            </div>

            {/* PASO 3: Fecha y Horario en Tiempo Real (RF-AGE-003, RQNF-USA-001) */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1E242B] flex items-center gap-2 pb-2 border-b border-[#E2E6EA]">
                <span className="h-6 w-6 rounded-full bg-[#111111] text-[#D4AF37] text-xs flex items-center justify-center font-bold">
                  3
                </span>
                Fecha y Horario
              </h3>

              {/* Selector de Fecha con ventana de 5 a 60 días */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#687380]">
                  Seleccione el Día de Atención:
                </label>
                <input
                  type="date"
                  min={minDateStr}
                  max={maxDateStr}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] px-3 text-sm font-bold text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
                />
                <p className="text-[11px] text-[#8F99A3]">
                  💡 Citas disponibles entre 5 y 60 días calendario a partir de hoy (Regla de Negocio 2).
                </p>
              </div>

              {/* Horarios con Disponibilidad en Tiempo Real */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#687380]">
                    Horarios para el {selectedDate}:
                  </label>
                  {/* Leyenda de colores y texto (RQNF-USA-001) */}
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Disponible
                    </span>
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      Ocupado
                    </span>
                  </div>
                </div>

                {isLoadingSlots ? (
                  <div className="p-8 text-center text-xs text-[#8F99A3] flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent"></div>
                    <span>Consultando disponibilidad en tiempo real...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#687380] rounded-2xl border border-dashed border-[#E2E6EA] bg-[#F8F9FA]">
                    No hay bloques de horario configurados para este día. Por favor elija otra fecha.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {slots.map((s, idx) => {
                      const isSelected = selectedTime === s.hora12;
                      const isAvailable = s.isAvailable;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => isAvailable && setSelectedTime(s.hora12)}
                          className={`min-h-[44px] rounded-xl border text-xs font-bold p-2.5 transition-all flex items-center justify-between px-3 ${
                            isSelected
                              ? 'border-[#D4AF37] bg-[#FBF6E6] text-[#1E242B] ring-2 ring-[#D4AF37]/50 shadow-xs'
                              : isAvailable
                              ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer'
                              : 'border-red-200 bg-red-50/60 text-red-700 cursor-not-allowed opacity-75'
                          }`}
                          aria-disabled={!isAvailable}
                          title={isAvailable ? 'Bloque Disponible' : 'Bloque Ocupado o Reservado'}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{isAvailable ? '🕒' : '🔒'}</span>
                            <span>{s.hora12}</span>
                          </div>

                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? 'bg-[#D4AF37] text-white'
                                : isAvailable
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isSelected ? 'Elegido' : isAvailable ? 'Disponible' : 'Ocupado'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Casilla de Autorización de Tratamiento de Datos (RQNF-SEG-005, RQNF-SEG-006) */}
              <div className="pt-2">
                <div className="rounded-2xl border border-[#E2E6EA] p-3.5 bg-[#F8F9FA] space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autorizacionDatos}
                      onChange={(e) => setAutorizacionDatos(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[#CBD2D9] text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
                    />
                    <span className="text-xs text-[#1E242B] font-medium leading-relaxed">
                      Autorizo de manera previa, expresa e informada el tratamiento de mis datos personales según la{' '}
                      <strong>Ley 1581 de 2012</strong> y conforme al{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsPrivacyModalOpen(true);
                        }}
                        className="text-[#8F721A] font-bold underline hover:text-[#D4AF37] cursor-pointer"
                      >
                        Aviso de Privacidad de OdontoLeal
                      </button>
                      . <span className="text-[#DC2626]">*</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Botón de Enviar */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-base py-3"
                  rightIcon={<span>→</span>}
                >
                  Continuar con la Solicitud
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Tarjetas informativas de pie (Reglas y Seguridad) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#E2E6EA] bg-white p-4 space-y-1 text-xs">
            <span className="text-base">📅</span>
            <h4 className="font-extrabold text-[#1E242B]">Antelación Obligatoria</h4>
            <p className="text-[#687380]">
              Las citas se reservan entre 5 y 60 días calendario después de la solicitud (Regla de Negocio 2).
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E6EA] bg-white p-4 space-y-1 text-xs">
            <span className="text-base">✉️</span>
            <h4 className="font-extrabold text-[#1E242B]">Confirmación y Notificación</h4>
            <p className="text-[#687380]">
              Recibirás notificación de solicitud y recordatorio previo 24 horas antes a tu correo (RQNF-FIA-004).
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E6EA] bg-white p-4 space-y-1 text-xs">
            <span className="text-base">📍</span>
            <h4 className="font-extrabold text-[#1E242B]">Consultorio OdontoLeal</h4>
            <p className="text-[#687380]">
              Calle 127 # 14-54, Edificio Medical Prestige, Suite 402, Bogotá • Tel: (601) 745-2020.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E6EA] bg-white py-4 text-center text-xs text-[#8F99A3]">
        © 2026 OdontoLeal • Consultorio Odontológico Dr. Eduar Leal Álvarez • Todos los derechos reservados.
      </footer>

      {/* MODAL 1: Confirmación de Solicitud */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="¿Confirmar tu Solicitud de Cita?"
        subtitle="Por favor verifica los detalles de tu cita antes de enviar la solicitud formal."
        maxWidth="md"
        footer={
          <div className="flex items-center gap-3 w-full justify-end">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleFinalSubmit}
              isLoading={isSubmitting}
              leftIcon={<span>✓</span>}
            >
              Confirmar y Enviar Solicitud
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-2xl border border-[#E2E6EA] p-3.5 bg-[#F8F9FA] space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-[#8F99A3]">Servicio y Profesional</span>
            <p className="font-extrabold text-[#1E242B] text-sm">{servicio}</p>
            <p className="text-[#8F721A] font-bold">{profesionalNombre} • {profesionalCargo}</p>
          </div>

          <div className="rounded-2xl border border-[#E2E6EA] p-3.5 bg-[#F8F9FA] space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-[#8F99A3]">Fecha y Horario</span>
            <p className="font-extrabold text-[#1E242B] text-sm">
              {selectedDate} • {selectedTime}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E6EA] p-3.5 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-[#8F99A3]">Paciente</span>
            <p className="font-bold text-[#1E242B]">{nombreCompleto}</p>
            <p className="text-[#687380]">C.C. {documentoIdentidad} • Tel: +57 {telefono}</p>
            <p className="text-[#687380]">{correo}</p>
          </div>

          <div className="rounded-2xl border border-[#E2E6EA] p-3.5 space-y-1">
            <span className="text-[10px] font-extrabold uppercase text-[#8F99A3]">Motivo</span>
            <p className="italic text-[#1E242B]">&ldquo;{motivoConsulta || 'Valoración odontológica general'}&rdquo;</p>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Solicitud Confirmada Exitosamente (Regla de Negocio 4 y RF-AGE-003) */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title={
          <div className="text-center w-full">
            <div className="h-12 w-12 rounded-full bg-[#E6F4EA] text-[#137333] flex items-center justify-center text-xl mx-auto mb-2">
              ✓
            </div>
            <span className="text-xl font-extrabold text-[#1E242B]">¡Solicitud Recibida con Éxito!</span>
          </div>
        }
        subtitle="Hemos registrado tu solicitud de cita odontológica. Tu bloque ha quedado reservado y se encuentra en estado 'Solicitada' sujeta a aprobación."
        maxWidth="md"
        footer={
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setIsSuccessModalOpen(false)}
          >
            Entendido / Finalizar ✓
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="flex justify-center">
            <Badge label="Estado: Solicitada (En proceso de aprobación)" variant="warning" />
          </div>

          <div className="rounded-2xl border border-[#E2E6EA] p-4 bg-[#F8F9FA] space-y-2">
            <div>
              <span className="text-[10px] font-bold text-[#8F99A3]">SERVICIO & PROFESIONAL</span>
              <p className="font-bold text-[#1E242B]">{servicio} — {profesionalNombre}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#8F99A3]">FECHA Y HORA RESERVADA</span>
              <p className="font-bold text-[#1E242B]">{selectedDate} • {selectedTime}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#8F99A3]">SOLICITANTE</span>
              <p className="font-bold text-[#1E242B]">{nombreCompleto} (C.C. {documentoIdentidad})</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#8F99A3]">NOTIFICACIÓN ENVIADA A</span>
              <p className="font-bold text-[#1E242B]">{correo}</p>
            </div>
          </div>

          {/* Información explícita de Regla de Negocio 4 (Restricción de Cancelación / Cambios) */}
          <div className="rounded-2xl border border-[#EAD89B] bg-[#FBF6E6] p-3.5 space-y-1.5 text-[#8F721A]">
            <p className="font-extrabold flex items-center gap-1.5 text-xs">
              <span>📞</span> Cancelaciones o Modificaciones de Cita
            </p>
            <p className="text-[11px] leading-relaxed">
              Por disposición médica (Regla de Negocio 4), los pacientes no pueden cancelar ni cambiar citas directamente desde la plataforma web. Si requieres cambiar la fecha o cancelar la solicitud, comunícate directamente con la coordinación del consultorio:
            </p>
            <p className="text-xs font-extrabold text-[#1E242B]">
              Teléfono: (601) 745-2020 • WhatsApp: +57 300 123 4567
            </p>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: Aviso de Privacidad y Política de Tratamiento de Datos (RQNF-SEG-006) */}
      <Modal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="Aviso de Privacidad y Tratamiento de Datos"
        subtitle="Cumplimiento Ley Estatutaria 1581 de 2012 y Decreto 1377 de 2013"
        maxWidth="lg"
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setAutorizacionDatos(true);
              setIsPrivacyModalOpen(false);
            }}
          >
            Aceptar y Continuar
          </Button>
        }
      >
        <div className="space-y-3 text-xs text-[#687380] leading-relaxed max-h-[350px] overflow-y-auto pr-2">
          <p>
            El <strong>Consultorio Odontológico Dr. Eduar Leal Álvarez</strong>, identificado con NIT en Bogotá D.C., en calidad de Responsable del Tratamiento de Datos Personales, informa que la información personal y médica suministrada a través de esta plataforma será tratada de manera confidencial y segura conforme a la <strong>Ley 1581 de 2012</strong>.
          </p>
          <h5 className="font-bold text-[#1E242B] text-xs pt-1">Finalidades del Tratamiento:</h5>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>Gestión y confirmación del agendamiento de citas odontológicas.</li>
            <li>Apertura y custodia de la historia clínica odontológica conforme a la Resolución 1995 de 1999.</li>
            <li>Envío de confirmaciones, recordatorios de consulta y comunicaciones asistenciales.</li>
            <li>Cumplimiento de las obligaciones sanitarias ante el Ministerio de Salud y la Secretaría de Salud.</li>
          </ul>
          <h5 className="font-bold text-[#1E242B] text-xs pt-1">Derechos del Titular:</h5>
          <p className="text-[11px]">
            Conocer, actualizar, rectificar y suprimir sus datos personales, así como revocar la autorización otorgada, mediante solicitud dirigida al consultorio en la Calle 127 # 14-54, Bogotá, o al correo oficial de atención.
          </p>
        </div>
      </Modal>
    </div>
  );
};
