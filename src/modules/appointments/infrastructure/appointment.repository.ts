import { db } from '../../../shared/infrastructure/database/database';
import { CreateCitaDTO, CreateSolicitudCitaDTO, EstadoCita, TimeSlotRow } from './appointment.model';

export class AppointmentRepository {
  // RF-AGE-001: Crear / Habilitar bloque de horario
  async upsertTimeSlot(inicio: string, final: string, estado = true): Promise<TimeSlotRow> {
    const sql = `
      INSERT INTO public.bloques_horario (inicio, final, estado, ocupacion)
      VALUES ($1, $2, $3, FALSE)
      ON CONFLICT (inicio) DO UPDATE SET estado = EXCLUDED.estado
      WHERE public.bloques_horario.ocupacion = FALSE
      RETURNING inicio, final, estado, ocupacion;
    `;
    const { rows } = await db.query<TimeSlotRow>(sql, [inicio, final, estado]);
    if (rows.length === 0) {
      throw new Error('No se puede modificar un bloque que ya se encuentra ocupado por una cita.');
    }
    return rows[0];
  }

  async getTimeSlots(desde?: string, hasta?: string): Promise<TimeSlotRow[]> {
    const params: any[] = [];
    const conditions: string[] = [];
    if (desde) {
      params.push(desde);
      conditions.push(`inicio >= $${params.length}`);
    }
    if (hasta) {
      params.push(hasta);
      conditions.push(`final <= $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query<TimeSlotRow>(
      `SELECT inicio, final, estado, ocupacion FROM public.bloques_horario ${where} ORDER BY inicio ASC;`,
      params
    );
    return rows;
  }

  // RF-AGE-003: Solicitar cita desde sección pública y reservar bloque (Regla de Negocio 1)
  async createPublicRequest(dto: CreateSolicitudCitaDTO) {
    return db.withTransaction(async (client) => {
      // 1. Asegurar que el bloque horario existe en la base de datos
      const startDate = new Date(dto.bloqueSolicitado);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
      const startStr = dto.bloqueSolicitado;
      const endStr = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')} ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;

      await client.query(
        `INSERT INTO public.bloques_horario (inicio, final, estado, ocupacion)
         VALUES ($1, $2, TRUE, FALSE)
         ON CONFLICT (inicio) DO NOTHING;`,
        [startStr, endStr]
      );

      const slotRes = await client.query<TimeSlotRow>(
        `SELECT inicio, estado, ocupacion FROM public.bloques_horario WHERE inicio = $1 FOR UPDATE;`,
        [startStr]
      );
      if (slotRes.rows.length === 0 || !slotRes.rows[0].estado || slotRes.rows[0].ocupacion) {
        throw new Error('El horario seleccionado no se encuentra disponible o ya está ocupado.');
      }

      // 2. Regla de Negocio: Si el documento ya existe en la BD, no volver a crear el paciente, usar el existente
      const existingPatientRes = await client.query(
        `SELECT id_paciente, nombre_completo, correo, telefono FROM public.paciente WHERE documento_identidad = $1;`,
        [dto.documentoSolicitante.trim()]
      );

      let idPaciente: number;
      let esPacienteNuevo = false;

      if (existingPatientRes.rows.length > 0) {
        idPaciente = existingPatientRes.rows[0].id_paciente;
      } else {
        esPacienteNuevo = true;
        const insertPatientRes = await client.query(
          `INSERT INTO public.paciente 
             (nombre_completo, documento_identidad, correo, telefono, fecha_nacimiento, sexo)
           VALUES ($1, $2, $3, $4, $5, 'Otro')
           RETURNING id_paciente;`,
          [
            dto.nombreSolicitante.trim(),
            dto.documentoSolicitante.trim(),
            dto.correoSolicitante.trim(),
            dto.telefonoSolicitante?.trim() || null,
            dto.fechaNacimiento || '2000-01-01',
          ]
        );
        idPaciente = insertPatientRes.rows[0].id_paciente;

        // Crear historia clínica inicial vacía (RF-HCL-001)
        await client.query(
          `INSERT INTO public.historia_clinica (id_paciente) VALUES ($1) ON CONFLICT (id_paciente) DO NOTHING;`,
          [idPaciente]
        );
      }

      // 3. Registrar en public.solicitud_cita
      const insertSolSql = `
        INSERT INTO public.solicitud_cita 
          (nombre_solicitante, documento_solicitante, correo_solicitante, bloque_solicitado, descripcion, estado)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING *;
      `;
      const solRes = await client.query(insertSolSql, [
        dto.nombreSolicitante,
        dto.documentoSolicitante,
        dto.correoSolicitante,
        startStr,
        dto.descripcion || 'Solicitud de valoración odontológica',
      ]);
      const solicitud = solRes.rows[0];

      // 4. Crear la cita en public.cita en estado 'Solicitada'
      const idDoctor = dto.idProfesional || 1;
      const insertCitaSql = `
        INSERT INTO public.cita (titulo, descripcion, id_paciente, id_usuario, estado)
        VALUES ($1, $2, $3, $4, 'Solicitada')
        RETURNING *;
      `;
      const citaRes = await client.query(insertCitaSql, [
        dto.descripcion || 'Valoración Odontológica Web',
        `Solicitud externa de cita por ${dto.nombreSolicitante}`,
        idPaciente,
        idDoctor,
      ]);
      const nuevaCita = citaRes.rows[0];

      // 5. Vincular a bloques_citas y marcar bloque como ocupado
      await client.query(
        `INSERT INTO public.bloques_citas (id_bloque, id_cita) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [startStr, nuevaCita.id_cita]
      );
      await client.query(`UPDATE public.bloques_horario SET ocupacion = TRUE WHERE inicio = $1;`, [
        startStr,
      ]);

      // 6. Registrar en auditoría historial_cita
      await client.query(
        `INSERT INTO public.historial_cita (id_cita, id_usuario_gestor, reporte, motivo)
         VALUES ($1, 1, 'Cita creada en estado Solicitada desde portal web público', 'Solicitud externa');`,
        [nuevaCita.id_cita]
      );

      return {
        solicitud,
        cita: nuevaCita,
        idPaciente,
        esPacienteNuevo,
      };
    });
  }

  // RF-AGE-005: Gestionar solicitud (Aprobar o Rechazar y guardar en historial_solicitud)
  async reviewRequest(params: {
    idSolicitud: number;
    idUsuarioGestor: number;
    aprobar: boolean;
    motivo: string;
    idPaciente?: number;
    idProfesional?: number;
  }) {
    return db.withTransaction(async (client) => {
      const solRes = await client.query(`SELECT * FROM public.solicitud_cita WHERE id_solicitud = $1 FOR UPDATE;`, [
        params.idSolicitud,
      ]);
      if (solRes.rows.length === 0) throw new Error('Solicitud no encontrada.');
      const solicitud = solRes.rows[0];

      await client.query(`UPDATE public.solicitud_cita SET estado = FALSE WHERE id_solicitud = $1;`, [
        params.idSolicitud,
      ]);

      await client.query(
        `INSERT INTO public.historial_solicitud (id_solicitud, id_usuario_gestor, reporte, motivo)
         VALUES ($1, $2, $3, $4);`,
        [
          params.idSolicitud,
          params.idUsuarioGestor,
          params.aprobar ? 'Solicitud Confirmada' : 'Solicitud Rechazada',
          params.motivo,
        ]
      );

      if (!params.aprobar) {
        await client.query(`UPDATE public.bloques_horario SET ocupacion = FALSE WHERE inicio = $1;`, [
          solicitud.bloque_solicitado,
        ]);
        await client.query(
          `UPDATE public.cita SET estado = 'Rechazada' WHERE id_cita IN (SELECT id_cita FROM public.bloques_citas WHERE id_bloque = $1);`,
          [solicitud.bloque_solicitado]
        );
        return { estado: 'Rechazada', solicitudId: params.idSolicitud, correo: solicitud.correo_solicitante };
      }

      // Si fue aprobada, actualizar la cita correspondiente a 'Confirmada'
      const updateCitaRes = await client.query(
        `UPDATE public.cita 
         SET estado = 'Confirmada' 
         WHERE id_cita IN (SELECT id_cita FROM public.bloques_citas WHERE id_bloque = $1)
         RETURNING *;`,
        [solicitud.bloque_solicitado]
      );

      let cita = updateCitaRes.rows[0];

      if (!cita) {
        const idPac = params.idPaciente || 1;
        const idProf = params.idProfesional || 1;
        const insertCitaRes = await client.query(
          `INSERT INTO public.cita (titulo, descripcion, id_paciente, id_usuario, estado)
           VALUES ($1, $2, $3, $4, 'Confirmada') RETURNING *;`,
          ['Cita desde solicitud web', solicitud.descripcion, idPac, idProf]
        );
        cita = insertCitaRes.rows[0];
        await client.query(`INSERT INTO public.bloques_citas (id_bloque, id_cita) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [
          solicitud.bloque_solicitado,
          cita.id_cita,
        ]);
      }

      await client.query(
        `INSERT INTO public.historial_cita (id_cita, id_usuario_gestor, reporte, motivo)
         VALUES ($1, $2, 'Cita Confirmada por gestión de solicitud', $3);`,
        [cita.id_cita, params.idUsuarioGestor, params.motivo]
      );

      return {
        ...cita,
        correoPaciente: solicitud.correo_solicitante,
        nombrePaciente: solicitud.nombre_solicitante,
        fechaHora: solicitud.bloque_solicitado,
      };
    });
  }

  // RF-AGE-002: Agendar cita directamente (Confirmada) ocupando múltiples bloques
  async scheduleAppointment(dto: CreateCitaDTO) {
    return db.withTransaction(async (client) => {
      for (const bloque of dto.bloques) {
        const check = await client.query<TimeSlotRow>(
          `SELECT inicio, estado, ocupacion FROM public.bloques_horario WHERE inicio = $1 FOR UPDATE;`,
          [bloque]
        );
        if (check.rows.length === 0 || !check.rows[0].estado || check.rows[0].ocupacion) {
          throw new Error(`El bloque ${bloque} no está disponible.`);
        }
      }

      const citaRes = await client.query(
        `INSERT INTO public.cita (titulo, descripcion, id_paciente, id_usuario, estado)
         VALUES ($1, $2, $3, $4, 'Confirmada')
         RETURNING *;`,
        [dto.titulo, dto.descripcion || null, dto.idPaciente, dto.idUsuarioProfesional]
      );
      const cita = citaRes.rows[0];

      for (const bloque of dto.bloques) {
        await client.query(`INSERT INTO public.bloques_citas (id_bloque, id_cita) VALUES ($1, $2);`, [
          bloque,
          cita.id_cita,
        ]);
        await client.query(`UPDATE public.bloques_horario SET ocupacion = TRUE WHERE inicio = $1;`, [bloque]);
      }

      // Regla de Negocio 10: Guardar "Agendado por" en historial_cita
      await client.query(
        `INSERT INTO public.historial_cita (id_cita, id_usuario_gestor, reporte, motivo)
         VALUES ($1, $2, 'Cita creada en estado Confirmada (Agendado por)', 'Agendamiento interno');`,
        [cita.id_cita, dto.idUsuarioGestor]
      );

      return cita;
    });
  }

  // RF-AGE-007, RF-AGE-009, RF-AGE-013: Cambiar estado de cita y registrar auditoría en historial_cita
  async changeAppointmentState(params: {
    idCita: number;
    nuevoEstado: EstadoCita;
    idUsuarioGestor: number;
    motivo: string;
    liberarBloques?: boolean;
  }) {
    return db.withTransaction(async (client) => {
      const currentRes = await client.query(`SELECT * FROM public.cita WHERE id_cita = $1 FOR UPDATE;`, [
        params.idCita,
      ]);
      if (currentRes.rows.length === 0) throw new Error('La cita no existe.');
      const citaActual = currentRes.rows[0];

      // Regla RF-AGE-009: Un profesional solo puede tener una cita "En consulta" a la vez
      if (params.nuevoEstado === 'En consulta') {
        const activeRes = await client.query(
          `SELECT id_cita FROM public.cita WHERE id_usuario = $1 AND estado = 'En consulta';`,
          [citaActual.id_usuario]
        );
        if (activeRes.rows.length > 0) {
          throw new Error('El profesional ya tiene otra cita En consulta activa.');
        }
      }

      const updateRes = await client.query(
        `UPDATE public.cita SET estado = $1 WHERE id_cita = $2 RETURNING *;`,
        [params.nuevoEstado, params.idCita]
      );

      if (params.nuevoEstado === 'Cancelada' && params.liberarBloques !== false) {
        await client.query(
          `UPDATE public.bloques_horario 
           SET ocupacion = FALSE 
           WHERE inicio IN (SELECT id_bloque FROM public.bloques_citas WHERE id_cita = $1);`,
          [params.idCita]
        );
      }

      await client.query(
        `INSERT INTO public.historial_cita (id_cita, id_usuario_gestor, reporte, motivo)
         VALUES ($1, $2, $3, $4);`,
        [
          params.idCita,
          params.idUsuarioGestor,
          `Cambio de estado: ${citaActual.estado} -> ${params.nuevoEstado}`,
          params.motivo,
        ]
      );

      return updateRes.rows[0];
    });
  }

  // RF-AGE-008: Consultar agenda con paciente, bloques e historial
  async getAgenda(idProfesional?: number, idPaciente?: number) {
    const conditions: string[] = [];
    const params: any[] = [];
    if (idProfesional) {
      params.push(idProfesional);
      conditions.push(`c.id_usuario = $${params.length}`);
    }
    if (idPaciente) {
      params.push(idPaciente);
      conditions.push(`c.id_paciente = $${params.length}`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        c.id_cita AS "idCita",
        c.titulo,
        c.descripcion,
        c.estado,
        p.id_paciente AS "idPaciente",
        p.nombre_completo AS "nombrePaciente",
        p.telefono AS "telefonoPaciente",
        u.id_usuario AS "idProfesional",
        u.nombre_completo AS "nombreProfesional",
        COALESCE(json_agg(DISTINCT bc.id_bloque) FILTER (WHERE bc.id_bloque IS NOT NULL), '[]') AS bloques,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'idCambio', hc.id_cambio_cita,
              'idUsuarioGestor', hc.id_usuario_gestor,
              'fecha', hc.fecha_historial,
              'reporte', hc.reporte,
              'motivo', hc.motivo
            )
          ) FILTER (WHERE hc.id_cambio_cita IS NOT NULL), '[]'
        ) AS historial
      FROM public.cita c
      INNER JOIN public.paciente p ON c.id_paciente = p.id_paciente
      INNER JOIN public.usuario u ON c.id_usuario = u.id_usuario
      LEFT JOIN public.bloques_citas bc ON c.id_cita = bc.id_cita
      LEFT JOIN public.historial_cita hc ON c.id_cita = hc.id_cita
      ${where}
      GROUP BY c.id_cita, p.id_paciente, u.id_usuario
      ORDER BY c.id_cita DESC;
    `;
    const { rows } = await db.query(sql, params);
    return rows;
  }
}