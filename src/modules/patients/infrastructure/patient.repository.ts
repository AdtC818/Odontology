import { db } from '../../../shared/infrastructure/database/database';
import { CreatePatientDTO, PatientRow } from './patient.model';

export class PatientRepository {
  // RF-HCL-001: Crear paciente y asociar historia_clinica vacía automáticamente
  async createPatient(dto: CreatePatientDTO) {
    return db.withTransaction(async (client) => {
      const insertPatientSql = `
        INSERT INTO public.paciente 
          (nombre_completo, documento_identidad, correo, telefono, fecha_nacimiento, sexo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const patientRes = await client.query<PatientRow>(insertPatientSql, [
        dto.nombreCompleto,
        dto.documentoIdentidad,
        dto.correo || null,
        dto.telefono || null,
        dto.fechaNacimiento,
        dto.sexo || null,
      ]);
      const patient = patientRes.rows[0];

      const hcRes = await client.query(
        `INSERT INTO public.historia_clinica (id_paciente) VALUES ($1) RETURNING id_historia, fecha_creacion;`,
        [patient.id_paciente]
      );

      return {
        ...patient,
        datosIncompletos: !patient.sexo, // Marca definida en Sección 1.3 de la ERS
        historiaClinicaBase: hcRes.rows[0],
      };
    });
  }

  // RF-HCL-002: Editar paciente
  async updatePatient(idPaciente: number, dto: Partial<CreatePatientDTO>) {
    const sql = `
      UPDATE public.paciente
      SET 
        nombre_completo = COALESCE($1, nombre_completo),
        documento_identidad = COALESCE($2, documento_identidad),
        correo = COALESCE($3, correo),
        telefono = COALESCE($4, telefono),
        fecha_nacimiento = COALESCE($5, fecha_nacimiento),
        sexo = COALESCE($6, sexo)
      WHERE id_paciente = $7
      RETURNING *;
    `;
    const { rows } = await db.query<PatientRow>(sql, [
      dto.nombreCompleto ?? null,
      dto.documentoIdentidad ?? null,
      dto.correo ?? null,
      dto.telefono ?? null,
      dto.fechaNacimiento ?? null,
      dto.sexo ?? null,
      idPaciente,
    ]);
    if (rows.length === 0) return null;
    return {
      ...rows[0],
      datosIncompletos: !rows[0].sexo,
    };
  }

  // RF-HCL-003: Buscar pacientes por documento exacto o nombre parcial
  async searchPatients(query?: string) {
    const params: any[] = [];
    let where = '';
    if (query) {
      params.push(query, `%${query}%`);
      where = `WHERE documento_identidad = $1 OR nombre_completo ILIKE $2`;
    }
    const sql = `
      SELECT 
        id_paciente AS "idPaciente",
        nombre_completo AS "nombreCompleto",
        documento_identidad AS "documentoIdentidad",
        correo,
        telefono,
        fecha_nacimiento AS "fechaNacimiento",
        sexo,
        (sexo IS NULL) AS "datosIncompletos"
      FROM public.paciente
      ${where}
      ORDER BY nombre_completo ASC;
    `;
    const { rows } = await db.query(sql, params);
    return rows;
  }

  // RF-HCL-004 & RF-HCL-010: Visualizar ficha de paciente con su historial de citas (sin datos clínicos)
  async getPatientProfileByIdOrDoc(identifier: { idPaciente?: number; documento?: string }) {
    const param = identifier.idPaciente ?? identifier.documento;
    const condition = identifier.idPaciente ? 'p.id_paciente = $1' : 'p.documento_identidad = $1';

    const sql = `
      SELECT 
        p.id_paciente AS "idPaciente",
        p.nombre_completo AS "nombreCompleto",
        p.documento_identidad AS "documentoIdentidad",
        p.correo,
        p.telefono,
        p.fecha_nacimiento AS "fechaNacimiento",
        p.sexo,
        (p.sexo IS NULL) AS "datosIncompletos",
        hc.id_historia AS "idHistoria",
        COALESCE(
          json_agg(
            json_build_object(
              'idCita', c.id_cita,
              'titulo', c.titulo,
              'estado', c.estado,
              'profesional', u.nombre_completo
            )
          ) FILTER (WHERE c.id_cita IS NOT NULL), '[]'
        ) AS "historialCitas"
      FROM public.paciente p
      LEFT JOIN public.historia_clinica hc ON p.id_paciente = hc.id_paciente
      LEFT JOIN public.cita c ON p.id_paciente = c.id_paciente
      LEFT JOIN public.usuario u ON c.id_usuario = u.id_usuario
      WHERE ${condition}
      GROUP BY p.id_paciente, hc.id_historia;
    `;
    const { rows } = await db.query(sql, [param]);
    return rows[0] || null;
  }
}