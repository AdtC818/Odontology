import { db } from '../../../shared/infrastructure/database/database';
import { CreateConsentTemplateDTO, SignConsentDTO } from './consent.model';

export class ConsentRepository {
  // RF-CON-004: Crear plantilla de consentimiento
  async createTemplate(dto: CreateConsentTemplateDTO) {
    const sql = `
      INSERT INTO public.plantilla_consentimiento (nombre, plantilla_url, version, tipo_consentimiento, estado)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *;
    `;
    const { rows } = await db.query(sql, [
      dto.nombre,
      dto.plantillaUrl,
      dto.version ?? 1,
      dto.tipoConsentimiento,
    ]);
    return rows[0];
  }

  // RF-CON-007: Actualizar plantilla incrementando automáticamente la versión (+1)
  async updateTemplateVersion(idConsentimiento: number, dto: { nombre?: string; plantillaUrl?: string }) {
    const sql = `
      UPDATE public.plantilla_consentimiento
      SET 
        nombre = COALESCE($1, nombre),
        plantilla_url = COALESCE($2, plantilla_url),
        version = version + 1
      WHERE id_consentimiento = $3
      RETURNING *;
    `;
    const { rows } = await db.query(sql, [dto.nombre ?? null, dto.plantillaUrl ?? null, idConsentimiento]);
    return rows[0] || null;
  }

  // RF-CON-008: Cambiar estado Activa / Inactiva (sin eliminarla)
  async toggleTemplateStatus(idConsentimiento: number, estado: boolean) {
    const { rows } = await db.query(
      `UPDATE public.plantilla_consentimiento SET estado = $1 WHERE id_consentimiento = $2 RETURNING *;`,
      [estado, idConsentimiento]
    );
    return rows[0] || null;
  }

  async findAllTemplates(onlyActive = false) {
    const where = onlyActive ? 'WHERE estado = TRUE' : '';
    const { rows } = await db.query(
      `SELECT * FROM public.plantilla_consentimiento ${where} ORDER BY id_consentimiento ASC;`
    );
    return rows;
  }

  // RF-CON-002: Registrar consentimiento firmado en PDF inmutable
  async recordSignedConsent(dto: SignConsentDTO) {
    const sql = `
      INSERT INTO public.consentimiento_firmado (id_consentimiento, id_paciente, id_cita, archivo_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await db.query(sql, [
      dto.idConsentimiento,
      dto.idPaciente,
      dto.idCita,
      dto.archivoUrl,
    ]);
    return rows[0];
  }

  // RF-CON-003: Consultar consentimientos firmados de un paciente (más reciente a más antiguo)
  async getSignedConsentsByPatient(idPaciente: number) {
    const sql = `
      SELECT 
        cf.id_consentimiento AS "idConsentimiento",
        pc.nombre AS "nombrePlantilla",
        pc.version AS "versionActualPlantilla",
        cf.id_paciente AS "idPaciente",
        cf.id_cita AS "idCita",
        cf.fecha,
        cf.archivo_url AS "archivoUrl"
      FROM public.consentimiento_firmado cf
      INNER JOIN public.plantilla_consentimiento pc ON cf.id_consentimiento = pc.id_consentimiento
      WHERE cf.id_paciente = $1
      ORDER BY cf.fecha DESC;
    `;
    const { rows } = await db.query(sql, [idPaciente]);
    return rows;
  }
}