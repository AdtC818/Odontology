import {
  ActorContext,
  AntecedentsMap,
  AuthorshipMetadata,
  ClinicalRecordEntity,
} from '../domain/clinical-record.entity';
import { IClinicalRecordRepository } from '../domain/clinical-record.repository.interface';
import { OdontogramDataDTO } from '../infrastructure/clinical-record.model';

export interface ClinicalHistoryConsultationItem {
  idCita: number;
  estadoCita: string;
  esInasistencia: boolean;
  fechaHoraRegistro: string | null;
  profesionalResponsable: string | null;
  motivoConsulta: string | null;
  antecedentes: AntecedentsMap | null;
  odontograma: OdontogramDataDTO | null;
  notasEvolucion: Array<{
    idEvolucion: number;
    tipoRegistro: string;
    procedimientoRealizado?: string;
    notaEvolucion?: string;
    diligenciadoPor: AuthorshipMetadata;
    editableHoy: boolean;
  }>;
}

export interface ClinicalHistoryResponse {
  idHistoria: number | null;
  idPaciente: number;
  mensaje?: string;
  historial: ClinicalHistoryConsultationItem[];
}

export class GetClinicalHistoryUseCase {
  public static readonly EMPTY_HISTORY_MESSAGE =
    'El paciente no tiene historias clínicas registradas';

  constructor(private readonly clinicalRepo: IClinicalRecordRepository) {}

  async execute(params: {
    idPaciente: number;
    actor: ActorContext;
    inasistenciasPaciente?: Array<{
      idCita: number;
      fechaHora: string;
      profesionalResponsable: string;
      observacion?: string;
    }>;
  }): Promise<ClinicalHistoryResponse> {
    // Regla de Negocio 5 y RF-HCL-008: Solo ROL-ODO y ROL-ESP pueden consultar el historial clínico
    ClinicalRecordEntity.assertCanViewClinicalHistory(params.actor);

    const rows = await this.clinicalRepo.getClinicalHistoryByPatient(
      params.idPaciente
    );

    const validEvolutionRows = rows.filter(
      (r) => r.idEvolucion !== null && r.evolucion !== null
    );
    const inasistencias = params.inasistenciasPaciente ?? [];

    if (validEvolutionRows.length === 0 && inasistencias.length === 0) {
      return {
        idHistoria: rows[0]?.idHistoria ?? null,
        idPaciente: params.idPaciente,
        mensaje: GetClinicalHistoryUseCase.EMPTY_HISTORY_MESSAGE,
        historial: [],
      };
    }

    const todayColombiaKey = ClinicalRecordEntity.toColombiaDateKey(new Date());
    const consultationsByCita = new Map<number, ClinicalHistoryConsultationItem>();

    for (const row of validEvolutionRows) {
      if (!row.idCita || !row.evolucion) continue;

      const fechaDate = row.fechaRegistro ? new Date(row.fechaRegistro) : new Date();
      const isSameDay =
        ClinicalRecordEntity.toColombiaDateKey(fechaDate) === todayColombiaKey;

      if (!consultationsByCita.has(row.idCita)) {
        consultationsByCita.set(row.idCita, {
          idCita: row.idCita,
          estadoCita: row.estadoCita ?? 'Atendida',
          esInasistencia: row.estadoCita === 'Inasistencia',
          fechaHoraRegistro: row.fechaRegistro
            ? new Date(row.fechaRegistro).toISOString()
            : row.evolucion.diligenciadoPor.fechaHoraISO,
          profesionalResponsable: row.profesionalResponsable,
          motivoConsulta: null,
          antecedentes: null,
          odontograma: null,
          notasEvolucion: [],
        });
      }

      const item = consultationsByCita.get(row.idCita)!;

      if (row.evolucion.motivoConsulta && !item.motivoConsulta) {
        item.motivoConsulta = row.evolucion.motivoConsulta;
      }

      if (row.evolucion.antecedentes && !item.antecedentes) {
        item.antecedentes = row.evolucion.antecedentes;
      }

      // Toma el odontograma más reciente de esa consulta (como las filas vienen en ORDER BY fecha DESC, el primero es el último guardado)
      if (
        row.evolucion.odontograma &&
        row.evolucion.odontograma.cuadrantes &&
        !item.odontograma
      ) {
        item.odontograma = row.evolucion.odontograma;
      }

      if (
        row.evolucion.procedimientoRealizado ||
        row.evolucion.notaEvolucion ||
        row.evolucion.tipoRegistro === 'NOTA_ACLARATORIA'
      ) {
        item.notasEvolucion.push({
          idEvolucion: row.idEvolucion!,
          tipoRegistro: row.evolucion.tipoRegistro,
          procedimientoRealizado: row.evolucion.procedimientoRealizado,
          notaEvolucion: row.evolucion.notaEvolucion,
          diligenciadoPor: row.evolucion.diligenciadoPor,
          editableHoy:
            isSameDay && row.evolucion.tipoRegistro !== 'NOTA_ACLARATORIA',
        });
      }
    }

    for (const inasistencia of inasistencias) {
      if (!consultationsByCita.has(inasistencia.idCita)) {
        consultationsByCita.set(inasistencia.idCita, {
          idCita: inasistencia.idCita,
          estadoCita: 'Inasistencia',
          esInasistencia: true,
          fechaHoraRegistro: inasistencia.fechaHora,
          profesionalResponsable: inasistencia.profesionalResponsable,
          motivoConsulta: inasistencia.observacion ?? 'Inasistencia a la cita',
          antecedentes: null,
          odontograma: null,
          notasEvolucion: [],
        });
      }
    }

    const sortedHistory = Array.from(consultationsByCita.values()).sort((a, b) => {
      const timeA = a.fechaHoraRegistro ? new Date(a.fechaHoraRegistro).getTime() : 0;
      const timeB = b.fechaHoraRegistro ? new Date(b.fechaHoraRegistro).getTime() : 0;
      return timeB - timeA;
    });

    return {
      idHistoria: rows[0]?.idHistoria ?? null,
      idPaciente: params.idPaciente,
      historial: sortedHistory,
    };
  }
}
