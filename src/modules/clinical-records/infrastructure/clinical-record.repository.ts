import { db } from '../../../shared/infrastructure/database/database';
import { CreateEvolutionEntryDTO } from './clinical-record.model';

export class ClinicalRecordRepository {
  // RF-HCL-005, RF-HCL-007, RF-HCL-009: Registrar entrada clínica en evolucion (JSONB)
  async createEvolutionEntry(dto: CreateEvolutionEntryDTO) {
    const hcRes = await db.query<{ id_historia: number }>(
      `SELECT id_historia FROM public.historia_clinica WHERE id_paciente = $1;`,
      [dto.idPaciente]
    );
    if (hcRes.rows.length === 0) {
      throw new Error('El paciente no posee una historia_clinica base asociada.');
    }
    const idHistoria = hcRes.rows[0].id_historia;

    const sql = `
      INSERT INTO public.evolucion (id_historia, id_cita, evolucion)
      VALUES ($1, $2, $3::jsonb)
      RETURNING id_evolucion AS "idEvolucion", id_historia AS "idHistoria", fecha, id_cita AS "idCita", evolucion;
    `;
    const { rows } = await db.query(sql, [idHistoria, dto.idCita, JSON.stringify(dto.payload)]);
    return rows[0];
  }

  // RF-HCL-006 & RQNF-FUN-001: Editar registro clínico solo hasta las 23:59 del mismo día en Colombia
  async updateEvolutionEntrySameDay(idEvolucion: number, nuevoPayload: any) {
    const checkSql = `
      SELECT 
        id_evolucion,
        fecha,
        (fecha::date = CURRENT_DATE) AS "esMismoDia"
      FROM public.evolucion
      WHERE id_evolucion = $1;
    `;
    const { rows } = await db.query<{ id_evolucion: number; esMismoDia: boolean }>(checkSql, [idEvolucion]);
    if (rows.length === 0) throw new Error('Registro de evolución no encontrado.');

    if (!rows[0].esMismoDia) {
      throw new Error('La historia clínica solo se puede editar el día en que fue creada (RQNF-FUN-001).');
    }

    const updateSql = `
      UPDATE public.evolucion
      SET evolucion = $1::jsonb
      WHERE id_evolucion = $2
      RETURNING id_evolucion AS "idEvolucion", id_historia AS "idHistoria", fecha, id_cita AS "idCita", evolucion;
    `;
    const updated = await db.query(updateSql, [JSON.stringify(nuevoPayload), idEvolucion]);
    return updated.rows[0];
  }

  // RF-HCL-008: Consultar historial clínico completo de un paciente (más reciente a más antigua)
  async getClinicalHistoryByPatient(idPaciente: number) {
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
    const { rows } = await db.query(sql, [idPaciente]);
    return rows;
  }
}