// src/modules/appointments/ui/components/QuickScheduleModal.tsx
import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/components/Modal';
import { Button } from '../../../../shared/ui/components/Button';
import { Input } from '../../../../shared/ui/components/Input';
import { Badge } from '../../../../shared/ui/components/Badge';
import { useAlertModal } from '../../../../shared/ui/hooks/useAlertModal';

export interface PatientCandidate {
  idPaciente: number;
  nombreCompleto: string;
  documentoIdentidad: string;
  telefono: string;
  correo: string;
}

export interface DoctorCandidate {
  idUsuario: number;
  nombreCompleto: string;
  especialidad: string;
  registro?: string;
}

export interface QuickScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: PatientCandidate[];
  doctors: DoctorCandidate[];
  initialSelectedPatient?: PatientCandidate | null;
  initialDate?: string;
  onConfirmSchedule: (appointmentData: {
    idPaciente: number;
    idDoctor: number;
    fecha: string;
    bloques: string[];
    motivo: string;
    observaciones?: string;
    consentimientos: string[];
  }) => Promise<void> | void;
  onOpenNewPatientModal?: () => void;
  isLoading?: boolean;
}

export const QuickScheduleModal: React.FC<QuickScheduleModalProps> = ({
  isOpen,
  onClose,
  patients,
  doctors,
  initialSelectedPatient = null,
  initialDate = new Date().toISOString().split('T')[0],
  onConfirmSchedule,
  onOpenNewPatientModal,
  isLoading = false,
}) => {
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientCandidate | null>(
    initialSelectedPatient
  );

  const [motivo, setMotivo] = useState('Valoración Odontológica');
  const [observaciones, setObservaciones] = useState('');
  const { showAlert, AlertModalComponent } = useAlertModal();

  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(
    doctors[0]?.idUsuario || 1
  );

  const [fecha, setFecha] = useState(initialDate);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(['14:00-14:30', '14:30-15:00']);

  const [consentimientos, setConsentimientos] = useState<string[]>([
    'Consentimiento para Cirugía de Implante Dental y Regeneración Ósea',
    'Consentimiento Informado para Anestesia Local y Sedación Consciente',
    'Consentimiento General de Tratamiento Odontológico y Diagnóstico 3D',
  ]);

  const availableBlocks = [
    '08:00-08:30',
    '08:30-09:00',
    '09:00-09:30',
    '10:00-10:30',
    '14:00-14:30',
    '14:30-15:00',
    '15:00-15:30',
    '16:00-16:30',
  ];

  const filteredPatients = patients.filter(
    (p) =>
      p.nombreCompleto.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.documentoIdentidad.includes(patientSearch)
  );

  const toggleBlockSelection = (block: string) => {
    setSelectedBlocks((prev) =>
      prev.includes(block) ? prev.filter((b) => b !== block) : [...prev, block].sort()
    );
  };

  const removeConsent = (title: string) => {
    setConsentimientos((prev) => prev.filter((c) => c !== title));
  };

  const handleConfirm = () => {
    if (!selectedPatient) {
      showAlert({
        title: 'Paciente No Seleccionado',
        message: 'Debe seleccionar un paciente de la lista o registrar uno nuevo para agendar la cita.',
        type: 'warning',
      });
      return;
    }
    if (selectedBlocks.length === 0) {
      showAlert({
        title: 'Bloque Horario Faltante',
        message: 'Debe seleccionar al menos un bloque de horario disponible para la cita.',
        type: 'warning',
      });
      return;
    }

    onConfirmSchedule({
      idPaciente: selectedPatient.idPaciente,
      idDoctor: selectedDoctorId,
      fecha,
      bloques: selectedBlocks,
      motivo,
      observaciones,
      consentimientos,
    });
  };

  return (
    <>
      <AlertModalComponent />
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Programar Nueva Cita"
      subtitle="Complete los datos del paciente y defina los bloques continuos requeridos en la agenda."
      maxWidth="4xl"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isLoading}
            leftIcon={<span>📅</span>}
          >
            Confirmar Cita
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Paso 1: Selección de Paciente */}
        <div className="rounded-2xl border border-[#E2E6EA] p-5 space-y-3 bg-[#F8F9FA]/60">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1E242B] flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-[#111111] text-[#D4AF37] text-xs flex items-center justify-center font-bold">
                1
              </span>
              Información del Paciente
            </h4>
            {onOpenNewPatientModal && (
              <button
                type="button"
                onClick={onOpenNewPatientModal}
                className="text-xs font-bold text-[#D4AF37] hover:underline"
              >
                + Registrar nuevo paciente
              </button>
            )}
          </div>

          {selectedPatient ? (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-[#D4AF37] shadow-xs">
              <div>
                <p className="text-sm font-extrabold text-[#1E242B]">
                  {selectedPatient.nombreCompleto}
                </p>
                <p className="text-xs text-[#687380]">
                  C.C. {selectedPatient.documentoIdentidad} • Tel: +57 {selectedPatient.telefono} • {selectedPatient.correo}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPatient(null)}>
                Cambiar paciente
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Escriba nombre o cédula para buscar paciente..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              {patientSearch && (
                <div className="max-h-36 overflow-y-auto rounded-xl border border-[#E2E6EA] bg-white divide-y divide-[#E2E6EA]">
                  {filteredPatients.map((p) => (
                    <div
                      key={p.idPaciente}
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientSearch('');
                      }}
                      className="p-2.5 text-xs hover:bg-[#FBF6E6] cursor-pointer flex justify-between items-center"
                    >
                      <span className="font-bold text-[#1E242B]">{p.nombreCompleto}</span>
                      <span className="text-[#8F99A3]">CC {p.documentoIdentidad}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Paso 2: Detalles del Tratamiento y Profesional */}
        <div className="rounded-2xl border border-[#E2E6EA] p-5 space-y-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1E242B] flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-[#111111] text-[#D4AF37] text-xs flex items-center justify-center font-bold">
              2
            </span>
            Detalles del Tratamiento y Profesional
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Título o Motivo Principal"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#687380] mb-1.5">
                Doctor / Profesional Encargado <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] bg-white px-3.5 py-2 text-sm text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
              >
                {doctors.map((doc) => (
                  <option key={doc.idUsuario} value={doc.idUsuario}>
                    {doc.nombreCompleto} ({doc.especialidad})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#687380] mb-1.5">
              Descripción y Observaciones Clínicas
            </label>
            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full rounded-xl border border-[#E2E6EA] p-3 text-xs text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
        </div>

        {/* Paso 3: Fecha y Bloques Horarios Disponibles */}
        <div className="rounded-2xl border border-[#E2E6EA] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1E242B] flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-[#111111] text-[#D4AF37] text-xs flex items-center justify-center font-bold">
                3
              </span>
              Fecha y Bloques Horarios Disponibles
            </h4>
            <span className="text-xs font-bold text-[#D4AF37]">
              {selectedBlocks.length * 30} min total ({selectedBlocks.length} bloques contiguos)
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#687380] mb-1">
                Fecha de la Cita:
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-[#E2E6EA] px-3 text-sm font-semibold text-[#1E242B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {availableBlocks.map((b, idx) => {
              const isSelected = selectedBlocks.includes(b);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleBlockSelection(b)}
                  className={`min-h-[44px] rounded-xl border text-xs font-bold p-2.5 transition-all text-center ${
                    isSelected
                      ? 'border-[#D4AF37] bg-[#FBF6E6] text-[#1E242B] ring-2 ring-[#D4AF37]/40 shadow-xs'
                      : 'border-[#E2E6EA] bg-white text-[#687380] hover:border-[#CBD2D9]'
                  }`}
                >
                  <span className="block">{b}</span>
                  <span className="text-[10px] text-[#8F99A3]">
                    {isSelected ? '✓ Seleccionado' : 'Disponible'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Paso 4: Consentimientos Informados */}
        <div className="rounded-2xl border border-[#E2E6EA] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1E242B] flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-[#111111] text-[#D4AF37] text-xs flex items-center justify-center font-bold">
                4
              </span>
              Consentimientos Informados ({consentimientos.length} vinculados)
            </h4>
          </div>

          <div className="space-y-2">
            {consentimientos.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FA] border border-[#E2E6EA] text-xs"
              >
                <div className="flex items-center gap-2">
                  <Badge label="Pendiente de firma" variant="warning" size="sm" />
                  <span className="font-bold text-[#1E242B]">{item}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeConsent(item)}
                  className="text-xs text-[#DC2626] hover:underline font-semibold"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
    </>
  );
};
