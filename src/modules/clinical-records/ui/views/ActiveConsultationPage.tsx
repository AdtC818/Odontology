// src/modules/clinical-records/ui/views/ActiveConsultationPage.tsx
import React, { useState, useMemo } from 'react';
import { EvolutionTemplateEditor, EvolutionFormData } from '../components/EvolutionTemplateEditor';
import { OdontogramCanvas } from '../components/OdontogramCanvas';
import { useClinicalRecord } from '../hooks/useClinicalRecord';
import { Button } from '../../../../shared/ui/components/Button';
import { Badge } from '../../../../shared/ui/components/Badge';
import { Modal } from '../../../../shared/ui/components/Modal';
import { useAlertModal } from '../../../../shared/ui/hooks/useAlertModal';

export interface ActiveConsultationPageProps {
  idPaciente: number;
  idCita: number;
  patientName: string;
  patientDoc: string;
  patientPhone?: string;
  patientEmail?: string;
  doctorName?: string;
  treatmentTitle?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  onBackToAgenda: () => void;
  onFinishConsultation: (idCita: number) => void;
}

export const ActiveConsultationPage: React.FC<ActiveConsultationPageProps> = ({
  idPaciente,
  idCita,
  patientName,
  patientDoc,
  patientPhone = '',
  patientEmail = '',
  doctorName = 'Dr. Eduar Leal Álvarez',
  treatmentTitle = 'Atención y Valoración Odontológica',
  appointmentDate,
  appointmentTime,
  onBackToAgenda,
  onFinishConsultation,
}) => {
  const { currentOdontogram, saveEvolutionEntry } = useClinicalRecord(idPaciente);
  const { showAlert, showConfirm, AlertModalComponent } = useAlertModal();

  // Modal de Odontograma Ampliado
  const [isExpandedOdontogramOpen, setIsExpandedOdontogramOpen] = useState(false);
  const [workingOdontogram, setWorkingOdontogram] = useState(currentOdontogram);

  // Iniciales del paciente para avatar
  const initials = useMemo(() => {
    return (patientName || 'Paciente')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }, [patientName]);

  // Fecha legible
  const displayDate = useMemo(() => {
    if (appointmentDate) return appointmentDate;
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  }, [appointmentDate]);

  // Hallazgos y notas clínicas reales del odontograma activo
  const toothNotes = useMemo(() => {
    const list: Array<{ fdi: number; zona: string; descripcion: string }> = [];
    if (workingOdontogram?.cuadrantes) {
      Object.values(workingOdontogram.cuadrantes).forEach((quadrant) => {
        if (quadrant?.piezas) {
          Object.values(quadrant.piezas).forEach((tooth) => {
            if (tooth.nota_clinica?.descripcion) {
              list.push({
                fdi: tooth.codigo_fdi,
                zona: tooth.nota_clinica.zona_afectada || 'General',
                descripcion: tooth.nota_clinica.descripcion,
              });
            } else if (tooth.simbolos_tecnicos) {
              const syms = tooth.simbolos_tecnicos;
              const activeSyms: string[] = [];
              if (syms.corona) activeSyms.push('Corona');
              if (syms.implante) activeSyms.push('Implante');
              if (syms.endodoncia) activeSyms.push('Endodoncia');
              if (syms.diente_extraido) activeSyms.push('Diente Extraído');
              if (syms.extraccion_requerida) activeSyms.push('Extracción Requerida');
              if (syms.protesis_fija) activeSyms.push('Prótesis Fija');
              if (syms.puente) activeSyms.push('Puente');
              if (activeSyms.length > 0) {
                list.push({
                  fdi: tooth.codigo_fdi,
                  zona: tooth.nombre_anatomico || `Pieza ${tooth.codigo_fdi}`,
                  descripcion: `Hallazgo clínico: ${activeSyms.join(', ')}.`,
                });
              }
            }
          });
        }
      });
    }
    return list;
  }, [workingOdontogram]);

  const handleOfficialSubmit = async (formData: EvolutionFormData) => {
    try {
      await saveEvolutionEntry({
        idCita,
        motivoConsulta: formData.motivoConsulta,
        enfermedadActual: formData.enfermedadActual,
        procedimientoRealizado: formData.procedimientoRealizado,
        diagnostico: formData.diagnostico,
        accionesARealizar: formData.accionesARealizar,
        observaciones: formData.observaciones,
        odontograma: workingOdontogram || formData.odontograma,
      });

      showAlert({
        title: '¡Evolución Registrada con Éxito!',
        message: 'La evolución clínica y el odontograma se han firmado y guardado inalterablemente en la Historia Clínica del paciente (Resolución 1995/1999).',
        type: 'success',
        confirmText: 'Aceptar',
        onConfirm: () => onFinishConsultation(idCita),
      });
    } catch (err: any) {
      showAlert({
        title: 'No se pudo guardar la evolución clínica',
        message: err.message || 'Ocurrió un error al procesar el registro clínico. Por favor verifique los campos obligatorios e intente nuevamente.',
        type: 'error',
      });
    }
  };

  const handleFinishConsultationClick = () => {
    showConfirm({
      title: '¿Finalizar Atención de la Cita?',
      message: 'Esta acción dará por concluida la consulta activa y registrará la cita como Atendida en la agenda médica.',
      confirmText: 'Sí, finalizar cita',
      cancelText: 'Volver a la consulta',
      onConfirm: () => onFinishConsultation(idCita),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <AlertModalComponent />

      {/* Barra Superior de Navegación y Cierre de Consulta */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToAgenda}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#687380] hover:text-[#1E242B]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a la Agenda
        </button>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleFinishConsultationClick}
            leftIcon={<span>🏁</span>}
          >
            Terminar Cita
          </Button>
        </div>
      </div>

      {/* Header Resumen de la Cita en Curso */}
      <div className="rounded-3xl border-2 border-[#D4AF37]/50 bg-white p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1E242B]">
              {treatmentTitle}
            </h1>
            <Badge label="En consulta" variant="gold" />
          </div>
          <p className="text-xs text-[#687380]">
            📅 {displayDate} {appointmentTime ? `• ${appointmentTime} hrs` : ''} • {doctorName}
          </p>
        </div>

        {/* Resumen del Paciente */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F9FA] border border-[#E2E6EA] text-xs">
          <div className="h-10 w-10 rounded-xl bg-[#1E242B] text-[#D4AF37] font-bold flex items-center justify-center">
            {initials}
          </div>
          <div>
            <p className="font-extrabold text-[#1E242B]">{patientName}</p>
            <p className="text-[#8F99A3]">
              C.C. {patientDoc} {patientPhone ? `• Tel: +57 ${patientPhone}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Editor Completo de Evolución con 5 Pestañas */}
      <EvolutionTemplateEditor
        patientName={patientName}
        patientDoc={patientDoc}
        doctorName={doctorName}
        initialData={{
          odontograma: workingOdontogram,
        }}
        onSubmitOfficial={handleOfficialSubmit}
        onOpenExpandedOdontogram={() => setIsExpandedOdontogramOpen(true)}
      />

      {/* MODAL PANTALLA COMPLETA: Odontograma Clínico FDI - Modo Edición Ampliada */}
      <Modal
        isOpen={isExpandedOdontogramOpen}
        onClose={() => setIsExpandedOdontogramOpen(false)}
        maxWidth="full"
        title="Odontograma Clínico FDI — Modo Edición Ampliada"
        subtitle={`Paciente: ${patientName} • Odontólogo: ${doctorName}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => setIsExpandedOdontogramOpen(false)}>
              ✕ Cerrar
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setIsExpandedOdontogramOpen(false);
                showAlert({
                  title: 'Odontograma Actualizado',
                  message: 'Los hallazgos y notas del odontograma ampliado se han aplicado correctamente a la consulta activa.',
                  type: 'success',
                });
              }}
              leftIcon={<span>✓</span>}
            >
              Guardar y Aplicar Cambios
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <OdontogramCanvas
            initialData={workingOdontogram}
            onSave={(updated) => setWorkingOdontogram(updated)}
          />

          {/* Tabla inferior de Observaciones y Notas Clínicas por Pieza Dental */}
          <div className="rounded-2xl border border-[#E2E6EA] bg-[#F8F9FA] p-4 space-y-2">
            <span className="text-xs font-extrabold uppercase text-[#1E242B] block">
              Observaciones y Notas Clínicas por Pieza Dental
            </span>
            {toothNotes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {toothNotes.map((note) => (
                  <div key={note.fdi} className="p-2.5 rounded-xl bg-white border border-[#E2E6EA]">
                    <strong className="text-[#D4AF37]">Pieza {note.fdi} ({note.zona}):</strong>
                    <p className="text-[#687380] mt-0.5">{note.descripcion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8F99A3] italic py-2">
                No hay observaciones o notas clínicas registradas en piezas dentales. Al seleccionar y modificar piezas en el odontograma, aparecerán aquí.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
