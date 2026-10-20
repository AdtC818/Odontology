// src/modules/clinical-records/ui/components/EvolutionTemplateEditor.tsx
import React, { useState } from 'react';
import { OdontogramCanvas } from './OdontogramCanvas';
import { MedicalBackgroundForm } from './MedicalBackgroundForm';
import { StomatognathicExamForm } from './StomatognathicExamForm';
import { Button } from '../../../../shared/ui/components/Button';
import { Badge } from '../../../../shared/ui/components/Badge';
import { OdontogramDataDTO } from '../../infrastructure/clinical-record.model';
import { useAlertModal } from '../../../../shared/ui/hooks/useAlertModal';

export type EvolutionTab =
  | 'ENTRADA'
  | 'ANTECEDENTES'
  | 'EXAMEN_FISICO'
  | 'HALLAZGOS_PROCEDIMIENTO'
  | 'PLAN_MANEJO';

export interface EvolutionFormData {
  motivoConsulta: string;
  enfermedadActual: string;
  procedimientoRealizado: string;
  diagnostico: string;
  accionesARealizar: string;
  observaciones: string;
  odontograma: OdontogramDataDTO;
  antecedentes?: any;
  examenFisico?: any;
  planManejo?: any;
}

export interface EvolutionTemplateEditorProps {
  initialData?: Partial<EvolutionFormData>;
  patientName: string;
  patientAge?: number;
  patientSex?: string;
  patientDoc?: string;
  doctorName?: string;
  readOnly?: boolean;
  onSaveDraft?: (data: EvolutionFormData) => void;
  onSubmitOfficial?: (data: EvolutionFormData) => void;
  onOpenExpandedOdontogram?: () => void;
}

export const EvolutionTemplateEditor: React.FC<EvolutionTemplateEditorProps> = ({
  initialData,
  patientName,
  patientAge,
  patientSex,
  patientDoc = '',
  doctorName = 'Dr. Eduar Leal Álvarez',
  readOnly = false,
  onSaveDraft,
  onSubmitOfficial,
  onOpenExpandedOdontogram,
}) => {
  const { showAlert, AlertModalComponent } = useAlertModal();
  const [activeTab, setActiveTab] = useState<EvolutionTab>('ENTRADA');

  // Tab 1: Entrada / Anamnesis
  const [motivoConsulta, setMotivoConsulta] = useState(
    initialData?.motivoConsulta || ''
  );
  const [enfermedadActual, setEnfermedadActual] = useState(
    initialData?.enfermedadActual || ''
  );

  // Tab 4: Hallazgos y Procedimiento
  const [procedimientoRealizado, setProcedimientoRealizado] = useState(
    initialData?.procedimientoRealizado || ''
  );
  const [diagnostico, setDiagnostico] = useState(
    initialData?.diagnostico || ''
  );
  const [accionesARealizar, setAccionesARealizar] = useState(
    initialData?.accionesARealizar || ''
  );
  const [observaciones, setObservaciones] = useState(
    initialData?.observaciones || ''
  );

  const [odontogramState, setOdontogramState] = useState<OdontogramDataDTO>(
    initialData?.odontograma as any
  );

  // Opciones rápidas de autocompletado (Page 16)
  const quickReasons = [
    'Tengo un dolor de muela muy fuerte',
    'Se me cayó una calza',
    'Vengo para una limpieza dental de rutina',
    'Se me partió un diente',
    'Me sangran las encías al cepillarme',
    'Siento los dientes destemplados con el frío o el calor',
    'Vengo a revisión general',
    'Se me despegó un bracket',
    'Me chuzan los alambres',
    'Vengo a ponerme una calza',
    'La prótesis no me queda bien',
    'Quiero hacerme un blanqueamiento dental',
  ];

  const handleAutofillNA = () => {
    setEnfermedadActual(
      'N/A - Consulta preventiva o de rutina sin patología dolorosa activa referida por el paciente.'
    );
  };

  const getFullFormData = (): EvolutionFormData => ({
    motivoConsulta,
    enfermedadActual,
    procedimientoRealizado,
    diagnostico,
    accionesARealizar,
    observaciones,
    odontograma: odontogramState,
  });

  const handleSaveDraft = () => {
    onSaveDraft?.(getFullFormData());
    showAlert({
      title: 'Borrador Guardado',
      message: 'Los datos del borrador de evolución se han guardado localmente de forma segura.',
      type: 'success',
    });
  };

  const handleSubmit = () => {
    if (!motivoConsulta.trim()) {
      showAlert({
        title: 'Campo Obligatorio Faltante',
        message: 'El Motivo de Consulta es obligatorio conforme a la normativa médica (RF-AGE-009 / Resolución 1995 de 1999). Por favor complételo en la pestaña "Entrada / Anamnesis".',
        type: 'warning',
      });
      setActiveTab('ENTRADA');
      return;
    }
    if (!procedimientoRealizado.trim()) {
      showAlert({
        title: 'Campo Obligatorio Faltante',
        message: 'El Procedimiento Realizado es obligatorio para certificar la atención odontológica. Por favor descríbalo en la pestaña "Hallazgos y Procedimiento".',
        type: 'warning',
      });
      setActiveTab('HALLAZGOS_PROCEDIMIENTO');
      return;
    }
    onSubmitOfficial?.(getFullFormData());
  };

  return (
    <div className="space-y-6">
      <AlertModalComponent />
      {/* Barra de Pestañas de Navegación (Pages 16 a 20) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white border border-[#E2E6EA] shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('ENTRADA')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'ENTRADA'
              ? 'bg-[#1E242B] text-white shadow-xs'
              : 'text-[#687380] hover:text-[#1E242B]'
          }`}
        >
          <span>1. Entrada</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ANTECEDENTES')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'ANTECEDENTES'
              ? 'bg-[#1E242B] text-white shadow-xs'
              : 'text-[#687380] hover:text-[#1E242B]'
          }`}
        >
          <span>2. Antecedentes</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('EXAMEN_FISICO')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'EXAMEN_FISICO'
              ? 'bg-[#1E242B] text-white shadow-xs'
              : 'text-[#687380] hover:text-[#1E242B]'
          }`}
        >
          <span>3. Examen Físico</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HALLAZGOS_PROCEDIMIENTO')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'HALLAZGOS_PROCEDIMIENTO'
              ? 'bg-[#1E242B] text-white shadow-xs'
              : 'text-[#687380] hover:text-[#1E242B]'
          }`}
        >
          <span>4. Hallazgos y Procedimiento</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PLAN_MANEJO')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
            activeTab === 'PLAN_MANEJO'
              ? 'bg-[#1E242B] text-white shadow-xs'
              : 'text-[#687380] hover:text-[#1E242B]'
          }`}
        >
          <span>5. Plan de Manejo y Conducta</span>
        </button>
      </div>

      {/* PESTAÑA 1: ENTRADA / ANAMNESIS (Page 16) */}
      {activeTab === 'ENTRADA' && (
        <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-[#E2E6EA]">
            <h3 className="text-base font-extrabold text-[#1E242B]">
              1. Anamnesis (Interrogatorio)
            </h3>
            <p className="text-xs text-[#687380]">
              Registro de la información aportada directamente por el paciente al inicio de la valoración o tratamiento odontológico.
            </p>
          </div>

          {/* Motivo de Consulta */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#1E242B] flex items-center gap-2">
                <span>Motivo de Consulta</span>
                <Badge label="REQUERIDO" variant="danger" size="sm" />
              </label>
              <span className="text-[11px] text-[#8F99A3]">Palabras textuales del paciente</span>
            </div>

            <input
              type="text"
              disabled={readOnly}
              value={motivoConsulta}
              onChange={(e) => setMotivoConsulta(e.target.value)}
              placeholder="Ej: Vengo a revisión general o describe el motivo del paciente..."
              className="w-full min-h-[44px] rounded-xl border border-[#E2E6EA] px-3.5 py-2 text-xs text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
            />

            {/* Opciones rápidas de autocompletado */}
            {!readOnly && (
              <div className="rounded-2xl border border-[#E2E6EA] bg-[#F8F9FA] p-4 space-y-2">
                <span className="text-[11px] font-extrabold uppercase text-[#D4AF37] block">
                  ✦ Opciones Rápidas de Autocompletado (Casos Generales)
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickReasons.map((reason, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMotivoConsulta(reason)}
                      className="px-2.5 py-1 rounded-lg border border-[#CBD2D9] bg-white text-[11px] font-semibold text-[#4B5563] hover:border-[#D4AF37] hover:text-[#1E242B] transition-all"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enfermedad Actual */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#1E242B]">
                Enfermedad Actual (Cronología y detalles)
              </label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleAutofillNA}
                  className="text-xs font-bold text-[#D4AF37] hover:underline"
                >
                  Autorellenar con N/A (No Aplica)
                </button>
              )}
            </div>

            <textarea
              rows={4}
              disabled={readOnly}
              value={enfermedadActual}
              onChange={(e) => setEnfermedadActual(e.target.value)}
              placeholder="Describe inicio, localización, características del dolor y síntomas, intensidad y factores agravantes/atenuantes, o seleccione N/A si no aplica patología..."
              className="w-full rounded-xl border border-[#E2E6EA] p-3 text-xs text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setActiveTab('ANTECEDENTES')}>
              Continuar a Antecedentes →
            </Button>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ANTECEDENTES (Page 17) */}
      {activeTab === 'ANTECEDENTES' && (
        <div className="space-y-4">
          <MedicalBackgroundForm readOnly={readOnly} />
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setActiveTab('ENTRADA')}>
              ← Volver a Entrada
            </Button>
            <Button variant="primary" onClick={() => setActiveTab('EXAMEN_FISICO')}>
              Continuar a Examen Físico →
            </Button>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: EXAMEN FÍSICO (Page 18) */}
      {activeTab === 'EXAMEN_FISICO' && (
        <div className="space-y-4">
          <StomatognathicExamForm readOnly={readOnly} />
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setActiveTab('ANTECEDENTES')}>
              ← Volver a Antecedentes
            </Button>
            <Button variant="primary" onClick={() => setActiveTab('HALLAZGOS_PROCEDIMIENTO')}>
              Continuar a Hallazgos y Procedimiento →
            </Button>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: HALLAZGOS Y PROCEDIMIENTO (Page 19) */}
      {activeTab === 'HALLAZGOS_PROCEDIMIENTO' && (
        <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E6EA]">
            <div>
              <span className="text-xs font-extrabold text-[#D4AF37] uppercase">
                MÓDULO CLÍNICO • Odontología General & Especialidad
              </span>
              <h3 className="text-base font-extrabold text-[#1E242B]">
                4. Hallazgos y Procedimiento Clínico
              </h3>
              <p className="text-xs text-[#687380]">
                Registro detallado del odontograma, acto clínico operatorio, codificación diagnóstica y conducta terapéutica inmediata.
              </p>
            </div>
            {onOpenExpandedOdontogram && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenExpandedOdontogram}
                leftIcon={<span>🔍</span>}
              >
                Ver y Editar Odontograma
              </Button>
            )}
          </div>

          {/* Odontograma Integrado */}
          <OdontogramCanvas
            initialData={odontogramState}
            readOnly={readOnly}
            onSave={(data) => setOdontogramState(data)}
            onOpenExpandedMode={onOpenExpandedOdontogram}
          />

          {/* Procedimiento Realizado */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#1E242B] flex items-center gap-2">
                <span>Procedimiento Realizado</span>
                <Badge label="OBLIGATORIO" variant="danger" size="sm" />
              </label>
              <span className="text-[11px] text-[#8F99A3]">
                Descripción minuciosa del acto operatorio e instrumental empleado
              </span>
            </div>
            <textarea
              rows={4}
              disabled={readOnly}
              value={procedimientoRealizado}
              onChange={(e) => setProcedimientoRealizado(e.target.value)}
              className="w-full rounded-xl border border-[#E2E6EA] p-3 text-xs text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          {/* Diagnóstico Generado */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-[#1E242B]">
              Diagnóstico Generado (CIE-10 / Presuntivo)
            </label>
            <textarea
              rows={2}
              disabled={readOnly}
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              className="w-full rounded-xl border border-[#E2E6EA] p-3 text-xs text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          {/* Acciones a Realizar y Observaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#687380] mb-1">
                Acciones a Realizar
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                value={accionesARealizar}
                onChange={(e) => setAccionesARealizar(e.target.value)}
                className="w-full rounded-xl border border-[#E2E6EA] p-2.5 text-xs text-[#1E242B]"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[#687380] mb-1">
                Observaciones Generales
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full rounded-xl border border-[#E2E6EA] p-2.5 text-xs text-[#1E242B]"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[#E2E6EA]">
            <Button variant="outline" onClick={() => setActiveTab('EXAMEN_FISICO')}>
              ← Volver a Examen Físico
            </Button>
            <Button variant="primary" onClick={() => setActiveTab('PLAN_MANEJO')}>
              Continuar a Plan de Manejo →
            </Button>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: PLAN DE MANEJO Y CONDUCTA (Page 20) */}
      {activeTab === 'PLAN_MANEJO' && (
        <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-[#E2E6EA]">
            <span className="text-xs font-extrabold text-[#D4AF37] uppercase">
              MÓDULO CLÍNICO • Terapéutica y Gestión Médica
            </span>
            <h3 className="text-base font-extrabold text-[#1E242B]">
              5. Plan de Manejo y Conducta
            </h3>
            <p className="text-xs text-[#687380]">
              Prescripción farmacológica con posología detallada, emisión de incapacidad médica / excusa laboral y formulación de remisiones a interconsulta especializada.
            </p>
          </div>

          {/* Tarjeta Informativa de Documentos Derivados */}
          <div className="rounded-2xl border border-[#CBD2D9] bg-[#F8F9FA] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-[#1E242B]">
                  Documentos Clínicos Asignados en esta Consulta
                </h4>
                <p className="text-xs text-[#687380]">
                  Puede emitir o imprimir los documentos directamente desde las pestañas o generar la constancia oficial al guardar.
                </p>
              </div>
              <Badge label="Sesión en Curso" variant="gold" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#E2E6EA] text-xs">
                <span className="font-extrabold text-[#1E242B] block">💊 Prescripción Farmacológica</span>
                <span className="text-[#8F99A3] mt-1 block">Amoxicilina + Clavulánico, Ibuprofeno</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E6EA] text-xs">
                <span className="font-extrabold text-[#1E242B] block">🛌 Incapacidad Médica</span>
                <span className="text-[#8F99A3] mt-1 block">2 días de reposo relativo</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E6EA] text-xs">
                <span className="font-extrabold text-[#1E242B] block">↗️ Remisión Especializada</span>
                <span className="text-[#8F99A3] mt-1 block">Endodoncia Microscópica</span>
              </div>
            </div>
          </div>

          {/* Acciones Finales (Page 19) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E2E6EA]">
            <Button variant="ghost" onClick={handleSaveDraft}>
              Guardar como borrador
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setActiveTab('HALLAZGOS_PROCEDIMIENTO')}>
                ← Volver a Procedimiento
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                leftIcon={<span>🖋️</span>}
                className="shadow-lg"
              >
                Autofirmar y Guardar en Historia Clínica
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
