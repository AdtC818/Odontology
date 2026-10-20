import { db } from '../../../shared/infrastructure/database/database';
import {
  ClinicalHistoryRow,
  EvolutionRecordRow,
  IClinicalRecordRepository,
} from '../domain/clinical-record.repository.interface';
import {
  ClinicalEvolutionPayload,
  CreateEvolutionEntryDTO,
} from './clinical-record.model';

export class ClinicalRecordRepository implements IClinicalRecordRepository {
  // RF-HCL-005, RF-HCL-007, RF-HCL-009: Registrar entrada clínica en evolucion (JSONB)
  async createEvolutionEntry(dto: CreateEvolutionEntryDTO): Promise<EvolutionRecordRow> {
    const hcRes = await db.query<{ id_historia: number }>(
      `SELECT id_historia FROM public.historia_clinica WHERE id_paciente = $1;`,
      [dto.idPaciente]
    );

    let idHistoria: number;
    if (hcRes.rows.length === 0) {
      // Auto-crear expediente clínico base si aún no existe (RF-HCL-001)
      const newHc = await db.query<{ id_historia: number }>(
        `INSERT INTO public.historia_clinica (id_paciente) VALUES ($1) RETURNING id_historia;`,
        [dto.idPaciente]
      );
      idHistoria = newHc.rows[0].id_historia;
    } else {
      idHistoria = hcRes.rows[0].id_historia;
    }

    const sql = `
      INSERT INTO public.evolucion (id_historia, id_cita, evolucion)
      VALUES ($1, $2, $3::jsonb)
      RETURNING id_evolucion AS "idEvolucion", id_historia AS "idHistoria", fecha, id_cita AS "idCita", evolucion;
    `;
    const { rows } = await db.query<EvolutionRecordRow>(sql, [
      idHistoria,
      dto.idCita,
      JSON.stringify(dto.payload),
    ]);
    return rows[0];
  }

  // RF-HCL-006 & RQNF-FUN-001: Editar registro clínico solo hasta las 23:59 del mismo día en Colombia
  async updateEvolutionEntrySameDay(
    idEvolucion: number,
    nuevoPayload: ClinicalEvolutionPayload
  ): Promise<EvolutionRecordRow> {
    const checkSql = `
      SELECT 
        id_evolucion,
        fecha,
        ((fecha AT TIME ZONE 'America/Bogota')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date) AS "esMismoDia"
      FROM public.evolucion
      WHERE id_evolucion = $1;
    `;
    const { rows } = await db.query<{ id_evolucion: number; esMismoDia: boolean }>(
      checkSql,
      [idEvolucion]
    );
    if (rows.length === 0) {
      throw new Error('Registro de evolución no encontrado.');
    }

    if (!rows[0].esMismoDia) {
      throw new Error('La historia clínica solo se puede editar el día en que fue creada');
    }

    const updateSql = `
      UPDATE public.evolucion
      SET evolucion = $1::jsonb
      WHERE id_evolucion = $2
      RETURNING id_evolucion AS "idEvolucion", id_historia AS "idHistoria", fecha, id_cita AS "idCita", evolucion;
    `;
    const updated = await db.query<EvolutionRecordRow>(updateSql, [
      JSON.stringify(nuevoPayload),
      idEvolucion,
    ]);
    return updated.rows[0];
  }

  // RF-HCL-008: Consultar historial clínico completo de un paciente (más reciente a más antigua)
  async getClinicalHistoryByPatient(idPaciente: number): Promise<ClinicalHistoryRow[]> {
    const sql = `
      SELECT 
        hc.id_historia AS "idHistoria",
        hc.id_paciente AS "idPaciente",
        hc.fecha_creacion AS "fechaAperturaExpediente",
        e.id_evolucion AS "idEvolucion",
        e.fecha AS "fechaRegistro",
        e.id_cita AS "idCita",
        c.estado AS "estadoCita",
        u.nombre_completo AS "profesionalResponsable",
        e.evolucion
      FROM public.historia_clinica hc
      LEFT JOIN public.evolucion e ON hc.id_historia = e.id_historia
      LEFT JOIN public.cita c ON e.id_cita = c.id_cita
      LEFT JOIN public.usuario u ON c.id_usuario = u.id_usuario
      WHERE hc.id_paciente = $1
      ORDER BY e.fecha DESC NULLS LAST;
    `;
    const { rows } = await db.query<ClinicalHistoryRow>(sql, [idPaciente]);
    return rows;
  }

  // Buscar última evolución registrada para una cita específica
  async findEvolutionByCitaId(idCita: number): Promise<EvolutionRecordRow | null> {
    const sql = `
      SELECT 
        id_evolucion AS "idEvolucion", 
        id_historia AS "idHistoria", 
        fecha, 
        id_cita AS "idCita", 
        evolucion
      FROM public.evolucion
      WHERE id_cita = $1
      ORDER BY fecha DESC
      LIMIT 1;
    `;
    const { rows } = await db.query<EvolutionRecordRow>(sql, [idCita]);
    return rows[0] ?? null;
  }
}
