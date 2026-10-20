// src/modules/clinical-records/infrastructure/clinical-record.model.ts

export interface OdontogramFindingDTO {
  piezaFDI: number; // Ej: 11 a 48 (permanentes) o 51 a 85 (temporales)
  superficie: 'vestibular' | 'palatina' | 'lingual' | 'mesial' | 'distal' | 'oclusal_incisal';
  hallazgo: string;
  color: string;
}

export interface OdontogramSurfaceFlagsDTO {
  caries_activa: boolean;
  restauracion_resina: boolean;
  sellante_fosas: boolean;
  desgaste_faceta: boolean;
}

export interface UpperToothSurfacesDTO {
  vestibular: OdontogramSurfaceFlagsDTO;
  palatina: OdontogramSurfaceFlagsDTO;
  mesial: OdontogramSurfaceFlagsDTO;
  distal: OdontogramSurfaceFlagsDTO;
  oclusal_incisal: OdontogramSurfaceFlagsDTO;
}

export interface LowerToothSurfacesDTO {
  vestibular: OdontogramSurfaceFlagsDTO;
  lingual: OdontogramSurfaceFlagsDTO;
  mesial: OdontogramSurfaceFlagsDTO;
  distal: OdontogramSurfaceFlagsDTO;
  oclusal_incisal: OdontogramSurfaceFlagsDTO;
}

export type ToothSurfacesDTO = UpperToothSurfacesDTO | LowerToothSurfacesDTO;

export interface OdontogramTechnicalSymbolsDTO {
  diente_extraido: boolean;
  extraccion_requerida: boolean;
  corona: boolean;
  implante: boolean;
  protesis_fija: boolean;
  endodoncia: boolean;
  puente: boolean;
}

export interface OdontogramBridgeRelationDTO {
  piezas_conectadas: number[];
  rol_estimado: 'pilar_distal' | 'pontico_intermedio' | 'pilar_mesial' | string;
}

export interface OdontogramClinicalNoteDTO {
  zona_afectada: string;
  descripcion: string;
}

export interface OdontogramToothDTO {
  codigo_fdi: number;
  nombre_anatomico: string;
  caras: ToothSurfacesDTO;
  simbolos_tecnicos: OdontogramTechnicalSymbolsDTO;
  relacion_puente?: OdontogramBridgeRelationDTO;
  nota_clinica: OdontogramClinicalNoteDTO | null;
}

export interface OdontogramQuadrantDTO {
  id_cuadrante: number;
  descripcion: string;
  piezas: Record<string, OdontogramToothDTO>;
}

export type QuadrantKey =
  | 'cuadrante_1'
  | 'cuadrante_2'
  | 'cuadrante_3'
  | 'cuadrante_4'
  | 'cuadrante_5'
  | 'cuadrante_6'
  | 'cuadrante_7'
  | 'cuadrante_8';

export interface OdontogramDataDTO {
  cuadrantes: Partial<Record<QuadrantKey, OdontogramQuadrantDTO>> & {
    cuadrante_1: OdontogramQuadrantDTO;
    cuadrante_2: OdontogramQuadrantDTO;
    cuadrante_4: OdontogramQuadrantDTO;
    cuadrante_3: OdontogramQuadrantDTO;
  };
}

export interface ClinicalEvolutionPayload {
  tipoRegistro:
    | 'APERTURA_CONSULTA'
    | 'EVOLUCION_ODONTOGRAMA'
    | 'NOTA_ACLARATORIA'
    | 'DOCUMENTO_CLINICO';
  motivoConsulta?: string;
  antecedentes?: Record<string, { aplica: boolean; observacion?: string }>;
  procedimientoRealizado?: string;
  notaEvolucion?: string;
  odontograma?: OdontogramDataDTO;
  diligenciadoPor: {
    idUsuario: number;
    nombreUsuario: string;
    idProfesionalResponsable: number;
    fechaHoraISO: string;
  };
}

export interface CreateEvolutionEntryDTO {
  idPaciente: number;
  idCita: number;
  payload: ClinicalEvolutionPayload;
}
