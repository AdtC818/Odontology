import {
  ClinicalEvolutionPayload,
  CreateEvolutionEntryDTO,
} from '../infrastructure/clinical-record.model';

export interface EvolutionRecordRow {
  idEvolucion: number;
  idHistoria: number;
  fecha: Date | string;
  idCita: number;
  evolucion: ClinicalEvolutionPayload;
}

export interface ClinicalHistoryRow {
  idHistoria: number;
  idPaciente: number;
  fechaAperturaExpediente: Date | string;
  idEvolucion: number | null;
  fechaRegistro: Date | string | null;
  idCita: number | null;
  estadoCita: string | null;
  profesionalResponsable: string | null;
  evolucion: ClinicalEvolutionPayload | null;
}

export interface IClinicalRecordRepository {
  createEvolutionEntry(dto: CreateEvolutionEntryDTO): Promise<EvolutionRecordRow>;
  updateEvolutionEntrySameDay(
    idEvolucion: number,
    nuevoPayload: ClinicalEvolutionPayload
  ): Promise<EvolutionRecordRow>;
  getClinicalHistoryByPatient(idPaciente: number): Promise<ClinicalHistoryRow[]>;
  findEvolutionByCitaId(idCita: number): Promise<EvolutionRecordRow | null>;
}
