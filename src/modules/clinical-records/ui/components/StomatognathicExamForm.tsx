// src/modules/clinical-records/ui/components/StomatognathicExamForm.tsx
import React, { useState } from 'react';
import { Button } from '../../../../shared/ui/components/Button';

export interface AnatomicalStructureExam {
  id: string;
  nombre: string;
  descripcion: string;
  presentaAnormalidad: boolean;
  observaciones: string;
}

export interface StomatognathicExamFormProps {
  initialStructures?: AnatomicalStructureExam[];
  initialGeneralNotes?: string;
  readOnly?: boolean;
  onChange?: (structures: AnatomicalStructureExam[], generalNotes: string) => void;
}

const DEFAULT_STRUCTURES: AnatomicalStructureExam[] = [
  { id: '1', nombre: 'Labios', descripcion: 'Superior, inferior y comisuras labiales.', presentaAnormalidad: false, observaciones: '' },
  { id: '2', nombre: 'Lengua', descripcion: 'Dorso, bordes laterales, cara ventral y base.', presentaAnormalidad: false, observaciones: '' },
  { id: '3', nombre: 'Carrillos / Mucosa Yugal', descripcion: 'Línea alba, desembocadura conducto Stenon.', presentaAnormalidad: false, observaciones: '' },
  { id: '4', nombre: 'Amígdalas', descripcion: 'Amígdalas y pilares amigdalinos anteriores y posteriores.', presentaAnormalidad: false, observaciones: '' },
  { id: '5', nombre: 'Paladar Duro', descripcion: 'Paladar duro, rugas palatinas y rafe medio.', presentaAnormalidad: false, observaciones: '' },
  { id: '6', nombre: 'Frenillos', descripcion: 'Labial superior, labial inferior y lingual.', presentaAnormalidad: false, observaciones: '' },
  { id: '7', nombre: 'Mucosa Masticatoria', descripcion: 'Zonas adheridas, rebordes alveolares y encía insertada.', presentaAnormalidad: false, observaciones: '' },
  { id: '8', nombre: 'Encía', descripcion: 'Marginal, adherida e interdental.', presentaAnormalidad: false, observaciones: '' },
];

export const StomatognathicExamForm: React.FC<StomatognathicExamFormProps> = ({
  initialStructures = DEFAULT_STRUCTURES,
  initialGeneralNotes = '',
  readOnly = false,
  onChange,
}) => {
  const [structures, setStructures] = useState<AnatomicalStructureExam[]>(initialStructures);
  const [generalNotes, setGeneralNotes] = useState(initialGeneralNotes);

  const handleMarkAllNormal = () => {
    if (readOnly) return;
    const next = structures.map((s) => ({
      ...s,
      presentaAnormalidad: false,
      observaciones: 'N/A - Estructura anatómica conservada dentro de límites clínicos normales.',
    }));
    setStructures(next);
    onChange?.(next, generalNotes);
  };

  const updateStructure = (id: string, presentaAnormalidad: boolean, observaciones: string) => {
    if (readOnly) return;
    const next = structures.map((s) => (s.id === id ? { ...s, presentaAnormalidad, observaciones } : s));
    setStructures(next);
    onChange?.(next, generalNotes);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#E2E6EA] bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E6EA]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#D4AF37]">MÓDULO CLÍNICO</span>
              <span className="text-xs text-[#8F99A3]">• Tejidos Blandos y Anexos</span>
            </div>
            <h3 className="text-base font-extrabold text-[#1E242B]">
              3. Examen Físico Estomatognático / Tejidos Blandos y Anexos
            </h3>
            <p className="text-xs text-[#687380]">
              Evaluación y exploración sistemática de cavidad oral, estructuras anatómicas y tejidos periodontales.
            </p>
          </div>

          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={handleMarkAllNormal}
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
                <th className="p-3 w-1/3">Estructura Anatómica</th>
                <th className="p-3 text-center w-28">¿Presenta Anormalidad?</th>
                <th className="p-3">Observaciones / Hallazgos Clínicos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EA]">
              {structures.map((st) => (
                <tr key={st.id} className="hover:bg-[#FBF6E6]/30 transition-colors">
                  <td className="p-3 align-top">
                    <p className="font-extrabold text-[#1E242B]">{st.nombre}</p>
                    <p className="text-[11px] text-[#8F99A3] mt-0.5">{st.descripcion}</p>
                  </td>
                  <td className="p-3 align-top text-center">
                    <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-[#F8F9FA] border border-[#E2E6EA]">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => updateStructure(st.id, true, st.observaciones)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                          st.presentaAnormalidad
                            ? 'bg-[#EF4444] text-white shadow-2xs'
                            : 'text-[#687380] hover:text-black'
                        }`}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => updateStructure(st.id, false, st.observaciones)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                          !st.presentaAnormalidad
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
                      value={st.observaciones}
                      onChange={(e) => updateStructure(st.id, st.presentaAnormalidad, e.target.value)}
                      placeholder="Indique detalles o N/A..."
                      className="w-full rounded-xl border border-[#CBD2D9] px-3 py-1.5 text-xs text-[#1E242B] bg-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Observaciones Adicionales / Notas Clínicas Generales */}
        <div className="pt-4 border-t border-[#E2E6EA] space-y-1.5">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-[#687380]">
            Observaciones Adicionales / Notas Clínicas Generales
          </label>
          <textarea
            rows={2}
            disabled={readOnly}
            value={generalNotes}
            onChange={(e) => {
              setGeneralNotes(e.target.value);
              onChange?.(structures, e.target.value);
            }}
            placeholder="Anotaciones complementarias, hallazgos oclusales o precisiones diagnósticas de la exploración física..."
            className="w-full rounded-xl border border-[#CBD2D9] p-3 text-xs text-[#1E242B] focus:border-[#D4AF37] focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
