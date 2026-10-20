// src/modules/clinical-records/ui/components/MedicalBackgroundForm.tsx
import React, { useState } from 'react';
import { Button } from '../../../../shared/ui/components/Button';
import { Badge } from '../../../../shared/ui/components/Badge';

export interface BackgroundItem {
  id: string;
  tipo: string;
  descripcionTipo: string;
  presenta: boolean;
  observaciones: string;
}

export interface OralHabitItem {
  id: string;
  habito: string;
  aplica: boolean;
  frecuencia: string;
  observaciones: string;
}

export interface MedicalBackgroundFormProps {
  initialBackgrounds?: BackgroundItem[];
  initialHabits?: OralHabitItem[];
  readOnly?: boolean;
  onChange?: (backgrounds: BackgroundItem[], habits: OralHabitItem[]) => void;
}

const DEFAULT_BACKGROUNDS: BackgroundItem[] = [
  { id: '1', tipo: 'Accidentes o Traumas', descripcionTipo: 'Golpes, fracturas faciales, traumatismos a nivel maxilar.', presenta: false, observaciones: '' },
  { id: '2', tipo: 'Cirugías', descripcionTipo: 'Intervenciones previas, cesárea, anestesia general.', presenta: false, observaciones: '' },
  { id: '3', tipo: 'Patológicos', descripcionTipo: 'Hipertensión, diabetes, cardiopatías, asma, VIH.', presenta: false, observaciones: '' },
  { id: '4', tipo: 'Farmacológicos', descripcionTipo: 'Medicamentos habituales, anticoagulantes, analgésicos.', presenta: false, observaciones: '' },
  { id: '5', tipo: 'Inmunológicos / Alergias', descripcionTipo: 'Alergias a medicamentos (penicilina, anestésicos) o látex.', presenta: false, observaciones: '' },
  { id: '6', tipo: 'Familiares', descripcionTipo: 'Cardiopatías, diabetes mellitus, cáncer, maloclusiones.', presenta: false, observaciones: '' },
  { id: '7', tipo: 'Otros Hábitos / Prácticas', descripcionTipo: 'Bruxismo, onicofagia, uso de chupos o respiración oral.', presenta: false, observaciones: '' },
];

const DEFAULT_HABITS: OralHabitItem[] = [
  { id: 'h1', habito: 'Bebe alcohol', aplica: false, frecuencia: 'No consume', observaciones: '' },
  { id: 'h2', habito: 'Fuma / Tabaco o Vapeo', aplica: false, frecuencia: 'No fuma', observaciones: '' },
  { id: 'h3', habito: 'Mastica chicle / Golosinas', aplica: false, frecuencia: 'Ocasional', observaciones: '' },
  { id: 'h4', habito: 'Cepillado dental', aplica: true, frecuencia: '3 veces al día', observaciones: '' },
  { id: 'h5', habito: 'Uso de seda dental', aplica: false, frecuencia: 'Ocasional', observaciones: '' },
  { id: 'h6', habito: 'Chequeos odontológicos periódicos', aplica: false, frecuencia: 'Cada 6 meses', observaciones: '' },
];

export const MedicalBackgroundForm: React.FC<MedicalBackgroundFormProps> = ({
  initialBackgrounds = DEFAULT_BACKGROUNDS,
  initialHabits = DEFAULT_HABITS,
  readOnly = false,
  onChange,
}) => {
  const [backgrounds, setBackgrounds] = useState<BackgroundItem[]>(initialBackgrounds);
  const [habits, setHabits] = useState<OralHabitItem[]>(initialHabits);

  const handleMarkAllNo = () => {
    if (readOnly) return;
    const updatedBg = backgrounds.map((b) => ({
      ...b,
      presenta: false,
      observaciones: 'N/A - Niega antecedentes patológicos en la anamnesis actual.',
    }));
    setBackgrounds(updatedBg);
    onChange?.(updatedBg, habits);
  };

  const updateBackground = (id: string, presenta: boolean, observaciones: string) => {
    if (readOnly) return;
    const next = backgrounds.map((b) => (b.id === id ? { ...b, presenta, observaciones } : b));
    setBackgrounds(next);
    onChange?.(next, habits);
  };

  const updateHabit = (id: string, aplica: boolean, frecuencia: string, observaciones: string) => {
    if (readOnly) return;
    const next = habits.map((h) => (h.id === id ? { ...h, aplica, frecuencia, observaciones } : h));
    setHabits(next);
    onChange?.(backgrounds, next);
  };

  return (
    <div className="space-y-8">
      {/* Sección 2: Antecedentes Clínicos del Paciente (Page 17) */}
      <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E6EA]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#D4AF37]">MÓDULO CLÍNICO</span>
              <span className="text-xs text-[#8F99A3]">• Antecedentes</span>
            </div>
            <h3 className="text-base font-extrabold text-[#1E242B]">
              2. Antecedentes Clínicos del Paciente
            </h3>
            <p className="text-xs text-[#687380]">
              Registro sistemático de antecedentes médicos, quirúrgicos y farmacológicos relevantes para la atención odontológica.
            </p>
          </div>

          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={handleMarkAllNo}
              leftIcon={<span>✓</span>}
            >
              Marcar todo con &ldquo;NO&rdquo; y &ldquo;N/A&rdquo;
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8F9FA] text-[10px] font-extrabold uppercase text-[#687380] border-b border-[#E2E6EA]">
              <tr>
                <th className="p-3 w-1/3">Tipo de Antecedente</th>
                <th className="p-3 text-center w-28">¿Presenta?</th>
                <th className="p-3">Observaciones / Detalle Clínico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EA]">
              {backgrounds.map((bg) => (
                <tr key={bg.id} className="hover:bg-[#FBF6E6]/30 transition-colors">
                  <td className="p-3 align-top">
                    <p className="font-extrabold text-[#1E242B]">{bg.tipo}</p>
                    <p className="text-[11px] text-[#8F99A3] mt-0.5">{bg.descripcionTipo}</p>
                  </td>
                  <td className="p-3 align-top text-center">
                    <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-[#F8F9FA] border border-[#E2E6EA]">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => updateBackground(bg.id, true, bg.observaciones)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                          bg.presenta
                            ? 'bg-[#EF4444] text-white shadow-2xs'
                            : 'text-[#687380] hover:text-black'
                        }`}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => updateBackground(bg.id, false, bg.observaciones)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                          !bg.presenta
                            ? 'bg-[#1E242B] text-white shadow-2xs'
                            : 'text-[#687380] hover:text-black'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </td>
                  <td className="p-3 align-top">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={bg.observaciones}
                      onChange={(e) => updateBackground(bg.id, bg.presenta, e.target.value)}
                      placeholder="Indique detalles o N/A..."
                      className="w-full rounded-xl border border-[#CBD2D9] px-3 py-1.5 text-xs text-[#1E242B] bg-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 3: Hábitos y Rutina de Higiene Oral (Page 17) */}
      <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-4">
        <div className="pb-3 border-b border-[#E2E6EA]">
          <h3 className="text-base font-extrabold text-[#1E242B]">
            3. Hábitos y Rutina de Higiene Oral
          </h3>
          <p className="text-xs text-[#687380]">
            Evaluación de hábitos comportamentales, exposición y protección constante de salud bucodental.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8F9FA] text-[10px] font-extrabold uppercase text-[#687380] border-b border-[#E2E6EA]">
              <tr>
                <th className="p-3 w-1/4">Hábito / Práctica</th>
                <th className="p-3 text-center w-24">¿Aplica?</th>
                <th className="p-3 w-1/4">Frecuencia / Cantidad</th>
                <th className="p-3">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EA]">
              {habits.map((h) => (
                <tr key={h.id} className="hover:bg-[#FBF6E6]/30 transition-colors">
                  <td className="p-3 align-top font-bold text-[#1E242B]">{h.habito}</td>
                  <td className="p-3 align-top text-center">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => updateHabit(h.id, !h.aplica, h.frecuencia, h.observaciones)}
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold border transition-all ${
                        h.aplica
                          ? 'bg-[#10B981] text-white border-[#10B981]'
                          : 'bg-[#F8F9FA] text-[#687380] border-[#E2E6EA]'
                      }`}
                    >
                      {h.aplica ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="p-3 align-top">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={h.frecuencia}
                      onChange={(e) => updateHabit(h.id, h.aplica, e.target.value, h.observaciones)}
                      className="w-full rounded-xl border border-[#CBD2D9] px-2.5 py-1 text-xs text-[#1E242B] bg-white"
                    />
                  </td>
                  <td className="p-3 align-top">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={h.observaciones}
                      onChange={(e) => updateHabit(h.id, h.aplica, h.frecuencia, e.target.value)}
                      className="w-full rounded-xl border border-[#CBD2D9] px-2.5 py-1 text-xs text-[#1E242B] bg-white"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
