import { db } from '../../../shared/infrastructure/database/database';
import { CreateClinicalDocumentDTO } from './clinical-document.model';

export class ClinicalDocumentRepository {
  // RF-DOC-001 a 004: Generar documento validando que el paciente no tenga "Datos incompletos"
  async createClinicalDocument(dto: CreateClinicalDocumentDTO) {
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
      throw new Error('No se puede generar el documento clínico: el paciente tiene "Datos incompletos".');
    }

    const jsonPayload = {
      tipoRegistro: 'DOCUMENTO_CLINICO',
      tipoDocumento: dto.tipoDocumento,
      archivoPdfUrl: dto.archivoPdfUrl,
      modoFirma: dto.modoFirma,
      detalles: dto.detalles,
      diligenciadoPor: {
        ...dto.diligenciadoPor,
        fechaHoraISO: new Date().toISOString(),
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
  async getDocumentsByPatient(idPaciente: number) {
    const sql = `
      SELECT 
        e.id_evolucion AS "idDocumento",
        e.fecha,
        e.id_cita AS "idCita",
        e.evolucion->>'tipoDocumento' AS "tipoDocumento",
        e.evolucion->>'archivoPdfUrl' AS "archivoPdfUrl",
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
}