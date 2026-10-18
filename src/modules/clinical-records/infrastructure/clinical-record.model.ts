export interface OdontogramFindingDTO {
  piezaFDI: number; // Ej: 11 a 48 (permanentes) o 51 a 85 (temporales)
  superficie: 'vestibular' | 'palatina_lingual' | 'mesial' | 'distal' | 'incisal_oclusal';
  hallazgo: string;
  color: string;
}

export interface ClinicalEvolutionPayload {
  tipoRegistro: 'APERTURA_CONSULTA' | 'EVOLUCION_ODONTOGRAMA' | 'NOTA_ACLARATORIA' | 'DOCUMENTO_CLINICO';
  motivoConsulta?: string;
  antecedentes?: Record<string, { aplica: boolean; observacion?: string }>;
  procedimientoRealizado?: string;
  notaEvolucion?: string;
  odontograma?: OdontogramFindingDTO[];
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