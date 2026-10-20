import { db } from '../../../shared/infrastructure/database/database';
import {
  ClinicalDocumentRecord,
  ConsultationContextData,
  CreateClinicalDocumentDTO,
  IClinicalDocumentRepository,
} from '../domain/clinical-document.repository.interface';

export class ClinicalDocumentRepository implements IClinicalDocumentRepository {
  // RF-DOC-001 a 004: Generar documento validando que el paciente no tenga "Datos incompletos"
  async createClinicalDocument(
    dto: CreateClinicalDocumentDTO
  ): Promise<ClinicalDocumentRecord> {
    const patientRes = await db.query<{ sexo: string | null; id_historia: number }>(
      `SELECT p.sexo, hc.id_historia 
       FROM public.paciente p
       INNER JOIN public.historia_clinica hc ON p.id_paciente = hc.id_paciente
       WHERE p.id_paciente = $1;`,
      [dto.idPaciente]
    );

    if (patientRes.rows.length === 0) {
      throw new Error('El paciente o su historia clínica no existen.');
    }
    if (!patientRes.rows[0].sexo) {
      throw new Error(
        'No se puede generar el documento clínico: el paciente tiene "Datos incompletos".'
      );
    }

    const jsonPayload = {
      tipoRegistro: 'DOCUMENTO_CLINICO',
      tipoDocumento: dto.tipoDocumento,
      archivoPdfUrl: dto.archivoPdfUrl,
      modoFirma: dto.modoFirma,
      detalles: dto.detalles,
      diligenciadoPor: {
        ...dto.diligenciadoPor,
        fechaHoraISO: dto.diligenciadoPor.fechaHoraISO ?? new Date().toISOString(),
      },
    };

    const sql = `
      INSERT INTO public.evolucion (id_historia, id_cita, evolucion)
      VALUES ($1, $2, $3::jsonb)
      RETURNING id_evolucion AS "idDocumento", fecha, id_cita AS "idCita", evolucion;
    `;
    const { rows } = await db.query(sql, [
      patientRes.rows[0].id_historia,
      dto.idCita,
      JSON.stringify(jsonPayload),
    ]);
    return rows[0];
  }

  // RF-DOC-005: Consultar documentos clínicos del paciente del más reciente al más antiguo
  async getDocumentsByPatient(idPaciente: number): Promise<ClinicalDocumentRecord[]> {
    const sql = `
      SELECT 
        e.id_evolucion AS "idDocumento",
        e.fecha,
        e.id_cita AS "idCita",
        e.evolucion->>'tipoDocumento' AS "tipoDocumento",
        e.evolucion->>'archivoPdfUrl' AS "archivoPdfUrl",
        e.evolucion->>'modoFirma' AS "modoFirma",
        e.evolucion->'detalles' AS detalles,
        e.evolucion->'diligenciadoPor' AS "diligenciadoPor"
      FROM public.evolucion e
      INNER JOIN public.historia_clinica hc ON e.id_historia = hc.id_historia
      WHERE hc.id_paciente = $1
        AND e.evolucion->>'tipoRegistro' = 'DOCUMENTO_CLINICO'
      ORDER BY e.fecha DESC;
    `;
    const { rows } = await db.query(sql, [idPaciente]);
    return rows;
  }

  // Obtiene el contexto de paciente, historia clínica, cita y profesional responsable
  async getConsultationContext(
    idPaciente: number,
    idCita: number
  ): Promise<ConsultationContextData | null> {
    const sql = `
      SELECT 
        p.id_paciente,
        p.nombre_completo AS "pacienteNombre",
        p.documento_identidad AS "pacienteDocumento",
        p.fecha_nacimiento AS "fechaNacimiento",
        p.sexo,
        hc.id_historia AS "idHistoria",
        c.id_cita AS "idCita",
        c.id_usuario AS "idProfesionalResponsable",
        c.estado AS "estadoCita",
        u.nombre_completo AS "nombreProfesionalResponsable",
        (
          SELECT MIN(bc.id_bloque)
          FROM public.bloques_citas bc
          WHERE bc.id_cita = c.id_cita
        ) AS "fechaInicioCita"
      FROM public.paciente p
      INNER JOIN public.historia_clinica hc ON hc.id_paciente = p.id_paciente
      INNER JOIN public.cita c ON c.id_paciente = p.id_paciente AND c.id_cita = $2
      INNER JOIN public.usuario u ON u.id_usuario = c.id_usuario
      WHERE p.id_paciente = $1;
    `;

    const { rows } = await db.query(sql, [idPaciente, idCita]);
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      paciente: {
        idPaciente: row.id_paciente,
        nombreCompleto: row.pacienteNombre,
        documentoIdentidad: row.pacienteDocumento,
        fechaNacimiento: row.fechaNacimiento,
        sexo: row.sexo,
        idHistoria: row.idHistoria,
        acudiente: null,
      },
      cita: {
        idCita: row.idCita,
        idProfesionalResponsable: row.idProfesionalResponsable,
        nombreProfesionalResponsable: row.nombreProfesionalResponsable,
        firmaProfesionalUrl: null,
        estado: row.estadoCita,
        fechaInicioCita: row.fechaInicioCita,
      },
    };
  }

  // Regla de Negocio 5 (RF-DOC-005): Verifica si el paciente tiene una cita "En consulta" para permitir lectura a ROL-AUX
  async hasActiveConsultationForPatient(idPaciente: number): Promise<boolean> {
    const sql = `
      SELECT 1
      FROM public.cita c
      WHERE c.id_paciente = $1
        AND c.estado = 'En consulta'
      LIMIT 1;
    `;
    const { rows } = await db.query(sql, [idPaciente]);
    return rows.length > 0;
  }
}